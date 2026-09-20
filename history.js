// The last stretch of the run, for the graph behind the shop. No DOM access.
(function (root) {
    'use strict';

    function createHistory() {
        return { samples: [] };
    }

    function isInWindow(sample, time, windowSeconds) {
        return time - sample.time <= windowSeconds;
    }

    // Remembers one moment. Samples older than the window are dropped so the list stays short.
    function recordSample(history, time, revenue, cash, windowSeconds) {
        const samples = history.samples.filter(sample => isInWindow(sample, time, windowSeconds) && sample.time !== time);
        samples.push({ time, revenue, cash });
        return { samples };
    }

    function samplesIn(history, time, windowSeconds) {
        return history.samples.filter(sample => isInWindow(sample, time, windowSeconds));
    }

    // The band the revenue line is drawn in. Never zero height, so the line cannot divide by zero.
    function revenueRange(samples) {
        if (samples.length === 0) return { min: 0, max: 0 };
        const values = samples.map(sample => sample.revenue);
        const min = Math.min(...values);
        const max = Math.max(...values);
        return { min, max: max > min ? max : min + 1 };
    }

    const History = { createHistory, recordSample, samplesIn, revenueRange };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = History;
    } else {
        root.History = History;
    }
})(typeof window !== 'undefined' ? window : globalThis);
