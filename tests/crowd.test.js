const test = require('node:test');
const assert = require('node:assert/strict');
const Crowd = require('../crowd.js');

const T = { crowdPerRentPace: 3, crowdMax: 14 };

test('earningPace adds up only the earnings inside the window', () => {
    let crowd = Crowd.createCrowd();
    crowd = Crowd.recordEarning(crowd, 80, 0, 8);
    crowd = Crowd.recordEarning(crowd, 40, 5, 8);
    assert.equal(Crowd.earningPace(crowd, 6, 8), 15);
    assert.equal(Crowd.earningPace(crowd, 9, 8), 5);
    assert.equal(Crowd.earningPace(crowd, 20, 8), 0);
});

test('recordEarning drops earnings that left the window and keeps its input as is', () => {
    const first = Crowd.recordEarning(Crowd.createCrowd(), 80, 0, 8);
    const second = Crowd.recordEarning(first, 40, 10, 8);
    assert.deepEqual(second.earnings, [{ amount: 40, time: 10 }]);
    assert.deepEqual(first.earnings, [{ amount: 80, time: 0 }]);
});

test('targetCrowdSize is three customers per rent paid, rounded', () => {
    assert.equal(Crowd.targetCrowdSize(10, 10, T), 3);
    assert.equal(Crowd.targetCrowdSize(30, 10, T), 9);
    assert.equal(Crowd.targetCrowdSize(5, 10, T), 2);
    assert.equal(Crowd.targetCrowdSize(1, 10, T), 0);
});

test('targetCrowdSize stays between zero and the maximum', () => {
    assert.equal(Crowd.targetCrowdSize(0, 10, T), 0);
    assert.equal(Crowd.targetCrowdSize(1000, 10, T), 14);
});

test('targetCrowdSize handles a shop with no rent', () => {
    assert.equal(Crowd.targetCrowdSize(5, 0, T), 14);
    assert.equal(Crowd.targetCrowdSize(0, 0, T), 0);
});
