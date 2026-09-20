// Revenue and multiplier rules for the growth mode. No DOM access.
(function (root) {
    'use strict';

    function createScoreState() {
        return { multiplier: 1.0, comboCount: 0, lastMatchedFruit: null };
    }

    // Three decimals keep the slow per-tick decay visible while hiding float noise.
    function roundMultiplier(value) {
        return Math.round(value * 1000) / 1000;
    }

    // What each popped group in one cascade step is worth. The parts always add up to the step
    // total: rounding leftovers go to the last group.
    function matchGroupRevenues(step, price, multiplier) {
        const shares = step.groups.map(group => Math.floor(group.cells.length * price * step.chain * multiplier));
        const spent = shares.reduce((sum, value) => sum + value, 0);
        if (shares.length > 0) {
            shares[shares.length - 1] += matchStepRevenue(step, price, multiplier) - spent;
        }
        return shares;
    }

    // Fruits sold in one cascade step, times the price, chain step, and multiplier.
    function matchStepRevenue(step, price, multiplier) {
        const sold = step.groups.reduce((sum, group) => sum + group.cells.length, 0);
        return Math.floor(sold * price * step.chain * multiplier);
    }

    // movedFruit: the fruit the player dragged, displacedFruit: the fruit it swapped with.
    // rules: { sameFruitBonus, otherFruitBonus, maxMultiplier }
    function scoreMove(result, state, movedFruit, displacedFruit, price, rules) {
        if (!result.valid) {
            return { total: 0, stepScores: [], groupScores: [], isCombo: false, state };
        }

        const stepScores = result.steps.map(step => matchStepRevenue(step, price, state.multiplier));
        const groupScores = result.steps.map(step => matchGroupRevenues(step, price, state.multiplier));
        const total = stepScores.reduce((sum, value) => sum + value, 0);
        const firstStepFruits = result.steps[0].groups.map(group => group.fruit);
        const matchedFruit = firstStepFruits.includes(movedFruit) ? movedFruit : displacedFruit;
        const isCombo = matchedFruit === state.lastMatchedFruit;
        const bonus = isCombo ? rules.sameFruitBonus : rules.otherFruitBonus;

        return {
            total,
            stepScores,
            groupScores,
            isCombo,
            state: {
                multiplier: roundMultiplier(Math.min(rules.maxMultiplier, state.multiplier + bonus)),
                comboCount: isCombo ? state.comboCount + 1 : 1,
                lastMatchedFruit: matchedFruit
            }
        };
    }

    // The multiplier cools down over game time but never drops below x1.0.
    function decayMultiplier(multiplier, seconds, rate) {
        return roundMultiplier(Math.max(1, multiplier - rate * seconds));
    }

    const Scoring = { createScoreState, matchStepRevenue, matchGroupRevenues, scoreMove, decayMultiplier };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Scoring;
    } else {
        root.Scoring = Scoring;
    }
})(typeof window !== 'undefined' ? window : globalThis);
