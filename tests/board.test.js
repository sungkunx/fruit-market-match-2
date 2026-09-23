const test = require('node:test');
const assert = require('node:assert/strict');
const Board = require('../board.js');
const { parseBoard, boardToLines, sequenceRng, seededRng, cellKeys } = require('./helpers.js');

test('isAdjacent is true only for up, down, left, right neighbors', () => {
    const center = { row: 2, col: 2 };
    assert.equal(Board.isAdjacent(center, { row: 1, col: 2 }), true);
    assert.equal(Board.isAdjacent(center, { row: 3, col: 2 }), true);
    assert.equal(Board.isAdjacent(center, { row: 2, col: 1 }), true);
    assert.equal(Board.isAdjacent(center, { row: 2, col: 3 }), true);
    assert.equal(Board.isAdjacent(center, { row: 1, col: 1 }), false);
    assert.equal(Board.isAdjacent(center, { row: 2, col: 4 }), false);
    assert.equal(Board.isAdjacent(center, { row: 2, col: 2 }), false);
});

test('findMatches finds a horizontal line of 3', () => {
    const groups = Board.findMatches(parseBoard(['aaab', 'cdec', 'dcfd']));
    assert.equal(groups.length, 1);
    assert.equal(groups[0].fruit, 'a');
    assert.deepEqual(cellKeys(groups[0].cells), ['0,0', '0,1', '0,2']);
});

test('findMatches finds a vertical line of 3', () => {
    const groups = Board.findMatches(parseBoard(['abc', 'ade', 'afg']));
    assert.equal(groups.length, 1);
    assert.deepEqual(cellKeys(groups[0].cells), ['0,0', '1,0', '2,0']);
});

test('findMatches finds lines of 4 and 5', () => {
    assert.equal(Board.findMatches(parseBoard(['aaaab']))[0].cells.length, 4);
    assert.equal(Board.findMatches(parseBoard(['aaaaa']))[0].cells.length, 5);
});

test('findMatches merges an L shape into one group without double counting', () => {
    const groups = Board.findMatches(parseBoard(['abc', 'ade', 'aaa']));
    assert.equal(groups.length, 1);
    assert.deepEqual(cellKeys(groups[0].cells), ['0,0', '1,0', '2,0', '2,1', '2,2']);
});

test('findMatches merges a T shape into one group', () => {
    const groups = Board.findMatches(parseBoard(['aaa', 'bac', 'dae']));
    assert.equal(groups.length, 1);
    assert.equal(groups[0].cells.length, 5);
});

test('findMatches keeps separate lines as separate groups', () => {
    const groups = Board.findMatches(parseBoard(['aaab', 'cdef', 'gbbb']));
    assert.equal(groups.length, 2);
    assert.deepEqual(groups.map(group => group.fruit).sort(), ['a', 'b']);
});

test('findMatches returns an empty list when nothing lines up', () => {
    assert.deepEqual(Board.findMatches(parseBoard(['abc', 'bca', 'cab'])), []);
});

test('clearAndCollapse drops fruits and fills from the top', () => {
    const board = parseBoard(['ab', 'cd', 'ef']);
    const result = Board.clearAndCollapse(
        board,
        [{ row: 2, col: 0 }, { row: 1, col: 1 }],
        sequenceRng([0, 0.5]),
        ['x', 'y']
    );

    assert.deepEqual(boardToLines(result.board), ['xy', 'ab', 'cf']);
    assert.deepEqual(result.falls, [
        { from: { row: 1, col: 0 }, to: { row: 2, col: 0 }, fruit: 'c' },
        { from: { row: 0, col: 0 }, to: { row: 1, col: 0 }, fruit: 'a' },
        { from: { row: 0, col: 1 }, to: { row: 1, col: 1 }, fruit: 'b' }
    ]);
    assert.deepEqual(result.spawns, [
        { to: { row: 0, col: 0 }, fromRow: -1, fruit: 'x' },
        { to: { row: 0, col: 1 }, fromRow: -1, fruit: 'y' }
    ]);
    assert.deepEqual(boardToLines(board), ['ab', 'cd', 'ef']);
});

