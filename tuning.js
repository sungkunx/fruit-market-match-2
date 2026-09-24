// Every number the growth mode is balanced on. Tune here, then run `node tools/sim.js`.
(function (root) {
    'use strict';

    const Tuning = {
        startCash: 500,
        fruitOrder: ['apple', 'banana', 'grape', 'kiwi', 'orange', 'strawberry', 'cherry'],
        // The board's frame: 8 columns by 7 rows. A run opens its middle 6x5 and grows from there.
        frameCols: 8,
        frameRows: 7,
        // 25 stages: six buildings of four steps each, then the endless space tower. Each step
        // opens one more cell of the 8x7 frame from the 6x5 start; the tower opens the rest. Prices and
        // rents climb geometrically from one building's values to the next across its four steps.
        // expandCost is what it takes to leave this stage. The last stage is endless.
        startCols: 6,
        startRows: 5,
        stages: [
            { name: '천막', building: 1, sub: 1, fruits: 4, price: 5, rent: 14, logistics: 0, expandCost: 690 },
            { name: '천막', building: 1, sub: 2, fruits: 4, price: 7, rent: 19, logistics: 0, expandCost: 750 },
            { name: '천막', building: 1, sub: 3, fruits: 4, price: 10, rent: 26, logistics: 0, expandCost: 1500 },
            { name: '천막', building: 1, sub: 4, fruits: 4, price: 15, rent: 36, logistics: 0, expandCost: 3300 },
            { name: '좌판', building: 2, sub: 1, fruits: 5, price: 21, rent: 50, logistics: 6, expandCost: 3800 },
            { name: '좌판', building: 2, sub: 2, fruits: 5, price: 28, rent: 66, logistics: 8, expandCost: 4100 },
            { name: '좌판', building: 2, sub: 3, fruits: 5, price: 36, rent: 87, logistics: 10, expandCost: 4500 },
            { name: '좌판', building: 2, sub: 4, fruits: 5, price: 47, rent: 110, logistics: 13, expandCost: 6500 },
            { name: '매대', building: 3, sub: 1, fruits: 5, price: 62, rent: 150, logistics: 16, expandCost: 8800 },
            { name: '매대', building: 3, sub: 2, fruits: 5, price: 88, rent: 200, logistics: 17, expandCost: 12000 },
            { name: '매대', building: 3, sub: 3, fruits: 5, price: 120, rent: 260, logistics: 18, expandCost: 15000 },
            { name: '매대', building: 3, sub: 4, fruits: 5, price: 180, rent: 340, logistics: 20, expandCost: 23000 },
            { name: '편의점', building: 4, sub: 1, fruits: 5, price: 250, rent: 450, logistics: 21, expandCost: 44000 },
            { name: '편의점', building: 4, sub: 2, fruits: 5, price: 330, rent: 620, logistics: 29, expandCost: 60000 },
            { name: '편의점', building: 4, sub: 3, fruits: 5, price: 430, rent: 860, logistics: 39, expandCost: 84000 },
            { name: '편의점', building: 4, sub: 4, fruits: 5, price: 560, rent: 1200, logistics: 53, expandCost: 90000 },
            { name: '대형마트', building: 5, sub: 1, fruits: 6, price: 740, rent: 1700, logistics: 72, expandCost: 110000 },
            { name: '대형마트', building: 5, sub: 2, fruits: 6, price: 1000, rent: 2300, logistics: 91, expandCost: 110000 },
            { name: '대형마트', building: 5, sub: 3, fruits: 6, price: 1400, rent: 3200, logistics: 110, expandCost: 120000 },
            { name: '대형마트', building: 5, sub: 4, fruits: 6, price: 2000, rent: 4400, logistics: 140, expandCost: 130000 },
            { name: '백화점', building: 6, sub: 1, fruits: 7, price: 2700, rent: 6000, logistics: 180, expandCost: 180000 },
            { name: '백화점', building: 6, sub: 2, fruits: 7, price: 3600, rent: 6600, logistics: 240, expandCost: 230000 },
            { name: '백화점', building: 6, sub: 3, fruits: 7, price: 4700, rent: 7300, logistics: 310, expandCost: 370000 },
            { name: '백화점', building: 6, sub: 4, fruits: 7, price: 6200, rent: 8100, logistics: 410, expandCost: 860000 },
            { name: '우주 최강 건물', building: 7, sub: 1, fruits: 7, price: 8100, rent: 9000, logistics: 540, expandCost: null }
        ],
        // The one-time practice shop (tutorial). It replaces the first stage for that run only.
        tutorialStage: { name: '연습 천막', building: 1, sub: 0, fruits: 3, price: 2, rent: 2, logistics: 0, expandCost: 200 },
        // Practice pacing: seconds bubble 2 shows before the rent tip, and the least time the rent tip stays up.
        practiceRentTipSeconds: 4,
        practiceStepMinSeconds: 3,
        inflationRate: 1.15,
        inflationInterval: 30,
        surchargeStage: 25,
        surchargeRate: 1.2,
        // A new shop opens at half rent, pays full rent 30 seconds later, and from then on pays
        // more the longer it stays put.
        openingRelief: {
            start: 0.5,
            seconds: 30,
            // Nothing extra for the first minute; after that, sitting still costs more and more.
            climbAfter: 60,
            climbRate: 1.1,
            climbInterval: 20,
            climbMax: 2.5
        },
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
        leaderboardMinScore: 100000,
        // Customers in front of the shop: earnings over the last window, compared with rent.
        crowdWindowSeconds: 8,
        crowdPerRentPace: 6,
        crowdMax: 32,
        crowdPerBranch: 0.3,
        crowdUpdateSeconds: 0.5
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Tuning;
    } else {
        root.Tuning = Tuning;
    }
})(typeof window !== 'undefined' ? window : globalThis);
