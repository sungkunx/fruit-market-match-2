const test = require('node:test');
const assert = require('node:assert/strict');
const Items = require('../items.js');

const RULES = {
    slots: 2,
    crateRadius: 1,
    drops: [
        { item: 'stock', minChain: 4, minGroup: 6 },
        { item: 'crate', minChain: Infinity, minGroup: 5 },
        { item: 'reshelf', minChain: 3, minGroup: Infinity }
    ]
};

// A result with `chain` cascade steps whose biggest group holds `biggest` cells.
function resultOf(chain, biggest) {
    const steps = [];
    for (let index = 0; index < chain; index++) {
        steps.push({ kind: 'match', chain: index + 1, groups: [{ fruit: 'a', cells: new Array(index === 0 ? biggest : 3).fill({ row: 0, col: 0 }) }] });
    }
    return { valid: true, steps };
}

test('the rarest condition wins: a long chain or a huge group pays a stock clear', () => {
    assert.equal(Items.dropFor(resultOf(4, 3), RULES), 'stock');
    assert.equal(Items.dropFor(resultOf(1, 6), RULES), 'stock');
    assert.equal(Items.dropFor(resultOf(5, 7), RULES), 'stock');
});

test('five in one go pays a crate, three cascade steps pay a reshuffle', () => {
    assert.equal(Items.dropFor(resultOf(1, 5), RULES), 'crate');
    assert.equal(Items.dropFor(resultOf(2, 5), RULES), 'crate');
    assert.equal(Items.dropFor(resultOf(3, 3), RULES), 'reshelf');
});

test('what an item cleared by fiat is not a feat: only the cascade after it counts', () => {
    const itemStep = { kind: 'item', chain: 1, groups: [{ fruit: 'a', cells: new Array(9).fill({ row: 0, col: 0 }) }] };
    const quiet = { valid: true, steps: [itemStep] };
    assert.equal(Items.dropFor(quiet, RULES), null);

    const cascaded = { valid: true, steps: [itemStep, { kind: 'match', chain: 2, groups: [{ fruit: 'b', cells: new Array(3).fill(0) }] }, { kind: 'match', chain: 3, groups: [{ fruit: 'b', cells: new Array(3).fill(0) }] }] };
    assert.equal(Items.dropFor(cascaded, RULES), 'reshelf');
});

test('an ordinary move pays nothing', () => {
    assert.equal(Items.dropFor(resultOf(1, 3), RULES), null);
    assert.equal(Items.dropFor(resultOf(2, 4), RULES), null);
    assert.equal(Items.dropFor({ valid: false }, RULES), null);
});

test('addItem fills the slots and then refuses more, without touching its input', () => {
    const empty = [];
    const one = Items.addItem(empty, 'crate', RULES.slots);
    const two = Items.addItem(one, 'reshelf', RULES.slots);
    const three = Items.addItem(two, 'stock', RULES.slots);

    assert.deepEqual(empty, []);
    assert.deepEqual(one, ['crate']);
    assert.deepEqual(two, ['crate', 'reshelf']);
    assert.deepEqual(three, ['crate', 'reshelf']);
    assert.equal(Items.hasRoom(two, RULES.slots), false);
    assert.equal(Items.hasRoom(one, RULES.slots), true);
});

test('useItem takes one slot out and leaves the rest in order', () => {
    const slots = ['crate', 'reshelf'];
    assert.deepEqual(Items.useItem(slots, 0), ['reshelf']);
    assert.deepEqual(Items.useItem(slots, 1), ['crate']);
    assert.deepEqual(Items.useItem(slots, 5), ['crate', 'reshelf']);
    assert.deepEqual(slots, ['crate', 'reshelf']);
});

test('the fruit an item clear should count as is the one it sold most of', () => {
    const step = { groups: [{ fruit: 'apple', cells: [1, 2] }, { fruit: 'kiwi', cells: [1, 2, 3] }] };
    assert.equal(Items.mainFruit(step), 'kiwi');
    assert.equal(Items.mainFruit({ groups: [] }), null);
});
