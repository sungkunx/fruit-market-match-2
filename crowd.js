// Earning pace and crowd size for the customers in front of the shop. No DOM access.
(function (root) {
    'use strict';

    function createCrowd() {
        return { earnings: [] };
    }

    function isInWindow(earning, time, windowSeconds) {
        return time - earning.time < windowSeconds;
    }

    // Remembers one sale. Sales older than the window are dropped so the list stays short.
    function recordEarning(crowd, amount, time, windowSeconds) {
        const earnings = crowd.earnings.filter(earning => isInWindow(earning, time, windowSeconds));
        earnings.push({ amount, time });
        return { earnings };
    }

    // Money earned per second over the last window.
    function earningPace(crowd, time, windowSeconds) {
        const total = crowd.earnings
            .filter(earning => isInWindow(earning, time, windowSeconds))
            .reduce((sum, earning) => sum + earning.amount, 0);
        return total / windowSeconds;
    }

    // Customers the shop should draw: a few per rent's worth of earning pace, and more for every
    // branch standing next to the main shop.
    function targetCrowdSize(pace, rent, tuning, branches = 1) {
        if (rent <= 0) return pace > 0 ? tuning.crowdMax : 0;
        const pull = 1 + (tuning.crowdPerBranch || 0) * (branches - 1);
        const size = Math.round(pace / rent * tuning.crowdPerRentPace * pull);
        return Math.max(0, Math.min(tuning.crowdMax, size));
    }

    const Crowd = { createCrowd, recordEarning, earningPace, targetCrowdSize };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Crowd;
    } else {
        root.Crowd = Crowd;
    }
})(typeof window !== 'undefined' ? window : globalThis);