// Swapping (3,1) 'a' up into (2,1) makes "aaa" on row 2.
// After it pops, the three 'k's in column 0 fall into a vertical line and pop as chain 2.
const CHAIN_BOARD = ['kqm', 'kno', 'aba', 'kad', 'efg'];
const CHAIN_FRUITS = ['x', 'y', 'z'];
const chainRng = () => sequenceRng([0, 0.4, 0.7]);

test('resolveMove rejects cells that are not neighbors', () => {
    const board = parseBoard(CHAIN_BOARD);
    const result = Board.resolveMove(board, { row: 0, col: 0 }, { row: 0, col: 2 }, chainRng(), CHAIN_FRUITS);
    assert.deepEqual(result, { valid: false });
});

test('resolveMove rejects a swap that makes no match', () => {
    const board = parseBoard(CHAIN_BOARD);
    const result = Board.resolveMove(board, { row: 0, col: 1 }, { row: 0, col: 2 }, chainRng(), CHAIN_FRUITS);
    assert.deepEqual(result, { valid: false });
});

test('resolveMove plays out the full chain reaction', () => {
    const board = parseBoard(CHAIN_BOARD);
    const result = Board.resolveMove(board, { row: 3, col: 1 }, { row: 2, col: 1 }, chainRng(), CHAIN_FRUITS);

    assert.equal(result.valid, true);
    assert.deepEqual(boardToLines(result.swappedBoard), ['kqm', 'kno', 'aaa', 'kbd', 'efg']);
    assert.equal(result.steps.length, 2);

    const [first, second] = result.steps;
    assert.equal(first.kind, 'match');
    assert.equal(first.chain, 1);
    assert.equal(first.groups.length, 1);
    assert.equal(first.groups[0].fruit, 'a');
    assert.deepEqual(cellKeys(first.cleared), ['2,0', '2,1', '2,2']);
    assert.deepEqual(boardToLines(first.board), ['xyz', 'kqm', 'kno', 'kbd', 'efg']);
    assert.deepEqual(first.spawns, [
        { to: { row: 0, col: 0 }, fromRow: -1, fruit: 'x' },
        { to: { row: 0, col: 1 }, fromRow: -1, fruit: 'y' },
        { to: { row: 0, col: 2 }, fromRow: -1, fruit: 'z' }
    ]);

    assert.equal(second.kind, 'match');
    assert.equal(second.chain, 2);
    assert.equal(second.groups[0].fruit, 'k');
    assert.deepEqual(cellKeys(second.cleared), ['1,0', '2,0', '3,0']);
    assert.deepEqual(second.falls, [{ from: { row: 0, col: 0 }, to: { row: 3, col: 0 }, fruit: 'x' }]);
    assert.deepEqual(second.spawns, [
        { to: { row: 2, col: 0 }, fromRow: -1, fruit: 'x' },
        { to: { row: 1, col: 0 }, fromRow: -2, fruit: 'y' },
        { to: { row: 0, col: 0 }, fromRow: -3, fruit: 'z' }
    ]);

    assert.deepEqual(boardToLines(result.finalBoard), ['zyz', 'yqm', 'xno', 'xbd', 'efg']);
    assert.deepEqual(boardToLines(board), CHAIN_BOARD);
});

test('findBestMove picks the swap that pops the most cells', () => {
    const board = parseBoard(['abaac', 'difgh', 'ijiik', 'lmnop']);
    assert.deepEqual(Board.findBestMove(board), { a: { row: 1, col: 1 }, b: { row: 2, col: 1 }, size: 4 });
});

