const test = require('node:test');
const assert = require('node:assert/strict');
const Economy = require('../economy.js');

// Small round numbers so every expectation can be checked by hand.
// Tests use this instead of tuning.js so retuning the game never breaks them.
const T = {
    startCash: 500,
    fruitOrder: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    frameSize: 7,
    stages: [
        { name: 's1', cols: 5, rows: 5, fruits: 3, price: 2, rent: 10, logistics: 0, expandCost: 1000 },
        { name: 's2', cols: 6, rows: 5, fruits: 4, price: 5, rent: 20, logistics: 6, expandCost: 2000 },
        { name: 's3', cols: 6, rows: 6, fruits: 4, price: 6, rent: 30, logistics: 7, expandCost: 3000 },
        { name: 's4', cols: 6, rows: 6, fruits: 5, price: 7, rent: 40, logistics: 8, expandCost: 4000 },
        { name: 's5', cols: 6, rows: 7, fruits: 6, price: 8, rent: 50, logistics: 9, expandCost: 5000 },
        { name: 's6', cols: 7, rows: 7, fruits: 7, price: 9, rent: 100, logistics: 10, expandCost: 6000 },
        { name: 's7', cols: 7, rows: 7, fruits: 7, price: 0, rent: 0, logistics: 0, expandCost: null }
    ],
    inflationRate: 1.5,
    inflationInterval: 30,
    surchargeStage: 6,
    surchargeRate: 2,
    surchargeInterval: 20,
    laborPerSwap: 2,
    logisticsInterval: 5,
    sameFruitBonus: 0.3,
    otherFruitBonus: 0.1,
    maxMultiplier: 3,
    multiplierDecay: 0.02,
    dangerSeconds: 10,
    expandReserveSeconds: 10,
    clearCashMultiplier: 2,
    leaderboardMinScore: 100000
};

function runAt(overrides) {
    return { ...Economy.createRun(T), ...overrides };
}

function ticks(state, count, dt = 0.1) {
    let current = state;
    for (let i = 0; i < count; i++) current = Economy.tick(current, T, dt);
    return current;
}

function assertClose(actual, expected) {
    assert.ok(Math.abs(actual - expected) < 1e-6, `expected ${expected}, got ${actual}`);
}

function group(fruit, size) {
    return { fruit, cells: Array.from({ length: size }, (_, col) => ({ row: 0, col })) };
}

function oneStepResult(fruit, size) {
    return { valid: true, steps: [{ kind: 'match', chain: 1, groups: [group(fruit, size)] }] };
}

test('createRun opens the tent with the starting cash and no revenue', () => {
    const run = Economy.createRun(T);
    assert.equal(run.stage, 1);
    assert.equal(run.cash, 500);
    assert.equal(run.revenue, 0);
    assert.equal(run.time, 0);
    assert.equal(run.combo.multiplier, 1);
    assert.equal(run.ended, null);
    assert.deepEqual(run.modifiers, { rent: 1, labor: 1, logistics: 1, revenue: 1 });
});

test('tick charges rent for the time that passed', () => {
    const run = ticks(Economy.createRun(T), 10);
    assertClose(run.cash, 490);
    assert.equal(run.time, 1);
    assert.equal(run.stageTime, 1);
});

test('rent goes up by the inflation rate every 30 seconds of game time', () => {
    assert.equal(Economy.currentRent(runAt({ time: 29.9 }), T), 10);
    assert.equal(Economy.currentRent(runAt({ time: 30 }), T), 15);
    assert.equal(Economy.currentRent(runAt({ time: 60 }), T), 22.5);
    assert.equal(Economy.inflation(runAt({ time: 60 }), T), 2.25);
});

test('the surcharge only applies at the surcharge stage and grows every 20 seconds there', () => {
    assert.equal(Economy.currentRent(runAt({ stage: 5, stageTime: 40 }), T), 50);
    assert.equal(Economy.currentRent(runAt({ stage: 6, stageTime: 19.9 }), T), 100);
    assert.equal(Economy.currentRent(runAt({ stage: 6, stageTime: 20 }), T), 200);
    assert.equal(Economy.currentRent(runAt({ stage: 6, stageTime: 40, time: 30 }), T), 600);
    assert.equal(Economy.surcharge(runAt({ stage: 6, stageTime: 40 }), T), 4);
});

test('logistics is charged once every 5 seconds', () => {
    const start = runAt({ stage: 2 });
    const before = ticks(start, 49);
    assertClose(before.cash, 500 - 20 * 4.9);
    const after = Economy.tick(before, T, 0.1);
    assertClose(after.cash, 500 - 20 * 5 - 6);
    assert.equal(after.logisticsTimer, 0);
});

test('tick cools the multiplier down but not below x1.0', () => {
    const run = runAt({ combo: { multiplier: 1.5, comboCount: 2, lastMatchedFruit: 'a' } });
    assert.equal(Economy.tick(run, T, 10).combo.multiplier, 1.3);
    assert.equal(Economy.tick(Economy.tick(run, T, 10), T, 20).combo.multiplier, 1);
});

test('chargeSwap pays labor and counts the swap', () => {
    const run = Economy.chargeSwap(Economy.createRun(T), T);
    assert.equal(run.cash, 498);
    assert.equal(run.swaps, 1);
});

