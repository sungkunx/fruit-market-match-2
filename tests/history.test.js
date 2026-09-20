const test = require('node:test');
const assert = require('node:assert/strict');
const History = require('../history.js');

test('recordSample keeps only what is inside the window and does not touch its input', () => {
    const first = History.recordSample(History.createHistory(), 0, 100, 500, 30);
    const second = History.recordSample(first, 10, 300, 400, 30);
    const later = History.recordSample(second, 40, 900, 200, 30);

    assert.deepEqual(first.samples, [{ time: 0, revenue: 100, cash: 500 }]);
    assert.deepEqual(second.samples.map(sample => sample.time), [0, 10]);
    assert.deepEqual(later.samples.map(sample => sample.time), [10, 40]);
});

test('recording the same moment twice replaces the last sample', () => {
    const history = History.recordSample(History.recordSample(History.createHistory(), 5, 100, 400, 30), 5, 180, 380, 30);
    assert.deepEqual(history.samples, [{ time: 5, revenue: 180, cash: 380 }]);
});

test('samplesIn returns the samples inside the window, oldest first', () => {
    let history = History.createHistory();
    [[0, 100, 500], [10, 300, 400], [40, 900, 200]].forEach(([time, revenue, cash]) => {
        history = History.recordSample(history, time, revenue, cash, 100);
    });
    assert.deepEqual(History.samplesIn(history, 45, 30).map(sample => sample.time), [40]);
    assert.deepEqual(History.samplesIn(history, 45, 100).map(sample => sample.time), [0, 10, 40]);
});

test('revenueRange spans the samples and never has zero height', () => {
    assert.deepEqual(History.revenueRange([]), { min: 0, max: 0 });
    assert.deepEqual(History.revenueRange([{ time: 0, revenue: 100, cash: 0 }, { time: 1, revenue: 400, cash: 0 }]), { min: 100, max: 400 });
    assert.deepEqual(History.revenueRange([{ time: 0, revenue: 250, cash: 0 }, { time: 1, revenue: 250, cash: 0 }]), { min: 250, max: 251 });
});