test('findBestMove keeps the first move found on a tie', () => {
    const board = parseBoard(['abaa', 'ecee']);
    assert.deepEqual(Board.findBestMove(board), { a: { row: 0, col: 0 }, b: { row: 0, col: 1 }, size: 3 });
});

test('findBestMove returns null and hasPossibleMove is false when no swap matches', () => {
    const board = parseBoard(['abcd', 'cdab', 'abcd']);
    assert.equal(Board.findBestMove(board), null);
    assert.equal(Board.hasPossibleMove(board), false);
    assert.equal(Board.hasPossibleMove(parseBoard(['abaa'])), true);
});

test('pickFruits returns the requested number of distinct fruits', () => {
    const all = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const picked = Board.pickFruits(seededRng(1), all, 6);
    assert.equal(picked.length, 6);
    assert.equal(new Set(picked).size, 6);
    picked.forEach(fruit => assert.ok(all.includes(fruit)));
});

test('createBoard makes a board of the given size with no matches and at least one move', () => {
    const sizes = [[5, 5, 3], [6, 5, 4], [6, 6, 5], [6, 7, 6], [7, 7, 7]];
    sizes.forEach(([cols, rows, fruitCount]) => {
        const fruits = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].slice(0, fruitCount);
        for (let seed = 1; seed <= 10; seed++) {
            const board = Board.createBoard(seededRng(seed), fruits, cols, rows);
            assert.equal(board.length, rows);
            board.forEach(row => assert.equal(row.length, cols));
            board.flat().forEach(fruit => assert.ok(fruits.includes(fruit)));
            assert.deepEqual(Board.findMatches(board), []);
            assert.equal(Board.hasPossibleMove(board), true);
        }
    });
});

test('shuffle keeps the same fruits, leaves no matches, and has a move', () => {
    const fruits = ['a', 'b', 'c', 'd', 'e', 'f'];
    const countFruits = board => board.flat().sort().join('');
    for (let seed = 1; seed <= 10; seed++) {
        const board = Board.createBoard(seededRng(seed), fruits, 7, 8);
        const shuffled = Board.shuffle(board, seededRng(seed + 100));
        assert.equal(countFruits(shuffled), countFruits(board));
        assert.deepEqual(Board.findMatches(shuffled), []);
        assert.equal(Board.hasPossibleMove(shuffled), true);
    }
});

test('expandBoard adds a column on the right and keeps every old fruit in place', () => {
    const board = parseBoard(['ccaba', 'bcbca', 'cbbab', 'acacc', 'aacaa']);
    const { board: grown, added } = Board.expandBoard(board, ['a', 'b', 'c', 'd'], 6, 5, seededRng(9));
    assert.equal(grown.length, 5);
    grown.forEach(row => assert.equal(row.length, 6));
    assert.deepEqual(grown.map(row => row.slice(0, 5).join('')), boardToLines(board));
    assert.deepEqual(cellKeys(added), cellKeys([0, 1, 2, 3, 4].map(row => ({ row, col: 5 }))));
});

test('expandBoard adds new rows on top and splits two new columns left and right', () => {
    const board = parseBoard(['ccaba', 'bcbca', 'cbbab', 'acacc', 'aacaa']);
    const { board: grown, added } = Board.expandBoard(board, ['a', 'b', 'c', 'd'], 7, 7, seededRng(9));
    assert.equal(grown.length, 7);
    grown.forEach(row => assert.equal(row.length, 7));
    assert.deepEqual(grown.slice(2).map(row => row.slice(1, 6).join('')), boardToLines(board));
    assert.equal(added.length, 49 - 25);
    added.forEach(cell => assert.ok(cell.row < 2 || cell.col === 0 || cell.col === 6));
});

