const test = require('node:test');
const assert = require('node:assert/strict');
const Scoring = require('../scoring.js');

const RULES = { sameFruitBonus: 0.3, otherFruitBonus: 0.1, maxMultiplier: 3 };

// Builds a group with `size` placeholder cells.
function group(fruit, size) {
    return { fruit, cells: Array.from({ length: size }, (_, col) => ({ row: 0, col })) };
}

function step(chain, groups) {
    return { kind: 'match', chain, groups };
}

function validResult(steps) {
    return { valid: true, steps };
}

function state(multiplier, comboCount, lastMatchedFruit) {
    return { multiplier, comboCount, lastMatchedFruit };
}

test('createScoreState starts at x1.0 with no combo', () => {
    assert.deepEqual(Scoring.createScoreState(), state(1.0, 0, null));
});

test('matchStepRevenue multiplies fruits sold by price, chain, and multiplier, then floors', () => {
    assert.equal(Scoring.matchStepRevenue(step(1, [group('a', 3)]), 2, 1.0), 6);
    assert.equal(Scoring.matchStepRevenue(step(2, [group('a', 4)]), 5, 1.5), 60);
    assert.equal(Scoring.matchStepRevenue(step(1, [group('a', 3), group('b', 3)]), 10, 1.25), 75);
    assert.equal(Scoring.matchStepRevenue(step(1, [group('a', 3)]), 1, 1.333), 3);
});

test('scoreMove adds up every step using the multiplier from before the move', () => {
    const result = validResult([step(1, [group('apple', 4)]), step(2, [group('kiwi', 3)])]);
    const scored = Scoring.scoreMove(result, state(1.5, 0, null), 'apple', 'kiwi', 10, RULES);
    assert.deepEqual(scored.stepScores, [60, 90]);
    assert.equal(scored.total, 150);
});

test('scoreMove gives the other-fruit bonus and restarts the combo count for a different fruit', () => {
    const result = validResult([step(1, [group('apple', 3)])]);
    const scored = Scoring.scoreMove(result, state(2.0, 3, 'kiwi'), 'apple', 'kiwi', 1, RULES);
    assert.equal(scored.isCombo, false);
    assert.deepEqual(scored.state, state(2.1, 1, 'apple'));
});

test('scoreMove gives the same-fruit bonus and grows the combo for the same fruit again', () => {
    const result = validResult([step(1, [group('apple', 3)])]);
    const scored = Scoring.scoreMove(result, state(1.1, 1, 'apple'), 'apple', 'kiwi', 1, RULES);
    assert.equal(scored.isCombo, true);
    assert.deepEqual(scored.state, state(1.4, 2, 'apple'));
});

test('scoreMove never raises the multiplier past the cap', () => {
    const result = validResult([step(1, [group('apple', 3)])]);
    assert.equal(Scoring.scoreMove(result, state(2.9, 1, 'apple'), 'apple', 'kiwi', 1, RULES).state.multiplier, 3);
    assert.equal(Scoring.scoreMove(result, state(3, 1, 'apple'), 'apple', 'kiwi', 1, RULES).state.multiplier, 3);
});

test('scoreMove uses the displaced fruit when only it matched', () => {
    const result = validResult([step(1, [group('kiwi', 3)])]);
    const scored = Scoring.scoreMove(result, state(1.0, 0, null), 'apple', 'kiwi', 1, RULES);
    assert.equal(scored.state.lastMatchedFruit, 'kiwi');
});

test('scoreMove prefers the moved fruit when both swapped fruits matched', () => {
    const result = validResult([step(1, [group('kiwi', 3), group('apple', 3)])]);
    const scored = Scoring.scoreMove(result, state(1.0, 0, null), 'apple', 'kiwi', 1, RULES);
    assert.equal(scored.state.lastMatchedFruit, 'apple');
});

test('scoreMove earns nothing and keeps the state for an invalid swap', () => {
    const before = state(2.3, 4, 'grape');
    const scored = Scoring.scoreMove({ valid: false }, before, 'apple', 'kiwi', 10, RULES);
    assert.equal(scored.total, 0);
    assert.deepEqual(scored.stepScores, []);
    assert.equal(scored.isCombo, false);
    assert.deepEqual(scored.state, before);
});

test('scoreMove keeps the multiplier free of float noise', () => {
    let current = Scoring.createScoreState();
    ['apple', 'kiwi', 'grape'].forEach(fruit => {
        current = Scoring.scoreMove(validResult([step(1, [group(fruit, 3)])]), current, fruit, 'x', 1, RULES).state;
    });
    assert.equal(current.multiplier, 1.3);
});

test('decayMultiplier cools down over time but stops at x1.0', () => {
    assert.equal(Scoring.decayMultiplier(1.5, 10, 0.02), 1.3);
    assert.equal(Scoring.decayMultiplier(1.1, 10, 0.02), 1);
    assert.equal(Scoring.decayMultiplier(1.4, 0.1, 0.02), 1.398);
});

test('matchGroupRevenues splits a step over its groups and always adds up to the step total', () => {
    const twoGroups = step(2, [group('a', 3), group('b', 4)]);
    assert.deepEqual(Scoring.matchGroupRevenues(twoGroups, 10, 1.5), [90, 120]);
    assert.equal(Scoring.matchGroupRevenues(twoGroups, 10, 1.5).reduce((sum, value) => sum + value, 0), Scoring.matchStepRevenue(twoGroups, 10, 1.5));

    // Rounding leftovers go to the last group so the parts never add up to less than the total.
    const rounded = step(1, [group('a', 3), group('b', 3)]);
    assert.equal(Scoring.matchStepRevenue(rounded, 1, 1.333), 7);
    assert.deepEqual(Scoring.matchGroupRevenues(rounded, 1, 1.333), [3, 4]);
});

test('scoreMove reports the money each group made', () => {
    const result = validResult([step(1, [group('apple', 4), group('kiwi', 3)]), step(2, [group('kiwi', 3)])]);
    const scored = Scoring.scoreMove(result, state(1.5, 0, null), 'apple', 'kiwi', 10, RULES);
    assert.deepEqual(scored.groupScores, [[60, 45], [90]]);
    scored.groupScores.forEach((groups, index) => {
        assert.equal(groups.reduce((sum, value) => sum + value, 0), scored.stepScores[index]);
    });
});

test('an invalid swap reports no group money', () => {
    assert.deepEqual(Scoring.scoreMove({ valid: false }, state(2, 1, 'apple'), 'apple', 'kiwi', 10, RULES).groupScores, []);
});
