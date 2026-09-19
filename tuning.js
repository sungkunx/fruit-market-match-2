// Every number the growth mode is balanced on. Tune here, then run `node tools/sim.js`.
(function (root) {
    'use strict';

    const Tuning = {
        startCash: 500,
        fruitOrder: ['apple', 'banana', 'grape', 'kiwi', 'orange', 'strawberry', 'cherry'],
        frameSize: 7,
        // expandCost is what it takes to leave this stage. The last stage is the clear ending.
        stages: [
            { name: '천막', cols: 5, rows: 5, fruits: 4, price: 5, rent: 14, logistics: 0, expandCost: 1400 },
            { name: '좌판', cols: 6, rows: 5, fruits: 5, price: 21, rent: 50, logistics: 6, expandCost: 7900 },
            { name: '매대', cols: 6, rows: 6, fruits: 5, price: 62, rent: 150, logistics: 16, expandCost: 29000 },
            { name: '편의점', cols: 6, rows: 6, fruits: 6, price: 248, rent: 450, logistics: 21, expandCost: 42000 },
            { name: '대형마트', cols: 6, rows: 7, fruits: 6, price: 740, rent: 1660, logistics: 72, expandCost: 84000 },
            { name: '백화점', cols: 7, rows: 7, fruits: 7, price: 2700, rent: 6000, logistics: 180, expandCost: 5500000 },
            { name: '우주 최강 건물', cols: 7, rows: 7, fruits: 7, price: 0, rent: 0, logistics: 0, expandCost: null }
        ],
        // The one-time practice shop (tutorial). It replaces the first stage for that run only.
        tutorialStage: { name: '연습 천막', cols: 5, rows: 5, fruits: 3, price: 2, rent: 2, logistics: 0, expandCost: 200 },
        // Practice pacing: seconds bubble 2 shows before the rent tip, and the least time the rent tip stays up.
        practiceRentTipSeconds: 4,
        practiceStepMinSeconds: 3,
        inflationRate: 1.15,
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
        dangerSeconds: 6,
        // Seconds of the next stage's rent that must be left after paying for an expansion.
        // Keep it above dangerSeconds so the siren does not start the moment the shop grows.
        expandReserveSeconds: 8,
        clearCashMultiplier: 2,
        leaderboardMinScore: 100000,
        // Customers in front of the shop: earnings over the last window, compared with rent.
        crowdWindowSeconds: 8,
        crowdPerRentPace: 3,
        crowdMax: 14,
        crowdUpdateSeconds: 0.5
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Tuning;
    } else {
        root.Tuning = Tuning;
    }
})(typeof window !== 'undefined' ? window : globalThis);