test('expandBoard never leaves a line and always leaves a move (property test)', () => {
    const all = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const steps = [[5, 5, 3], [6, 5, 4], [6, 6, 4], [6, 6, 5], [6, 7, 6], [7, 7, 7]];
    for (let seed = 1; seed <= 30; seed++) {
        const rng = seededRng(seed);
        let board = Board.createBoard(rng, all.slice(0, 3), 5, 5);
        steps.slice(1).forEach(([cols, rows, fruitCount]) => {
            const fruits = all.slice(0, fruitCount);
            const { board: grown, added } = Board.expandBoard(board, fruits, cols, rows, rng);
            assert.equal(grown.length, rows);
            grown.forEach(row => assert.equal(row.length, cols));
            assert.equal(added.length, cols * rows - board.length * board[0].length);
            grown.flat().forEach(fruit => assert.ok(fruits.includes(fruit)));
            assert.deepEqual(Board.findMatches(grown), []);
            assert.equal(Board.hasPossibleMove(grown), true);
            board = grown;
        });
    }
});

// The UI's animateFalls only rewrites destination cells, so every step returned by
// resolveMove must obey this contract: starting from the board before the step
// (swappedBoard for step 0, the previous step's board afterwards), clearing every
// `cleared` cell to null and then applying `falls` and `spawns` (read source values
// from the pre-step board, write them into a result grid) must reproduce `step.board`
// exactly, with every other cell unchanged.
function replayStep(preBoard, step) {
    // A step first leaves its new specials on the board, then clears around them.
    const seeded = preBoard.map(row => row.slice());
    (step.born || []).forEach(item => {
        seeded[item.cell.row][item.cell.col] = item.value;
    });

    const result = seeded.map(row => row.slice());
    const clearedKeys = new Set();

    step.cleared.forEach(cell => {
        const key = `${cell.row},${cell.col}`;
        assert.equal(clearedKeys.has(key), false, `cell ${key} cleared twice in one step`);
        clearedKeys.add(key);
        result[cell.row][cell.col] = null;
    });

    const filledKeys = new Set();
    step.falls.forEach(fall => {
        result[fall.to.row][fall.to.col] = seeded[fall.from.row][fall.from.col];
        filledKeys.add(`${fall.to.row},${fall.to.col}`);
    });
    step.spawns.forEach(spawn => {
        result[spawn.to.row][spawn.to.col] = spawn.fruit;
        filledKeys.add(`${spawn.to.row},${spawn.to.col}`);
    });

    clearedKeys.forEach(key => {
        assert.ok(filledKeys.has(key), `cleared cell ${key} was never refilled by a fall or spawn`);
    });

    return result;
}

test('resolveMove steps replay correctly for many random games (property test)', () => {
    const fruits = ['a', 'b', 'c', 'd', 'e', 'f'];
    const seedCount = 40;
    const maxMoves = 20;

    for (let seed = 1; seed <= seedCount; seed++) {
        const rng = seededRng(seed);
        let board = Board.createBoard(rng, fruits, 7, 8);

        for (let moveIndex = 0; moveIndex < maxMoves; moveIndex++) {
            const move = Board.findBestMove(board);
            if (!move) {
                board = Board.shuffle(board, rng);
                continue;
            }

            const result = Board.resolveMove(board, move.a, move.b, rng, fruits);
            assert.equal(result.valid, true, `seed ${seed} move ${moveIndex}: expected a valid move`);
            assert.ok(result.steps.length > 0, `seed ${seed} move ${moveIndex}: expected at least one step`);

            let preBoard = result.swappedBoard;
            result.steps.forEach((step, index) => {
                assert.equal(step.kind, 'match');
                assert.equal(step.chain, index + 1);
                const replayed = replayStep(preBoard, step);
                assert.deepEqual(replayed, step.board, `seed ${seed} move ${moveIndex} step ${index}: replay mismatch`);
                preBoard = step.board;
            });

            assert.deepEqual(result.finalBoard, result.steps[result.steps.length - 1].board);
            assert.deepEqual(Board.findMatches(result.finalBoard), []);

            board = result.finalBoard;
        }
    }
});

