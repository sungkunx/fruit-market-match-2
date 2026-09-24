// Board rules for the swipe match game. No DOM access.
(function (root) {
    'use strict';

    function cloneBoard(board) {
        return board.map(row => row.slice());
    }

    function randomFruit(rng, fruits) {
        return fruits[Math.floor(rng() * fruits.length)];
    }

    // A cell is the fruit's name, and a special carries its kind after a '#'. The rainbow has no
    // fruit at all ('#stock'), so it never joins a match and only a tap sets it off.
    const SPECIAL_MARK = '#';

    function fruitOf(cell) {
        if (cell === null) return null;
        const mark = cell.indexOf(SPECIAL_MARK);
        return mark < 0 ? cell : cell.slice(0, mark);
    }

    function specialOf(cell) {
        if (cell === null) return null;
        const mark = cell.indexOf(SPECIAL_MARK);
        return mark < 0 ? null : cell.slice(mark + 1);
    }

    function withSpecial(fruit, kind) {
        return `${fruit}${SPECIAL_MARK}${kind}`;
    }

    // A closed cell of the 7x7 frame: no fruit, breaks every line, never moves and never clears.
    const HOLE = SPECIAL_MARK;

    function isHole(cell) {
        return cell === HOLE;
    }

    function isOpen(board, cell) {
        return inBounds(board, cell) && !isHole(board[cell.row][cell.col]);
    }

    function sameFruit(a, b) {
        const fruit = fruitOf(a);
        return fruit !== null && fruit !== '' && fruit === fruitOf(b);
    }

    function inBounds(board, cell) {
        return cell.row >= 0 && cell.row < board.length && cell.col >= 0 && cell.col < board[0].length;
    }

    function isAdjacent(a, b) {
        return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
    }

    function swapCells(board, a, b) {
        const next = cloneBoard(board);
        next[a.row][a.col] = board[b.row][b.col];
        next[b.row][b.col] = board[a.row][a.col];
        return next;
    }

    // Straight lines of 3+ identical fruits, horizontal first, then vertical.
    function findRuns(board) {
        const rows = board.length;
        const cols = board[0].length;
        const runs = [];

        for (let row = 0; row < rows; row++) {
            let start = 0;
            for (let col = 1; col <= cols; col++) {
                if (col < cols && sameFruit(board[row][col], board[row][start])) continue;
                if (col - start >= 3 && fruitOf(board[row][start])) {
                    const cells = [];
                    for (let k = start; k < col; k++) cells.push({ row, col: k });
                    runs.push({ fruit: fruitOf(board[row][start]), cells });
                }
                start = col;
            }
        }

        for (let col = 0; col < cols; col++) {
            let start = 0;
            for (let row = 1; row <= rows; row++) {
                if (row < rows && sameFruit(board[row][col], board[start][col])) continue;
                if (row - start >= 3 && fruitOf(board[start][col])) {
                    const cells = [];
                    for (let k = start; k < row; k++) cells.push({ row: k, col });
                    runs.push({ fruit: fruitOf(board[start][col]), cells });
                }
                start = row;
            }
        }

        return runs;
    }

    // Runs that share a cell (L, T, cross shapes) are merged into one group.
    function findMatches(board) {
        const runs = findRuns(board);
        const parent = runs.map((_, index) => index);
        const find = index => (parent[index] === index ? index : (parent[index] = find(parent[index])));
        const owner = new Map();

        runs.forEach((run, index) => {
            run.cells.forEach(cell => {
                const key = cell.row + ',' + cell.col;
                if (owner.has(key)) {
                    parent[find(index)] = find(owner.get(key));
                } else {
                    owner.set(key, index);
                }
            });
        });

        const groups = new Map();
        runs.forEach((run, index) => {
            const rootIndex = find(index);
            if (!groups.has(rootIndex)) {
                groups.set(rootIndex, { fruit: run.fruit, cells: [], keys: new Set() });
            }
            const group = groups.get(rootIndex);
            run.cells.forEach(cell => {
                const key = cell.row + ',' + cell.col;
                if (!group.keys.has(key)) {
                    group.keys.add(key);
                    group.cells.push(cell);
                }
            });
        });

        return Array.from(groups.values()).map(group => ({ fruit: group.fruit, cells: group.cells }));
    }

    // Empties the cells, drops fruits down, and fills the top with new fruits.
    // New fruits are drawn column by column (left to right), bottom to top within a column.
    function clearAndCollapse(board, cells, rng, fruits) {
        const rows = board.length;
        const cols = board[0].length;
        const working = cloneBoard(board);
        cells.forEach(cell => {
            working[cell.row][cell.col] = null;
        });

        const next = working.map(row => row.slice());
        const falls = [];
        const spawns = [];

        // Closed cells stay put; fruit drops past them into the open cells below.
        for (let col = 0; col < cols; col++) {
            const open = [];
            for (let row = 0; row < rows; row++) {
                if (!isHole(working[row][col])) open.push(row);
            }

            let slot = open.length - 1;
            for (let index = open.length - 1; index >= 0; index--) {
                const row = open[index];
                const fruit = working[row][col];
                if (fruit === null) continue;
                const target = open[slot];
                next[target][col] = fruit;
                if (target !== row) {
                    falls.push({ from: { row, col }, to: { row: target, col }, fruit });
                }
                slot--;
            }

            const emptyCount = slot + 1;
            for (let index = slot; index >= 0; index--) {
                const row = open[index];
                const fruit = randomFruit(rng, fruits);
                next[row][col] = fruit;
                spawns.push({ to: { row, col }, fromRow: row - emptyCount, fruit });
            }
        }

        return { falls, spawns, board: next };
    }

    function cellKey(cell) {
        return `${cell.row},${cell.col}`;
    }

    // What a match of four or more leaves behind: a striped tile for a straight four, a crate for
    // a bent match, a rainbow for a straight five.
    function specialFor(group) {
        const cells = group.cells;
        if (cells.length < 4) return null;
        const sameRow = cells.every(cell => cell.row === cells[0].row);
        const sameCol = cells.every(cell => cell.col === cells[0].col);
        if (!sameRow && !sameCol) return 'crate';
        if (cells.length >= 5) return 'stock';
        return sameRow ? 'line-h' : 'line-v';
    }

    // The special lands where the player's own fruit ended up, or in the middle of the match.
    function bornCell(group, preferred) {
        const hit = preferred.find(cell => cell && group.cells.some(other => other.row === cell.row && other.col === cell.col));
        return hit || group.cells[Math.floor(group.cells.length / 2)];
    }

    function newSpecial(group, kind) {
        return kind === 'stock' ? withSpecial('', 'stock') : withSpecial(group.fruit, kind);
    }

    // Cells sold in one step, gathered by fruit so the money and the floats line up.
    function groupCells(board, cells) {
        const groups = [];
        cells.forEach(cell => {
            const fruit = fruitOf(board[cell.row][cell.col]);
            const group = groups.find(entry => entry.fruit === fruit);
            if (group) group.cells.push(cell);
            else groups.push({ fruit, cells: [cell] });
        });
        return groups;
    }

    function fullestFruit(board) {
        const counts = new Map();
        board.forEach(line => line.forEach(value => {
            const fruit = fruitOf(value);
            if (fruit) counts.set(fruit, (counts.get(fruit) || 0) + 1);
        }));
        const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
        return best ? best[0] : null;
    }

    // The cells a special sweeps when it goes off.
    function activationCells(board, cell) {
        const kind = specialOf(board[cell.row][cell.col]);
        if (kind === 'line-h') return board[cell.row].map((value, col) => ({ row: cell.row, col }));
        if (kind === 'line-v') return board.map((line, row) => ({ row, col: cell.col }));
        if (kind === 'crate') return cellsAround(board, cell, 1);
        if (kind === 'stock') {
            const fruit = fullestFruit(board);
            return [cell, ...(fruit ? cellsOfFruit(board, fruit) : [])];
        }
        return [cell];
    }

    // Any special caught in a clear goes off as well, and whatever that reaches can go off in turn.
    // `fired` comes back in the order they went off, so the screen can play them that way.
    function expandBlast(board, cells, spared = new Set()) {
        const chosen = new Map();
        const queue = [];
        const fired = [];
        const add = cell => {
            if (!isOpen(board, cell)) return;
            const key = cellKey(cell);
            if (chosen.has(key)) return;
            chosen.set(key, cell);
            const kind = specialOf(board[cell.row][cell.col]);
            if (!spared.has(key) && kind) {
                queue.push(cell);
                fired.push({ cell, kind });
            }
        };
        cells.forEach(add);
        while (queue.length > 0) {
            activationCells(board, queue.shift()).forEach(add);
        }
        return { cells: [...chosen.values()], fired };
    }

    function cascade(board, rng, fruits, startChain, preferred = [], specials = true) {
        const steps = [];
        let current = board;
        let chain = startChain;
        let groups = findMatches(current);
        let wanted = preferred;

        while (groups.length > 0) {
            const born = [];
            if (specials) {
                groups.forEach(group => {
                    const kind = specialFor(group);
                    if (kind) born.push({ cell: bornCell(group, wanted), kind, value: newSpecial(group, kind) });
                });
            }

            const seeded = cloneBoard(current);
            born.forEach(item => { seeded[item.cell.row][item.cell.col] = item.value; });
            const spared = new Set(born.map(item => cellKey(item.cell)));

            const matched = groups.flatMap(group => group.cells).filter(cell => !spared.has(cellKey(cell)));
            const blasted = expandBlast(seeded, matched, spared);
            const cleared = blasted.cells.filter(cell => !spared.has(cellKey(cell)));

            const result = clearAndCollapse(seeded, cleared, rng, fruits);
            steps.push({
                kind: 'match',
                chain,
                groups: groupCells(seeded, cleared),
                cleared,
                born,
                fired: blasted.fired,
                falls: result.falls,
                spawns: result.spawns,
                board: result.board
            });
            current = result.board;
            chain++;
            wanted = [];
            groups = findMatches(current);
        }

        return { steps, finalBoard: current };
    }

    // a: the cell the player dragged, b: the neighbor it was pushed into.
    function resolveMove(board, a, b, rng, fruits, specials = true) {
        if (!isOpen(board, a) || !isOpen(board, b) || !isAdjacent(a, b)) {
            return { valid: false };
        }
        const swappedBoard = swapCells(board, a, b);
        if (findMatches(swappedBoard).length === 0) {
            return { valid: false };
        }
        const { steps, finalBoard } = cascade(swappedBoard, rng, fruits, 1, [b, a], specials);
        return { valid: true, swappedBoard, steps, finalBoard };
    }

    function cellsOfFruit(board, fruit) {
        const cells = [];
        board.forEach((line, row) => line.forEach((value, col) => {
            if (fruitOf(value) === fruit) cells.push({ row, col });
        }));
        return cells;
    }

    function cellsAround(board, cell, radius) {
        const cells = [];
        for (let row = cell.row - radius; row <= cell.row + radius; row++) {
            for (let col = cell.col - radius; col <= cell.col + radius; col++) {
                if (inBounds(board, { row, col })) cells.push({ row, col });
            }
        }
        return cells;
    }

    // An item clears cells outright. The clear itself is chain 1, so whatever falls into place
    // afterwards pays the chain bonus from 2 up, exactly like the cascade after a swap.
    function resolveClear(board, cells, rng, fruits) {
        const seen = new Set();
        const cleared = cells.filter(cell => {
            const key = `${cell.row},${cell.col}`;
            if (!isOpen(board, cell) || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        if (cleared.length === 0) return { valid: false };

        const groups = groupCells(board, cleared);

        const collapsed = clearAndCollapse(board, cleared, rng, fruits);
        const first = {
            kind: 'item',
            born: [],
            fired: [],
            chain: 1,
            groups,
            cleared,
            falls: collapsed.falls,
            spawns: collapsed.spawns,
            board: collapsed.board
        };
        const after = cascade(collapsed.board, rng, fruits, 2);
        return { valid: true, steps: [first, ...after.steps], finalBoard: after.finalBoard };
    }

    // A tap sets a special off: everything it sweeps, plus whatever those specials sweep in turn.
    function blast(board, cell, rng, fruits) {
        const kind = inBounds(board, cell) ? specialOf(board[cell.row][cell.col]) : null;
        if (!kind) return { valid: false };
        const blasted = expandBlast(board, activationCells(board, cell));
        const result = resolveClear(board, blasted.cells, rng, fruits);
        if (!result.valid) return result;
        const tapped = item => item.cell.row === cell.row && item.cell.col === cell.col;
        result.steps[0].fired = [...blasted.fired.filter(tapped), ...blasted.fired.filter(item => !tapped(item))];
        return result;
    }

    // The swap that pops the most cells right away. Ties keep the first one found
    // (top to bottom, left to right, right neighbor before bottom neighbor).
    function findBestMove(board) {
        const rows = board.length;
        const cols = board[0].length;
        let best = null;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const a = { row, col };
                const neighbors = [{ row, col: col + 1 }, { row: row + 1, col }];
                neighbors.forEach(b => {
                    if (!isOpen(board, a) || !isOpen(board, b) || fruitOf(board[a.row][a.col]) === fruitOf(board[b.row][b.col])) return;
                    const groups = findMatches(swapCells(board, a, b));
                    const size = groups.reduce((sum, group) => sum + group.cells.length, 0);
                    if (size > 0 && (best === null || size > best.size)) {
                        best = { a, b, size };
                    }
                });
            }
        }

        return best;
    }

    function hasPossibleMove(board) {
        return findBestMove(board) !== null;
    }

    function pickFruits(rng, allFruits, count) {
        const pool = allFruits.slice();
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        return pool.slice(0, count);
    }

    // Requires at least 3 fruits so every cell has a fruit that does not complete a line.
    function createBoard(rng, fruits, cols, rows) {
        for (;;) {
            const board = [];
            for (let row = 0; row < rows; row++) {
                const line = [];
                board.push(line);
                for (let col = 0; col < cols; col++) {
                    const options = fruits.filter(fruit => {
                        const makesRow = col >= 2 && line[col - 1] === fruit && line[col - 2] === fruit;
                        const makesColumn = row >= 2 && board[row - 1][col] === fruit && board[row - 2][col] === fruit;
                        return !makesRow && !makesColumn;
                    });
                    line.push(randomFruit(rng, options));
                }
            }
            if (hasPossibleMove(board)) return board;
        }
    }

    function shuffle(board, rng) {
        const open = [];
        board.forEach((line, row) => line.forEach((value, col) => {
            if (!isHole(value)) open.push({ row, col });
        }));
        const values = open.map(cell => board[cell.row][cell.col]);

        for (let attempt = 0; attempt < 100; attempt++) {
            const items = values.slice();
            for (let i = items.length - 1; i > 0; i--) {
                const j = Math.floor(rng() * (i + 1));
                [items[i], items[j]] = [items[j], items[i]];
            }
            const next = cloneBoard(board);
            open.forEach((cell, index) => { next[cell.row][cell.col] = items[index]; });
            if (findMatches(next).length === 0 && hasPossibleMove(next)) return next;
        }

        return refillOpen(board, rng, Array.from(new Set(values.map(fruitOf).filter(Boolean))));
    }

    // Fresh fruit in every open cell, no lines, at least one move. The last resort for a stuck board.
    function refillOpen(board, rng, fruits) {
        for (;;) {
            const next = board.map(line => line.map(value => (isHole(value) ? HOLE : null)));
            next.forEach((line, row) => line.forEach((value, col) => {
                if (value === HOLE) return;
                const options = fruits.filter(fruit => !makesLine(next, { row, col }, fruit));
                next[row][col] = randomFruit(rng, options.length > 0 ? options : fruits);
            }));
            if (hasPossibleMove(next)) return next;
        }
    }

    // Sets a board in the middle of a cols x rows frame of closed cells (square if rows is left out).
    function frameBoard(board, cols, rows = cols) {
        const top = Math.floor((rows - board.length) / 2);
        const left = Math.floor((cols - board[0].length) / 2);
        const framed = [];
        for (let row = 0; row < rows; row++) {
            const line = [];
            for (let col = 0; col < cols; col++) {
                const inside = row >= top && row < top + board.length && col >= left && col < left + board[0].length;
                line.push(inside ? board[row - top][col - left] : HOLE);
            }
            framed.push(line);
        }
        return framed;
    }

    // Closed cells touching the open part of the board: the ones that may open next.
    function openableCells(board) {
        const cells = [];
        board.forEach((line, row) => line.forEach((value, col) => {
            if (!isHole(value)) return;
            const touching = [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dRow, dCol]) => isOpen(board, { row: row + dRow, col: col + dCol }));
            if (touching) cells.push({ row, col });
        }));
        return cells;
    }

    // Opens one closed cell next to the board and stocks it with a fruit that makes no line.
    function openCell(board, fruits, rng) {
        const candidates = openableCells(board);
        if (candidates.length === 0) return null;
        const cell = candidates[Math.floor(rng() * candidates.length)];
        const next = cloneBoard(board);
        next[cell.row][cell.col] = null;
        const options = fruits.filter(fruit => !makesLine(next, cell, fruit));
        next[cell.row][cell.col] = randomFruit(rng, options.length > 0 ? options : fruits);
        return { board: hasPossibleMove(next) ? next : shuffle(next, rng), cell };
    }

    // Opens every closed cell left, one after another, each touching the board as it opens.
    function openAll(board, fruits, rng) {
        let current = board;
        const cells = [];
        for (let opened = openCell(current, fruits, rng); opened; opened = openCell(current, fruits, rng)) {
            current = opened.board;
            cells.push(opened.cell);
        }
        return { board: current, cells };
    }

    function openCount(board) {
        return board.reduce((sum, line) => sum + line.filter(value => !isHole(value)).length, 0);
    }

    // True if putting `fruit` at `cell` would complete a line of 3 with the fruits already there.
    function makesLine(board, cell, fruit) {
        const same = (row, col) => row >= 0 && row < board.length && col >= 0 && col < board[0].length && fruitOf(board[row][col]) === fruit;
        const count = (dRow, dCol) => {
            let length = 0;
            while (same(cell.row + dRow * (length + 1), cell.col + dCol * (length + 1))) length++;
            return length;
        };
        return count(0, -1) + count(0, 1) >= 2 || count(-1, 0) + count(1, 0) >= 2;
    }

    // Grows the board for the next shop stage. Old fruits keep their places relative to each
    // other; new columns go to the right (and left, if two are added), new rows go on top.
    // Returns the new board and the cells that were added.
    function expandBoard(board, fruits, cols, rows, rng) {
        const oldRows = board.length;
        const oldCols = board[0].length;
        const addLeft = Math.floor((cols - oldCols) / 2);
        const addTop = rows - oldRows;
        const next = [];
        const added = [];

        for (let row = 0; row < rows; row++) {
            const line = [];
            for (let col = 0; col < cols; col++) {
                const oldRow = row - addTop;
                const oldCol = col - addLeft;
                if (oldRow >= 0 && oldRow < oldRows && oldCol >= 0 && oldCol < oldCols) {
                    line.push(board[oldRow][oldCol]);
                } else {
                    line.push(null);
                    added.push({ row, col });
                }
            }
            next.push(line);
        }

        added.forEach(cell => {
            const options = fruits.filter(fruit => !makesLine(next, cell, fruit));
            next[cell.row][cell.col] = randomFruit(rng, options.length > 0 ? options : fruits);
        });

        if (findMatches(next).length > 0 || !hasPossibleMove(next)) {
            return { board: shuffle(next, rng), added };
        }
        return { board: next, added };
    }

    const Board = {
        isAdjacent,
        findMatches,
        clearAndCollapse,
        cascade,
        resolveMove,
        cellsOfFruit,
        cellsAround,
        resolveClear,
        blast,
        fruitOf,
        specialOf,
        withSpecial,
        activationCells,
        HOLE,
        isHole,
        frameBoard,
        openableCells,
        openCell,
        openAll,
        openCount,
        findBestMove,
        hasPossibleMove,
        pickFruits,
        createBoard,
        shuffle,
        expandBoard
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Board;
    } else {
        root.Board = Board;
    }
})(typeof window !== 'undefined' ? window : globalThis);