test('scoreMove prices fruits at the current stage and the revenue modifier', () => {
    const scored = Economy.scoreMove(Economy.createRun(T), T, oneStepResult('a', 3), 'a', 'b');
    assert.deepEqual(scored.stepScores, [6]);
    const doubled = Economy.scoreMove(runAt({ stage: 2, modifiers: { rent: 1, labor: 1, logistics: 1, revenue: 2 } }), T, oneStepResult('a', 4), 'a', 'b');
    assert.deepEqual(doubled.stepScores, [40]);
});

test('addEarnings raises both cash and revenue', () => {
    const run = Economy.addEarnings(Economy.createRun(T), 120);
    assert.equal(run.cash, 620);
    assert.equal(run.revenue, 120);
});

test('finishMove applies the new combo state and remembers the best multiplier and chain', () => {
    const run = Economy.createRun(T);
    const scored = Economy.scoreMove(run, T, oneStepResult('a', 3), 'a', 'b');
    const after = Economy.finishMove(run, scored, 3);
    assert.equal(after.combo.multiplier, 1.1);
    assert.equal(after.combo.lastMatchedFruit, 'a');
    assert.equal(after.maxMultiplier, 1.1);
    assert.equal(after.maxChain, 3);
    assert.equal(Economy.finishMove(after, scored, 1).maxChain, 3);
});

test('canExpand needs the expansion cost plus a reserve of the next stage\'s rent', () => {
    // Stage 2 rent is 20/s, so the 10-second reserve is 200 on top of the 1000 cost.
    assert.equal(Economy.expandRequirement(runAt({}), T), 1200);
    assert.equal(Economy.canExpand(runAt({ cash: 1000 }), T), false);
    assert.equal(Economy.canExpand(runAt({ cash: 1199 }), T), false);
    assert.equal(Economy.canExpand(runAt({ cash: 1200 }), T), true);
    assert.equal(Economy.nextExpandCost(runAt({ stage: 3 }), T), 3000);
});

test('the reserve uses today\'s inflation and is not needed for the clear', () => {
    assert.equal(Economy.expandRequirement(runAt({ time: 30 }), T), 1000 + 20 * 1.5 * 10);
    assert.equal(Economy.expandRequirement(runAt({ stage: 6 }), T), 6000);
    assert.equal(Economy.expandRequirement(runAt({ stage: 7 }), T), null);
});

test('after expanding with just the requirement the shop can pay its new rent for the reserve time', () => {
    const run = Economy.expand(runAt({ cash: 1200 }), T);
    assert.equal(run.stage, 2);
    assert.equal(run.cash, 200);
    assert.equal(run.cash / Economy.currentRent(run, T), 10);
});

test('expand pays, moves up a stage, and restarts the stage clock but not game time', () => {
    const run = Economy.expand(runAt({ cash: 1500, time: 42, stageTime: 42 }), T);
    assert.equal(run.stage, 2);
    assert.equal(run.cash, 500);
    assert.equal(run.stageTime, 0);
    assert.equal(run.time, 42);
    assert.equal(run.ended, null);
});

test('expand does nothing without enough cash', () => {
    const before = runAt({ cash: 10 });
    assert.equal(Economy.expand(before, T), before);
});

test('expanding from the last stage before the clear ends the run as a clear', () => {
    const run = Economy.expand(runAt({ stage: 6, cash: 7000, revenue: 50000 }), T);
    assert.equal(run.stage, 7);
    assert.equal(run.ended, 'clear');
    assert.equal(Economy.nextExpandCost(run, T), null);
    assert.equal(Economy.canExpand(run, T), false);
    assert.equal(Economy.finalScore(run, T), 50000 + 6000 + 1000 * 2);
});

test('the run goes bankrupt at zero cash and scores its revenue', () => {
    assert.equal(Economy.isBankrupt(runAt({ cash: 0.5 })), false);
    assert.equal(Economy.isBankrupt(runAt({ cash: 0 })), true);
    const run = Economy.bankrupt(runAt({ cash: -3, revenue: 1234.7 }));
    assert.equal(run.ended, 'bankrupt');
    assert.equal(Economy.isBankrupt(run), false);
    assert.equal(Economy.finalScore(run, T), 1234);
});

test('an ended run no longer pays anything', () => {
    const run = runAt({ ended: 'bankrupt', cash: -5 });
    assert.equal(Economy.tick(run, T, 1), run);
    assert.equal(Economy.chargeSwap(run, T), run);
    assert.equal(Economy.isInDanger(run, T), false);
});

test('danger means cash for 10 seconds of rent or less', () => {
    assert.equal(Economy.isInDanger(runAt({ cash: 100 }), T), true);
    assert.equal(Economy.isInDanger(runAt({ cash: 101 }), T), false);
    assert.equal(Economy.isInDanger(runAt({ cash: 150, time: 30 }), T), true);
});

test('projectedRent prices another stage with today\'s inflation', () => {
    assert.equal(Economy.projectedRent(runAt({ time: 30 }), T, 2), 30);
    assert.equal(Economy.projectedRent(runAt({ stage: 5, time: 0 }), T, 6), 100);
});

test('no function changes the run it was given', () => {
    const run = runAt({ cash: 1500, stage: 1 });
    const copy = structuredClone(run);
    Economy.tick(run, T, 1);
    Economy.chargeSwap(run, T);
    Economy.addEarnings(run, 10);
    Economy.finishMove(run, Economy.scoreMove(run, T, oneStepResult('a', 3), 'a', 'b'), 2);
    Economy.expand(run, T);
    Economy.bankrupt(run);
    assert.deepEqual(run, copy);
});