test('cellsOfFruit lists every cell holding that fruit', () => {
    const board = parseBoard(['abc', 'bab', 'cba']);
    assert.deepEqual(cellKeys(Board.cellsOfFruit(board, 'a')), ['0,0', '1,1', '2,2']);
    assert.deepEqual(Board.cellsOfFruit(board, 'z'), []);
});

test('cellsAround covers the square around a cell and stops at the edges', () => {
    const board = parseBoard(['abcd', 'efgh', 'ijkl', 'mnop']);
    assert.equal(Board.cellsAround(board, { row: 1, col: 1 }, 1).length, 9);
    assert.deepEqual(cellKeys(Board.cellsAround(board, { row: 0, col: 0 }, 1)), ['0,0', '0,1', '1,0', '1,1']);
    assert.equal(Board.cellsAround(board, { row: 3, col: 3 }, 1).length, 4);
});

test('resolveClear sells the cells it was given and keeps the cascade going from chain 2', () => {
    // Clearing the lone b lets the a's below fall into a line of three, which scores as chain 2.
    const board = parseBoard(['apq', 'bqp', 'apq', 'aqp']);
    const result = Board.resolveClear(board, [{ row: 1, col: 0 }], sequenceRng([0, 0.9]), ['p', 'q']);

    assert.equal(result.valid, true);
    assert.equal(result.steps.length, 2);
    assert.equal(result.steps[0].kind, 'item');
    assert.equal(result.steps[0].chain, 1);
    assert.deepEqual(result.steps[0].groups, [{ fruit: 'b', cells: [{ row: 1, col: 0 }] }]);
    assert.equal(result.steps[1].chain, 2);
    assert.equal(result.steps[1].groups[0].fruit, 'a');
    assert.deepEqual(result.finalBoard, result.steps[1].board);
    assert.deepEqual(Board.findMatches(result.finalBoard), []);
});

test('resolveClear groups the cleared cells by fruit and ignores repeats and cells off the board', () => {
    const board = parseBoard(['ab', 'ba']);
    const result = Board.resolveClear(board, [{ row: 0, col: 0 }, { row: 0, col: 0 }, { row: 1, col: 1 }, { row: 9, col: 9 }], seededRng(2), ['a', 'b']);
    assert.deepEqual(result.steps[0].groups, [{ fruit: 'a', cells: [{ row: 0, col: 0 }, { row: 1, col: 1 }] }]);
    assert.equal(result.steps[0].cleared.length, 2);
});

test('resolveClear refuses an empty clear', () => {
    assert.deepEqual(Board.resolveClear(parseBoard(['ab', 'ba']), [{ row: 5, col: 5 }], seededRng(1), ['a', 'b']), { valid: false });
});

test('a straight four leaves a striped tile where the player moved, pointing the way the four lay', () => {
    // Pushing the a at (1,2) up completes four a's across row 0.
    const board = parseBoard(['aaba', 'ccad', 'bdcb', 'cbad']);
    const moved = { row: 0, col: 2 };
    const result = Board.resolveMove(board, { row: 1, col: 2 }, moved, sequenceRng([0.1, 0.6, 0.35, 0.85]), ['b', 'c', 'd']);

    assert.equal(result.valid, true);
    assert.deepEqual(result.steps[0].born.map(item => item.kind), ['line-h']);
    assert.deepEqual(result.steps[0].born[0].cell, moved);
    assert.equal(Board.specialOf(result.steps[0].board[moved.row][moved.col]), 'line-h');
    assert.equal(Board.fruitOf(result.steps[0].board[moved.row][moved.col]), 'a');
});

test('a bent match leaves a crate and a straight five leaves the rainbow', () => {
    assert.equal(Board.specialOf(Board.withSpecial('a', 'crate')), 'crate');
    assert.equal(Board.fruitOf(Board.withSpecial('a', 'crate')), 'a');
    assert.equal(Board.fruitOf(Board.withSpecial('', 'stock')), '');
});

