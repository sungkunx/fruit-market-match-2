// Every number the growth mode is balanced on. Tune here, then run `node tools/sim.js`.
(function (root) {
    'use strict';

    const Tuning = {
        startCash: 500,
        fruitOrder: ['apple', 'banana', 'grape', 'kiwi', 'orange', 'strawberry', 'cherry'],
        frameSize: 7,
        // expandCost is what it takes to leave this stage. The last stage is the clear ending.
        stages: [
            { name: '천막', cols: 5, rows: 5, fruits: 3, price: 2, rent: 4, logistics: 0, expandCost: 1300 },
            { name: '좌판', cols: 6, rows: 5, fruits: 4, price: 17, rent: 32, logistics: 6, expandCost: 7900 },
            { name: '매대', cols: 6, rows: 6, fruits: 4, price: 42, rent: 136, logistics: 16, expandCost: 30000 },
            { name: '편의점', cols: 6, rows: 6, fruits: 5, price: 270, rent: 880, logistics: 21, expandCost: 97000 },
            { name: '대형마트', cols: 6, rows: 7, fruits: 6, price: 1080, rent: 4300, logistics: 72, expandCost: 580000 },
            { name: '백화점', cols: 7, rows: 7, fruits: 7, price: 3900, rent: 18000, logistics: 180, expandCost: 4500000 },
            { name: '우주 최강 건물', cols: 7, rows: 7, fruits: 7, price: 0, rent: 0, logistics: 0, expandCost: null }
        ],
        inflationRate: 1.12,
        inflationInterval: 30,
        surchargeStage: 6,
        surchargeRate: 1.15,
        surchargeInterval: 20,
        laborPerSwap: 2,
        logisticsInterval: 5,
        sameFruitBonus: 0.3,
        otherFruitBonus: 0.1,
        maxMultiplier: 3.0,
        multiplierDecay: 0.02,
        dangerSeconds: 10,
        // Seconds of the next stage's rent that must be left after paying for an expansion.
        // Keep it above dangerSeconds so the siren does not start the moment the shop grows.
        expandReserveSeconds: 15,
        clearCashMultiplier: 2,
        leaderboardMinScore: 100000
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Tuning;
    } else {
        root.Tuning = Tuning;
    }
})(typeof window !== 'undefined' ? window : globalThis);
