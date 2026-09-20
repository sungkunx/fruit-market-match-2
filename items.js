// Which item a move pays out, and the two slots that hold them. No DOM access.
(function (root) {
    'use strict';

    // Only what the board did on its own counts. The cells an item cleared by fiat are not a
    // feat, or a stock clear would always pay for the next one.
    function earnedSteps(result) {
        return result.steps.filter(step => step.kind !== 'item');
    }

    // The conditions are checked from the top down, so the strongest item hangs on the rarest
    // feat and a move never pays more than one item.
    function dropFor(result, rules) {
        if (!result.valid) return null;
        const steps = earnedSteps(result);
        if (steps.length === 0) return null;
        const chain = Math.max(...steps.map(step => step.chain));
        const group = steps.reduce((most, step) => step.groups.reduce((inner, entry) => Math.max(inner, entry.cells.length), most), 0);
        const match = rules.drops.find(drop => chain >= drop.minChain || group >= drop.minGroup);
        return match ? match.item : null;
    }

    function hasRoom(slots, maxSlots) {
        return slots.length < maxSlots;
    }

    // A full shelf pays out nothing: hoarding items costs you the next one.
    function addItem(slots, item, maxSlots) {
        if (!hasRoom(slots, maxSlots)) return slots;
        return [...slots, item];
    }

    function useItem(slots, index) {
        if (index < 0 || index >= slots.length) return slots;
        return slots.filter((item, position) => position !== index);
    }

    // What an item clear counts as for the same-fruit multiplier: the fruit it sold most of.
    function mainFruit(step) {
        return step.groups.reduce((best, group) => (best === null || group.cells.length > best.cells.length ? group : best), null)?.fruit ?? null;
    }

    const Items = { dropFor, hasRoom, addItem, useItem, mainFruit };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Items;
    } else {
        root.Items = Items;
    }
})(typeof window !== 'undefined' ? window : globalThis);
