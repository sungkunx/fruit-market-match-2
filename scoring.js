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

    // Fruits sold in one cascade step, times the price, chain step, and multiplier.
    function matchStepRevenue(step, price, multiplier) {
        const sold = step.groups.reduce((sum, group) => sum + group.cells.length, 0);
        return Math.floor(sold * price * step.chain * multiplier);
    }

    // movedFruit: the fruit the player dragged, displacedFruit: the fruit it swapped with.
    // rules: { sameFruitBonus, otherFruitBonus, maxMultiplier }
    function scoreMove(result, state, movedFruit, displacedFruit, price, rules) {
        if (!result.valid) {
            return { total: 0, stepScores: [], isCombo: false, state };
        }

        const stepScores = result.steps.map(step => matchStepRevenue(step, price, state.multiplier));
        const total = stepScores.reduce((sum, value) => sum + value, 0);
        const firstStepFruits = result.steps[0].groups.map(group => group.fruit);
        const matchedFruit = firstStepFruits.includes(movedFruit) ? movedFruit : displacedFruit;
        const isCombo = matchedFruit === state.lastMatchedFruit;
        const bonus = isCombo ? rules.sameFruitBonus : rules.otherFruitBonus;

        return {
            total,
            stepScores,
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

    const Scoring = { createScoreState, matchStepRevenue, scoreMove, decayMultiplier };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Scoring;
    } else {
        root.Scoring = Scoring;
    }
})(typeof window !== 'undefined' ? window : globalThis);