test('the rainbow never joins a match, so two of them sitting together stay put', () => {
    const rainbow = Board.withSpecial('', 'stock');
    const board = [[rainbow, rainbow, rainbow], ['a', 'b', 'a'], ['b', 'a', 'b']];
    assert.deepEqual(Board.findMatches(board), []);
});

test('a tap on a striped tile sells its whole row, and on a crate its 3x3', () => {
    const board = parseBoard(['abcde', 'fabcd', 'efabc', 'defab', 'cdefa']);
    board[2][2] = Board.withSpecial('a', 'line-h');
    const row = Board.blast(board, { row: 2, col: 2 }, seededRng(3), ['x', 'y', 'z']);
    assert.equal(row.valid, true);
    assert.equal(row.steps[0].cleared.length, 5);
    assert.ok(row.steps[0].cleared.every(cell => cell.row === 2));

    const crated = parseBoard(['abcde', 'fabcd', 'efabc', 'defab', 'cdefa']);
    crated[2][2] = Board.withSpecial('a', 'crate');
    const blast = Board.blast(crated, { row: 2, col: 2 }, seededRng(3), ['x', 'y', 'z']);
    assert.equal(blast.steps[0].cleared.length, 9);
});

test('the rainbow sells whichever fruit the board holds most of', () => {
    const board = parseBoard(['aaab', 'aaab', 'aaab', 'bbbb']);
    board[0][3] = Board.withSpecial('', 'stock');
    const result = Board.blast(board, { row: 0, col: 3 }, seededRng(5), ['x', 'y']);
    // Nine a's plus the rainbow itself.
    assert.equal(result.steps[0].cleared.length, 10);
});

test('a special caught in a blast goes off too', () => {
    const board = parseBoard(['abcde', 'fabcd', 'efabc', 'defab', 'cdefa']);
    board[2][2] = Board.withSpecial('a', 'line-h');
    board[2][4] = Board.withSpecial('c', 'line-v');
    const result = Board.blast(board, { row: 2, col: 2 }, seededRng(7), ['x', 'y', 'z']);
    // The row of five plus the column the second special sweeps, minus the cell they share.
    assert.equal(result.steps[0].cleared.length, 9);
});

test('activationCells on a plain fruit is just that cell', () => {
    const board = parseBoard(['ab', 'ba']);
    assert.deepEqual(Board.activationCells(board, { row: 0, col: 0 }), [{ row: 0, col: 0 }]);
    assert.deepEqual(Board.blast(board, { row: 0, col: 0 }, seededRng(1), ['a', 'b']), { valid: false });
});

test('a blast reports every special it set off, the tapped one first', () => {
    const board = parseBoard(['abcde', 'fabcd', 'efabc', 'defab', 'cdefa']);
    board[2][2] = Board.withSpecial('a', 'line-h');
    board[2][4] = Board.withSpecial('c', 'line-v');
    const result = Board.blast(board, { row: 2, col: 2 }, seededRng(7), ['x', 'y', 'z']);

    assert.deepEqual(result.steps[0].fired.map(item => item.kind), ['line-h', 'line-v']);
    assert.deepEqual(result.steps[0].fired[0].cell, { row: 2, col: 2 });
    assert.deepEqual(result.steps[0].fired[1].cell, { row: 2, col: 4 });
});

test('a match that sweeps up a special sets it off and says so', () => {
    // Pushing the striped tile into the pair of a's makes a three, and the stripe goes off with it.
    const board = parseBoard(['aab', 'ccd', 'def', 'fed']);
    board[1][2] = Board.withSpecial('a', 'line-v');
    const result = Board.resolveMove(board, { row: 1, col: 2 }, { row: 0, col: 2 }, seededRng(11), ['b', 'c', 'd'], false);

    assert.equal(result.valid, true);
    assert.deepEqual(result.steps[0].fired.map(item => item.kind), ['line-v']);
    // The whole column went with it, not just the three in the row.
    assert.ok(result.steps[0].cleared.length >= 3 + board.length - 1);
});

