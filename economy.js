// Money rules for the growth mode: costs over time, earnings, expansion, and endings.
// Every function returns a new run state and never changes its input. No DOM access.
(function (root) {
    'use strict';

    const Scoring = typeof module !== 'undefined' && module.exports ? require('./scoring.js') : root.Scoring;

    function round3(value) {
        return Math.round(value * 1000) / 1000;
    }

    function stageInfo(state, tuning) {
        return tuning.stages[state.stage - 1];
    }

    function createRun(tuning, options = {}) {
        return {
            stage: 1,
            cash: tuning.startCash,
            revenue: 0,
            time: 0,
            stageTime: 0,
            logisticsTimer: 0,
            combo: Scoring.createScoreState(),
            maxMultiplier: 1.0,
            maxChain: 0,
            swaps: 0,
            ended: null,
            // A practice (tutorial) run never goes bankrupt and never shows danger.
            tutorial: Boolean(options.tutorial),
            // Room for phase 2 cards (e.g. rent: 0.8 for -20% rent). Phase 1 keeps them at 1.
            modifiers: { rent: 1, labor: 1, logistics: 1, revenue: 1 }
        };
    }

    function keepTutorialCash(state, cash) {
        return state.tutorial ? Math.max(0, cash) : cash;
    }

    function inflation(state, tuning) {
        return Math.pow(tuning.inflationRate, Math.floor(state.time / tuning.inflationInterval));
    }

    // What a shop pays on top of its stage rent, as the stage wears on. A new shop opens at a
    // discount that eases away, and once it is gone the rent keeps climbing: cheap to arrive,
    // expensive to sit still.
    function stagePace(state, tuning) {
        const relief = tuning.openingRelief;
        const eased = relief.seconds > 0
            ? Math.min(1, relief.start + (1 - relief.start) * (state.stageTime / relief.seconds))
            : 1;
        const camped = Math.max(0, state.stageTime - relief.climbAfter);
        const endless = state.stage === tuning.surchargeStage;
        const rate = endless ? tuning.surchargeRate : relief.climbRate;
        const climb = Math.pow(rate, Math.floor(camped / relief.climbInterval));
        // The endless stage has no ceiling: that climb is what finally ends a good run.
        return eased * (endless ? climb : Math.min(climb, relief.climbMax));
    }

    // Rent per second right now.
    function currentRent(state, tuning) {
        return stageInfo(state, tuning).rent * inflation(state, tuning) * stagePace(state, tuning) * state.modifiers.rent;
    }

    // Rent per second the shop would pay the moment it moved to `stage`, opening discount and all.
    function projectedRent(state, tuning, stage) {
        return tuning.stages[stage - 1].rent * inflation(state, tuning) * tuning.openingRelief.start * state.modifiers.rent;
    }

    function currentLogistics(state, tuning) {
        return stageInfo(state, tuning).logistics * state.modifiers.logistics;
    }

    function currentPrice(state, tuning) {
        return stageInfo(state, tuning).price * state.modifiers.revenue;
    }

    // Moves game time forward by dt seconds: rent, logistics, and multiplier cooldown.
    function tick(state, tuning, dt) {
        if (state.ended) return state;

        let cash = state.cash - currentRent(state, tuning) * dt;
        let logisticsTimer = round3(state.logisticsTimer + dt);
        if (logisticsTimer >= tuning.logisticsInterval) {
            cash -= currentLogistics(state, tuning);
            logisticsTimer = round3(logisticsTimer - tuning.logisticsInterval);
        }

        return {
            ...state,
            cash: keepTutorialCash(state, cash),
            time: round3(state.time + dt),
            stageTime: round3(state.stageTime + dt),
            logisticsTimer,
            combo: { ...state.combo, multiplier: Scoring.decayMultiplier(state.combo.multiplier, dt, tuning.multiplierDecay) }
        };
    }

    // Labor is paid for every swap, including ones that bounce back.
    function chargeSwap(state, tuning) {
        if (state.ended) return state;
        return { ...state, cash: keepTutorialCash(state, state.cash - tuning.laborPerSwap * state.modifiers.labor), swaps: state.swaps + 1 };
    }

    // Prices a resolved move at the current stage. Does not change the run: the caller adds
    // each step's amount with addEarnings as it plays, then calls finishMove.
    function scoreMove(state, tuning, result, movedFruit, displacedFruit) {
        return Scoring.scoreMove(result, state.combo, movedFruit, displacedFruit, currentPrice(state, tuning), tuning);
    }

    function addEarnings(state, amount) {
        return { ...state, cash: state.cash + amount, revenue: state.revenue + amount };
    }

    function finishMove(state, scored, chainLength) {
        return {
            ...state,
            combo: scored.state,
            maxMultiplier: Math.max(state.maxMultiplier, scored.state.multiplier),
            maxChain: Math.max(state.maxChain, chainLength)
        };
    }

    // What it costs to leave the current stage, or null at the last stage.
    function nextExpandCost(state, tuning) {
        return state.stage < tuning.stages.length ? stageInfo(state, tuning).expandCost : null;
    }

    // Cash needed before expanding: the cost plus a reserve of the next stage's rent, so the
    // bigger shop does not go bankrupt before its first sale. Only the cost is paid.
    // Null at the last stage.
    function expandRequirement(state, tuning) {
        const cost = nextExpandCost(state, tuning);
        if (cost === null) return null;
        return cost + projectedRent(state, tuning, state.stage + 1) * tuning.expandReserveSeconds;
    }

    function canExpand(state, tuning) {
        const requirement = expandRequirement(state, tuning);
        return !state.ended && requirement !== null && state.cash >= requirement;
    }

    // Pays for the next stage. The last stage is endless: the run goes on until bankruptcy.
    function expand(state, tuning) {
        if (!canExpand(state, tuning)) return state;
        return {
            ...state,
            cash: state.cash - nextExpandCost(state, tuning),
            stage: state.stage + 1,
            stageTime: 0
        };
    }

    function isBankrupt(state) {
        return !state.ended && !state.tutorial && state.cash <= 0;
    }

    function bankrupt(state) {
        return state.ended ? state : { ...state, ended: 'bankrupt' };
    }

    // Danger: only enough cash left for a few seconds of rent.
    function isInDanger(state, tuning) {
        return !state.ended && !state.tutorial && state.cash <= currentRent(state, tuning) * tuning.dangerSeconds;
    }

    // Revenue is the score.
    function finalScore(state) {
        return Math.floor(state.revenue);
    }

    const Economy = {
        createRun,
        inflation,
        stagePace,
        currentRent,
        projectedRent,
        currentLogistics,
        currentPrice,
        tick,
        chargeSwap,
        scoreMove,
        addEarnings,
        finishMove,
        nextExpandCost,
        expandRequirement,
        canExpand,
        expand,
        isBankrupt,
        bankrupt,
        isInDanger,
        finalScore
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Economy;
    } else {
        root.Economy = Economy;
    }
})(typeof window !== 'undefined' ? window : globalThis);
