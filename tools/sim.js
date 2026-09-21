// Plays bot runs with the real rules (tuning.js, economy.js, board.js) and prints how far
// each kind of player gets. Run after changing tuning.js:
//   node tools/sim.js [runsPerPlayer]
const Board = require('../board.js');
const Economy = require('../economy.js');
const Tuning = require('../tuning.js');

const PLAYERS = [
    { name: '설렁설렁', interval: 3 },
    { name: '보통', interval: 2 },
    { name: '잘함', interval: 1.3 },
    { name: '고수', interval: 1 },
    { name: '초고수', interval: 0.8 }
];
const DT = 0.1;
const MAX_TIME = 1200;

// Deterministic pseudo-random numbers in [0, 1) (mulberry32).
function seededRng(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function fruitsFor(stage) {
    return Tuning.fruitOrder.slice(0, Tuning.stages[stage - 1].fruits);
}

// Every swap that makes a match right away.
function validMoves(board) {
    const moves = [];
    for (let row = 0; row < board.length; row++) {
        for (let col = 0; col < board[0].length; col++) {
            [{ row, col: col + 1 }, { row: row + 1, col }].forEach(other => {
                if (other.row >= board.length || other.col >= board[0].length) return;
                const swapped = board.map(line => line.slice());
                swapped[row][col] = board[other.row][other.col];
                swapped[other.row][other.col] = board[row][col];
                if (Board.findMatches(swapped).length > 0) moves.push([{ row, col }, other]);
            });
        }
    }
    return moves;
}

// The first special the bot can see. It taps whatever it finds before swapping again.
function findSpecial(board) {
    for (let row = 0; row < board.length; row++) {
        for (let col = 0; col < board[0].length; col++) {
            if (Board.specialOf(board[row][col])) return { row, col };
        }
    }
    return null;
}

function playRun(interval, seed) {
    const rng = seededRng(seed);
    const first = Tuning.stages[0];
    let run = Economy.createRun(Tuning);
    let board = Board.createBoard(rng, fruitsFor(1), first.cols, first.rows);
    let nextSwapAt = interval;
    const reachedAt = [];

    while (run.time < MAX_TIME && !run.ended) {
        run = Economy.tick(run, Tuning, DT);

        if (run.time >= nextSwapAt) {
            nextSwapAt += interval;
            if (!Board.hasPossibleMove(board)) board = Board.shuffle(board, rng);

            // Setting a special off is a turn of its own, the same as it is for a player.
            const special = findSpecial(board);
            if (special) {
                const played = Board.blast(board, special, rng, fruitsFor(run.stage));
                const fruit = played.steps[0].groups[0].fruit;
                const scored = Economy.scoreMove(run, Tuning, played, fruit, fruit);
                scored.stepScores.forEach(amount => { run = Economy.addEarnings(run, amount); });
                run = Economy.finishMove(run, scored, played.steps.length);
                board = played.finalBoard;
            } else {
                const moves = validMoves(board);
                const [a, b] = moves[Math.floor(rng() * moves.length)];
                const moved = board[a.row][a.col];
                const displaced = board[b.row][b.col];
                run = Economy.chargeSwap(run, Tuning);
                const result = Board.resolveMove(board, a, b, rng, fruitsFor(run.stage));
                const scored = Economy.scoreMove(run, Tuning, result, moved, displaced);
                scored.stepScores.forEach(amount => { run = Economy.addEarnings(run, amount); });
                run = Economy.finishMove(run, scored, result.steps.length);
                board = result.finalBoard;
            }
        }

        if (Economy.isBankrupt(run)) {
            run = Economy.bankrupt(run);
            break;
        }

        // Expanding is not optional: the shop grows the moment it can afford to.
        if (Economy.canExpand(run, Tuning)) {
            run = Economy.expand(run, Tuning);
            reachedAt.push(Math.round(run.time));
            const info = Tuning.stages[run.stage - 1];
            board = Board.expandBoard(board, fruitsFor(run.stage), info.cols, info.rows, rng).board;
        }
    }

    return { ended: run.ended || 'alive', time: run.time, stage: run.stage, score: Economy.finalScore(run), reachedAt };
}

function median(values) {
    const sorted = values.slice().sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
}

function formatTime(seconds) {
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

const runsPerPlayer = Number(process.argv[2]) || 10;
console.log(`runs per player: ${runsPerPlayer}`);
console.log('player      | stage 7 | median time | median stage | median score | stage reached at (median run)');
PLAYERS.forEach(player => {
    const runs = [];
    for (let seed = 1; seed <= runsPerPlayer; seed++) runs.push(playRun(player.interval, seed));
    const reachedLast = runs.filter(r => r.stage === Tuning.stages.length).length;
    const medianScore = median(runs.map(r => r.score));
    const typical = runs.find(r => r.score === medianScore);
    console.log([
        `${player.name} (${player.interval}s)`.padEnd(11),
        `${reachedLast}/${runs.length}`.padStart(7),
        formatTime(median(runs.map(r => r.time))).padStart(11),
        String(median(runs.map(r => r.stage))).padStart(12),
        medianScore.toLocaleString('en-US').padStart(12),
        typical.reachedAt.map((t, i) => `${i + 2}@${t}s`).join(' ')
    ].join(' | '));
});