// Closed cells of the 7x7 frame are written '#' in these boards.
test('frameBoard sets the starting board in the middle of a frame of closed cells', () => {
    const framed = Board.frameBoard(parseBoard(['abc', 'bca', 'cab']), 5);
    assert.deepEqual(boardToLines(framed), ['#####', '#abc#', '#bca#', '#cab#', '#####']);
    assert.equal(Board.openCount(framed), 9);
});

test('a closed cell breaks a line, so fruit on both sides of it never match', () => {
    assert.deepEqual(Board.findMatches(parseBoard(['aa#a', 'bcbc'])), []);
});

test('fruit falls past a closed cell into the open cell below it', () => {
    // Column 0 from the top: x, closed, y, z. Selling z drops y one row and x past the hole.
    const board = parseBoard(['xb', '#c', 'yb', 'zc']);
    const result = Board.clearAndCollapse(board, [{ row: 3, col: 0 }], sequenceRng([0]), ['q']);
    assert.deepEqual(result.board.map(line => line[0]), ['q', '#', 'x', 'y']);
    assert.deepEqual(result.falls.map(fall => [fall.from.row, fall.to.row]), [[2, 3], [0, 2]]);
});

test('a swap into a closed cell is refused', () => {
    const board = parseBoard(['aab', '#ca', 'bcb']);
    assert.deepEqual(Board.resolveMove(board, { row: 0, col: 0 }, { row: 1, col: 0 }, seededRng(1), ['a', 'b', 'c']), { valid: false });
});

test('shuffling moves the fruit around but leaves every closed cell where it was', () => {
    const board = Board.frameBoard(Board.createBoard(seededRng(4), ['a', 'b', 'c', 'd'], 5, 5), 7);
    const shuffled = Board.shuffle(board, seededRng(9));
    board.forEach((line, row) => line.forEach((value, col) => {
        assert.equal(Board.isHole(shuffled[row][col]), Board.isHole(value), `cell ${row},${col}`);
    }));
    assert.deepEqual(Board.findMatches(shuffled), []);
});

test('openCell opens one closed cell touching the board, without making a line', () => {
    let board = Board.frameBoard(Board.createBoard(seededRng(6), ['a', 'b', 'c', 'd'], 5, 5), 7);
    for (let step = 0; step < 24; step++) {
        const before = Board.openCount(board);
        const opened = Board.openCell(board, ['a', 'b', 'c', 'd'], seededRng(100 + step));
        assert.ok(opened, `step ${step}: a cell should open`);
        const { row, col } = opened.cell;
        assert.equal(Board.isHole(board[row][col]), true, 'it was closed before');
        const touching = [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dr, dc]) => board[row + dr] && board[row + dr][col + dc] !== undefined && !Board.isHole(board[row + dr][col + dc]));
        assert.ok(touching, 'it touches the open board');
        board = opened.board;
        assert.equal(Board.openCount(board), before + 1);
        assert.deepEqual(Board.findMatches(board), []);
    }
    assert.equal(Board.openCount(board), 49);
    assert.equal(Board.openCell(board, ['a', 'b'], seededRng(1)), null, 'a full board has nothing left to open');
});

test('a striped tile sweeps only the open cells of its row', () => {
    const board = parseBoard(['#abc#', 'bcabc', 'cabca']);
    board[0][2] = Board.withSpecial('b', 'line-h');
    const result = Board.blast(board, { row: 0, col: 2 }, seededRng(3), ['x', 'y', 'z']);
    assert.equal(result.steps[0].cleared.length, 3);
    assert.equal(Board.isHole(result.finalBoard[0][0]), true);
    assert.equal(Board.isHole(result.finalBoard[0][4]), true);
});
