# 성장형 과일가게 1단계 (코어 경제 루프) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 30초 타임어택 게임을, 매치로 벌고 비용으로 새고 투자로 가게를 7단계까지 키우는 타이머 없는 경제 생존 게임으로 바꾼다.

**Architecture:** 규칙은 DOM 없는 순수 모듈로 둔다: `tuning.js`(모든 수치), `scoring.js`(매출 산식·배율), `board.js`(크기 지정 생성·`expandBoard`), `economy.js`(비용·투자·엔딩, 상태를 받아 새 상태를 돌려줌). `js_file.js`는 0.1초마다 `Economy.tick`을 부르고 화면을 그리는 컨트롤러로 다시 쓴다. `tools/sim.js`는 같은 모듈로 봇 플레이를 돌려 밸런스를 확인한다.

**Tech Stack:** 빌드 도구 없는 HTML/CSS/JavaScript, Web Audio API(기존 `audio.js`), Node 내장 `node:test` (v24.7.0), Google Fonts `Fredoka` + `Jua`, Firebase Firestore(기존 `firebase-config.js`)

**Spec:** `docs/superpowers/specs/2026-09-19-growth-mode-phase1-design.md`

## Global Constraints

- npm 패키지·빌드 도구를 추가하지 않는다. `package.json`도 만들지 않는다.
- 규칙 모듈(`tuning.js`, `scoring.js`, `board.js`, `economy.js`)은 기존 형식을 따른다: IIFE, 일반 `<script>`로 로드, 브라우저에서는 `window.X`, Node에서는 `module.exports`. DOM에 접근하지 않는다.
- 브라우저 로드 순서: `firebase-config.js`(module) → `audio.js` → `board.js` → `scoring.js` → `tuning.js` → `economy.js` → `js_file.js`. `economy.js`는 브라우저에서 `window.Scoring`을 쓴다.
- 모든 수치는 `tuning.js`에만 둔다. 다른 파일에 숫자를 하드코딩하지 않는다(애니메이션 시간·레이아웃 픽셀은 예외).
- 테스트는 `tuning.js`를 쓰지 않고 테스트 파일 안의 고정 수치를 쓴다. 튜닝을 바꿔도 테스트가 깨지지 않게 하기 위해서다.
- 새로 추가하는 게임 화면 문구는 한국어로 쓴다. 금액은 `toLocaleString('ko-KR')` 형식(예: `1,300`)이고, 빼는 금액은 유니코드 마이너스 `−`를 쓴다.
- `js_file.js`는 4칸 들여쓰기, 세미콜론을 쓴다. 기존 한국어 주석은 그대로 둔다.
- 색은 `css_file.css` 맨 위 `:root` 변수만 쓴다. 새 색이 필요하면 `:root`에 변수를 추가한다.
- 1번 태스크부터 5번 태스크 전까지는 브라우저 게임이 동작하지 않는다(옛 컨트롤러가 바뀐 `scoring.js`를 쓰기 때문). 이 구간에서는 `node --test tests/*.test.js`만 통과하면 된다.
- `sw.js`, 앱 아이콘, 랭킹 이름 XSS는 건드리지 않는다.
- 기존 Firebase 컬렉션 `rankings_YYYY_MM`과 로컬 키 `fruitMarketData`는 읽지도 쓰지도 지우지도 않는다.
- **브라우저 확인은 항상 음소거로 한다.** 게임을 시작하기 전에 콘솔에서 `GameAudio.setMuted(true); updateSoundButtons();`를 부르고, 확인이 끝나면 서버를 멈추고 열었던 탭을 닫는다.
- 모든 커밋 메시지 끝에 아래 줄을 넣는다.
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  ```

## 파일 구조

| 파일 | 작업 | 태스크 |
|---|---|---|
| `tuning.js` (신규) | 단계 표와 모든 수치 | 1 |
| `scoring.js` | 매출 산식(`matchStepRevenue`), 배율 상한, `decayMultiplier`. `baseScore`·시간 보너스 삭제 | 1 |
| `tests/scoring.test.js` | 새 산식 테스트로 교체 | 1 |
| `board.js` | `createBoard(rng, fruits, cols, rows)`, `expandBoard`, `ROWS`/`COLS` 삭제 | 2 |
| `tests/board.test.js` | 크기 지정 생성, `expandBoard` 테스트 | 2 |
| `economy.js` (신규) | 비용·매출·투자·엔딩 | 3 |
| `tests/economy.test.js` (신규) | 경제 규칙 테스트 | 3 |
| `tools/sim.js` (신규) | 봇 플레이 시뮬레이터 | 4 |
| `index.html` | 글꼴, 가게 영역·계기판·보드 프레임·일시정지 / 확장 버튼·투자 시트 / 결과 화면·시작 화면·게임 방법 | 5, 6, 7 |
| `css_file.css` | 새 레이아웃·건물 그래픽 / 확장 버튼·시트 / 결과 화면 | 5, 6, 7 |
| `js_file.js` | 컨트롤러 재작성 / 투자 / 결과·저장·랭킹 | 5, 6, 7 |

## 브라우저 확인 방법 (5, 6, 7번 태스크 공통)

- 미리보기 도구가 있으면 `.claude/launch.json`의 `fruit-market`(포트 8766)을 띄운다. 없으면 프로젝트 폴더에서 이전에 쓰지 않은 포트로 서버를 띄운다: `python3 -m http.server 8793`.
- 모바일 크기(375×812)로 맞춘다.
- 게임을 시작하기 전에 콘솔에서 음소거를 건다: `GameAudio.setMuted(true); updateSoundButtons();`
- 시작 버튼 대신 콘솔에서 `startGame()`을 불러도 된다. 카운트다운 2초 뒤 게임이 시작된다.
- 빠른 확인용 콘솔 조작(전역 `run`을 바꾼 뒤 화면을 다시 그린다):
  - 돈 넣기: `run = { ...run, cash: 5000 }; updateDashboard();`
  - 파산 직전: `run = { ...run, cash: 3 }; updateDashboard();`
  - 백화점으로 바로 가기: `run = { ...run, stage: 6, cash: 5000000 }; newBoard(6); updateStage(); updateDashboard();` (6번 태스크 이후)
- 브라우저 탭이 숨겨져 있으면 애니메이션이 멈춘다. 그때는 `window.animate = () => wait(300)`으로 대신하고 보고서에 적는다.
- 콘솔의 `sw.js` 관련 404·서비스 워커 오류는 기존 문제이므로 무시한다. `img/building_N.png` 404도 이미지가 아직 없어서 나는 것이므로 무시한다(단계마다 최대 한 번).
- 확인이 끝나면 서버를 멈추고 열었던 탭을 닫는다.

---

### Task 1: 수치 파일과 새 매출 산식

**Files:**
- Create: `tuning.js`
- Modify: `scoring.js` (전체 교체)
- Test: `tests/scoring.test.js` (전체 교체)

**Interfaces:**
- Consumes: 없음
- Produces:
  - `Tuning` 객체 (브라우저 `window.Tuning`, Node `require('../tuning.js')`). 필드: `startCash`, `fruitOrder: string[7]`, `frameSize`, `stages: { name, cols, rows, fruits, price, rent, logistics, expandCost }[7]`(마지막 단계의 `expandCost`는 `null`), `inflationRate`, `inflationInterval`, `surchargeStage`, `surchargeRate`, `surchargeInterval`, `laborPerSwap`, `logisticsInterval`, `sameFruitBonus`, `otherFruitBonus`, `maxMultiplier`, `multiplierDecay`, `dangerSeconds`, `clearCashMultiplier`, `leaderboardMinScore`.
  - `Scoring.createScoreState() → { multiplier, comboCount, lastMatchedFruit }`
  - `Scoring.matchStepRevenue(step, price, multiplier) → number` (정수)
  - `Scoring.scoreMove(result, state, movedFruit, displacedFruit, price, rules) → { total, stepScores: number[], isCombo, state }` — `rules`는 `sameFruitBonus`, `otherFruitBonus`, `maxMultiplier`를 가진 객체(`Tuning`을 그대로 넘겨도 된다)
  - `Scoring.decayMultiplier(multiplier, seconds, rate) → number`

- [ ] **Step 1: 현재 버전에 태그 달기**

```bash
git tag v1-timeattack
git tag --list v1-timeattack
```

Expected: `v1-timeattack`이 출력된다. 원격 저장소에 올리지 않는다.

- [ ] **Step 2: `tests/scoring.test.js`를 새 산식 테스트로 전체 교체**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const Scoring = require('../scoring.js');

const RULES = { sameFruitBonus: 0.3, otherFruitBonus: 0.1, maxMultiplier: 3 };

// Builds a group with `size` placeholder cells.
function group(fruit, size) {
    return { fruit, cells: Array.from({ length: size }, (_, col) => ({ row: 0, col })) };
}

function step(chain, groups) {
    return { kind: 'match', chain, groups };
}

function validResult(steps) {
    return { valid: true, steps };
}

function state(multiplier, comboCount, lastMatchedFruit) {
    return { multiplier, comboCount, lastMatchedFruit };
}

test('createScoreState starts at x1.0 with no combo', () => {
    assert.deepEqual(Scoring.createScoreState(), state(1.0, 0, null));
});

test('matchStepRevenue multiplies fruits sold by price, chain, and multiplier, then floors', () => {
    assert.equal(Scoring.matchStepRevenue(step(1, [group('a', 3)]), 2, 1.0), 6);
    assert.equal(Scoring.matchStepRevenue(step(2, [group('a', 4)]), 5, 1.5), 60);
    assert.equal(Scoring.matchStepRevenue(step(1, [group('a', 3), group('b', 3)]), 10, 1.25), 75);
    assert.equal(Scoring.matchStepRevenue(step(1, [group('a', 3)]), 1, 1.333), 3);
});

test('scoreMove adds up every step using the multiplier from before the move', () => {
    const result = validResult([step(1, [group('apple', 4)]), step(2, [group('kiwi', 3)])]);
    const scored = Scoring.scoreMove(result, state(1.5, 0, null), 'apple', 'kiwi', 10, RULES);
    assert.deepEqual(scored.stepScores, [60, 90]);
    assert.equal(scored.total, 150);
});

test('scoreMove gives the other-fruit bonus and restarts the combo count for a different fruit', () => {
    const result = validResult([step(1, [group('apple', 3)])]);
    const scored = Scoring.scoreMove(result, state(2.0, 3, 'kiwi'), 'apple', 'kiwi', 1, RULES);
    assert.equal(scored.isCombo, false);
    assert.deepEqual(scored.state, state(2.1, 1, 'apple'));
});

test('scoreMove gives the same-fruit bonus and grows the combo for the same fruit again', () => {
    const result = validResult([step(1, [group('apple', 3)])]);
    const scored = Scoring.scoreMove(result, state(1.1, 1, 'apple'), 'apple', 'kiwi', 1, RULES);
    assert.equal(scored.isCombo, true);
    assert.deepEqual(scored.state, state(1.4, 2, 'apple'));
});

test('scoreMove never raises the multiplier past the cap', () => {
    const result = validResult([step(1, [group('apple', 3)])]);
    assert.equal(Scoring.scoreMove(result, state(2.9, 1, 'apple'), 'apple', 'kiwi', 1, RULES).state.multiplier, 3);
    assert.equal(Scoring.scoreMove(result, state(3, 1, 'apple'), 'apple', 'kiwi', 1, RULES).state.multiplier, 3);
});

test('scoreMove uses the displaced fruit when only it matched', () => {
    const result = validResult([step(1, [group('kiwi', 3)])]);
    const scored = Scoring.scoreMove(result, state(1.0, 0, null), 'apple', 'kiwi', 1, RULES);
    assert.equal(scored.state.lastMatchedFruit, 'kiwi');
});

test('scoreMove prefers the moved fruit when both swapped fruits matched', () => {
    const result = validResult([step(1, [group('kiwi', 3), group('apple', 3)])]);
    const scored = Scoring.scoreMove(result, state(1.0, 0, null), 'apple', 'kiwi', 1, RULES);
    assert.equal(scored.state.lastMatchedFruit, 'apple');
});

test('scoreMove earns nothing and keeps the state for an invalid swap', () => {
    const before = state(2.3, 4, 'grape');
    const scored = Scoring.scoreMove({ valid: false }, before, 'apple', 'kiwi', 10, RULES);
    assert.equal(scored.total, 0);
    assert.deepEqual(scored.stepScores, []);
    assert.equal(scored.isCombo, false);
    assert.deepEqual(scored.state, before);
});

test('scoreMove keeps the multiplier free of float noise', () => {
    let current = Scoring.createScoreState();
    ['apple', 'kiwi', 'grape'].forEach(fruit => {
        current = Scoring.scoreMove(validResult([step(1, [group(fruit, 3)])]), current, fruit, 'x', 1, RULES).state;
    });
    assert.equal(current.multiplier, 1.3);
});

test('decayMultiplier cools down over time but stops at x1.0', () => {
    assert.equal(Scoring.decayMultiplier(1.5, 10, 0.02), 1.3);
    assert.equal(Scoring.decayMultiplier(1.1, 10, 0.02), 1);
    assert.equal(Scoring.decayMultiplier(1.4, 0.1, 0.02), 1.398);
});
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `node --test tests/scoring.test.js`
Expected: FAIL — `Scoring.matchStepRevenue is not a function` 등.

- [ ] **Step 4: `scoring.js` 전체 교체**

```js
// Revenue and multiplier rules for the growth mode. No DOM access.
(function (root) {
    'use strict';

    function createScoreState() {
        return { multiplier: 1.0, comboCount: 0, lastMatchedFruit: null };
    }

    // Three decimals keep the slow per-tick decay visible while hiding float noise.
    function roundMultiplier(value) {
        return Math.round(value * 1000) / 1000;
    }

    // Fruits sold in one cascade step, times the price, chain step, and multiplier.
    function matchStepRevenue(step, price, multiplier) {
        const sold = step.groups.reduce((sum, group) => sum + group.cells.length, 0);
        return Math.floor(sold * price * step.chain * multiplier);
    }

    // movedFruit: the fruit the player dragged, displacedFruit: the fruit it swapped with.
    // rules: { sameFruitBonus, otherFruitBonus, maxMultiplier }
    function scoreMove(result, state, movedFruit, displacedFruit, price, rules) {
        if (!result.valid) {
            return { total: 0, stepScores: [], isCombo: false, state };
        }

        const stepScores = result.steps.map(step => matchStepRevenue(step, price, state.multiplier));
        const total = stepScores.reduce((sum, value) => sum + value, 0);
        const firstStepFruits = result.steps[0].groups.map(group => group.fruit);
        const matchedFruit = firstStepFruits.includes(movedFruit) ? movedFruit : displacedFruit;
        const isCombo = matchedFruit === state.lastMatchedFruit;
        const bonus = isCombo ? rules.sameFruitBonus : rules.otherFruitBonus;

        return {
            total,
            stepScores,
            isCombo,
            state: {
                multiplier: roundMultiplier(Math.min(rules.maxMultiplier, state.multiplier + bonus)),
                comboCount: isCombo ? state.comboCount + 1 : 1,
                lastMatchedFruit: matchedFruit
            }
        };
    }

    // The multiplier cools down over game time but never drops below x1.0.
    function decayMultiplier(multiplier, seconds, rate) {
        return roundMultiplier(Math.max(1, multiplier - rate * seconds));
    }

    const Scoring = { createScoreState, matchStepRevenue, scoreMove, decayMultiplier };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Scoring;
    } else {
        root.Scoring = Scoring;
    }
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 5: `tuning.js` 만들기**

```js
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
        clearCashMultiplier: 2,
        leaderboardMinScore: 100000
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Tuning;
    } else {
        root.Tuning = Tuning;
    }
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `node --test tests/*.test.js`
Expected: `tests/scoring.test.js` 11개 PASS. `tests/board.test.js`, `tests/audio.test.js`도 그대로 PASS. `node -e "console.log(require('./tuning.js').stages.length)"`는 `7`.

- [ ] **Step 7: Commit**

```bash
git add tuning.js scoring.js tests/scoring.test.js
git commit -m "feat: add growth-mode tuning and price-based revenue rules

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: 크기 지정 보드와 보드 확장

**Files:**
- Modify: `board.js` (`ROWS`/`COLS` 상수 삭제, `createBoard`, `shuffle` 끝부분, `makesLine`·`expandBoard` 추가, 내보내기 목록)
- Test: `tests/board.test.js`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `Board.createBoard(rng, fruits, cols, rows) → string[][]` (`rows`개의 행, 각 `cols`칸)
  - `Board.expandBoard(board, fruits, cols, rows, rng) → { board: string[][], added: {row, col}[] }` — 새 열은 오른쪽(두 열이면 왼쪽·오른쪽 하나씩), 새 행은 위. 결과에 줄이 없고 가능한 수가 있다.
  - `Board.ROWS`, `Board.COLS`는 더 이상 없다.

- [ ] **Step 1: 기존 테스트 세 곳을 크기 지정 호출로 바꾸고 새 테스트 추가**

`tests/board.test.js`에서:

1. `test('createBoard makes an 8x7 board with no matches and at least one move', ...)` 테스트 전체를 아래로 교체한다.

```js
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
```

2. `shuffle keeps the same fruits...` 테스트 안의 `Board.createBoard(seededRng(seed), fruits)`를 `Board.createBoard(seededRng(seed), fruits, 7, 8)`로 바꾼다.

3. `resolveMove steps replay correctly...` 속성 테스트 안의 `Board.createBoard(rng, fruits)`를 `Board.createBoard(rng, fruits, 7, 8)`로 바꾼다.

4. `// The UI's animateFalls only rewrites destination cells, ...` 주석 바로 위에 아래 세 테스트를 추가한다. (`parseBoard`, `boardToLines`, `cellKeys`, `seededRng`는 이미 `helpers.js`에서 가져오고 있다.)

```js
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
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `node --test tests/board.test.js`
Expected: FAIL — `createBoard` 크기 테스트(행 수가 8), `Board.expandBoard is not a function`.

- [ ] **Step 3: `board.js` 수정**

1. 파일 위쪽의 아래 세 줄(상수와 빈 줄)을 삭제한다.

```js
    const ROWS = 8;
    const COLS = 7;

```

2. `createBoard`의 시그니처와 두 반복문을 바꾼다.

```js
    // Requires at least 3 fruits so every cell has a fruit that does not complete a line.
    function createBoard(rng, fruits, cols, rows) {
        for (;;) {
            const board = [];
            for (let row = 0; row < rows; row++) {
                const line = [];
                board.push(line);
                for (let col = 0; col < cols; col++) {
```

(반복문 안쪽 본문은 그대로 둔다.)

3. `shuffle` 마지막 줄을 크기를 넘기도록 바꾼다.

```js
        return createBoard(rng, Array.from(new Set(flat)), cols, rows);
```

4. `shuffle` 함수 바로 아래에 두 함수를 추가한다.

```js
    // True if putting `fruit` at `cell` would complete a line of 3 with the fruits already there.
    function makesLine(board, cell, fruit) {
        const same = (row, col) => row >= 0 && row < board.length && col >= 0 && col < board[0].length && board[row][col] === fruit;
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
```

5. 내보내기 객체에서 `ROWS,`와 `COLS,` 줄을 지우고, `shuffle` 뒤에 `expandBoard`를 추가한다.

```js
    const Board = {
        isAdjacent,
        findMatches,
        clearAndCollapse,
        cascade,
        resolveMove,
        findBestMove,
        hasPossibleMove,
        pickFruits,
        createBoard,
        shuffle,
        expandBoard
    };
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test tests/*.test.js`
Expected: 전부 PASS (board 테스트는 새 3개 포함).

- [ ] **Step 5: Commit**

```bash
git add board.js tests/board.test.js
git commit -m "feat: size boards per stage and grow them with expandBoard

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: 경제 규칙 모듈

**Files:**
- Create: `economy.js`
- Test: `tests/economy.test.js`

**Interfaces:**
- Consumes: `Scoring.createScoreState`, `Scoring.scoreMove(result, state, moved, displaced, price, rules)`, `Scoring.decayMultiplier(multiplier, seconds, rate)` (Task 1). 튜닝 객체 모양은 Task 1의 `Tuning`과 같다.
- Produces (`window.Economy` / `require('../economy.js')`). `run`은 아래 모양의 상태 객체이고, 모든 함수는 입력을 바꾸지 않고 새 객체를 돌려준다.
  - `run = { stage, cash, revenue, time, stageTime, logisticsTimer, combo: { multiplier, comboCount, lastMatchedFruit }, maxMultiplier, maxChain, swaps, ended: null | 'bankrupt' | 'clear', modifiers: { rent, labor, logistics, revenue } }`
  - `createRun(tuning) → run`
  - `tick(run, tuning, dt) → run`
  - `chargeSwap(run, tuning) → run`
  - `scoreMove(run, tuning, result, movedFruit, displacedFruit) → { total, stepScores, isCombo, state }` (상태 변경 없음)
  - `addEarnings(run, amount) → run`
  - `finishMove(run, scored, chainLength) → run`
  - `inflation(run, tuning)`, `surcharge(run, tuning)`, `currentRent(run, tuning)`, `projectedRent(run, tuning, stage)`, `currentLogistics(run, tuning)`, `currentPrice(run, tuning)` → number
  - `nextExpandCost(run, tuning) → number | null`, `canExpand(run, tuning) → boolean`, `expand(run, tuning) → run`
  - `isBankrupt(run) → boolean` (끝나지 않았고 `cash <= 0`), `bankrupt(run) → run`, `isInDanger(run, tuning) → boolean`
  - `finalScore(run, tuning) → integer`

- [ ] **Step 1: 테스트 작성 — `tests/economy.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const Economy = require('../economy.js');

// Small round numbers so every expectation can be checked by hand.
// Tests use this instead of tuning.js so retuning the game never breaks them.
const T = {
    startCash: 500,
    fruitOrder: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    frameSize: 7,
    stages: [
        { name: 's1', cols: 5, rows: 5, fruits: 3, price: 2, rent: 10, logistics: 0, expandCost: 1000 },
        { name: 's2', cols: 6, rows: 5, fruits: 4, price: 5, rent: 20, logistics: 6, expandCost: 2000 },
        { name: 's3', cols: 6, rows: 6, fruits: 4, price: 6, rent: 30, logistics: 7, expandCost: 3000 },
        { name: 's4', cols: 6, rows: 6, fruits: 5, price: 7, rent: 40, logistics: 8, expandCost: 4000 },
        { name: 's5', cols: 6, rows: 7, fruits: 6, price: 8, rent: 50, logistics: 9, expandCost: 5000 },
        { name: 's6', cols: 7, rows: 7, fruits: 7, price: 9, rent: 100, logistics: 10, expandCost: 6000 },
        { name: 's7', cols: 7, rows: 7, fruits: 7, price: 0, rent: 0, logistics: 0, expandCost: null }
    ],
    inflationRate: 1.5,
    inflationInterval: 30,
    surchargeStage: 6,
    surchargeRate: 2,
    surchargeInterval: 20,
    laborPerSwap: 2,
    logisticsInterval: 5,
    sameFruitBonus: 0.3,
    otherFruitBonus: 0.1,
    maxMultiplier: 3,
    multiplierDecay: 0.02,
    dangerSeconds: 10,
    clearCashMultiplier: 2,
    leaderboardMinScore: 100000
};

function runAt(overrides) {
    return { ...Economy.createRun(T), ...overrides };
}

function ticks(state, count, dt = 0.1) {
    let current = state;
    for (let i = 0; i < count; i++) current = Economy.tick(current, T, dt);
    return current;
}

function assertClose(actual, expected) {
    assert.ok(Math.abs(actual - expected) < 1e-6, `expected ${expected}, got ${actual}`);
}

function group(fruit, size) {
    return { fruit, cells: Array.from({ length: size }, (_, col) => ({ row: 0, col })) };
}

function oneStepResult(fruit, size) {
    return { valid: true, steps: [{ kind: 'match', chain: 1, groups: [group(fruit, size)] }] };
}

test('createRun opens the tent with the starting cash and no revenue', () => {
    const run = Economy.createRun(T);
    assert.equal(run.stage, 1);
    assert.equal(run.cash, 500);
    assert.equal(run.revenue, 0);
    assert.equal(run.time, 0);
    assert.equal(run.combo.multiplier, 1);
    assert.equal(run.ended, null);
    assert.deepEqual(run.modifiers, { rent: 1, labor: 1, logistics: 1, revenue: 1 });
});

test('tick charges rent for the time that passed', () => {
    const run = ticks(Economy.createRun(T), 10);
    assertClose(run.cash, 490);
    assert.equal(run.time, 1);
    assert.equal(run.stageTime, 1);
});

test('rent goes up by the inflation rate every 30 seconds of game time', () => {
    assert.equal(Economy.currentRent(runAt({ time: 29.9 }), T), 10);
    assert.equal(Economy.currentRent(runAt({ time: 30 }), T), 15);
    assert.equal(Economy.currentRent(runAt({ time: 60 }), T), 22.5);
    assert.equal(Economy.inflation(runAt({ time: 60 }), T), 2.25);
});

test('the surcharge only applies at the surcharge stage and grows every 20 seconds there', () => {
    assert.equal(Economy.currentRent(runAt({ stage: 5, stageTime: 40 }), T), 50);
    assert.equal(Economy.currentRent(runAt({ stage: 6, stageTime: 19.9 }), T), 100);
    assert.equal(Economy.currentRent(runAt({ stage: 6, stageTime: 20 }), T), 200);
    assert.equal(Economy.currentRent(runAt({ stage: 6, stageTime: 40, time: 30 }), T), 600);
    assert.equal(Economy.surcharge(runAt({ stage: 6, stageTime: 40 }), T), 4);
});

test('logistics is charged once every 5 seconds', () => {
    const start = runAt({ stage: 2 });
    const before = ticks(start, 49);
    assertClose(before.cash, 500 - 20 * 4.9);
    const after = Economy.tick(before, T, 0.1);
    assertClose(after.cash, 500 - 20 * 5 - 6);
    assert.equal(after.logisticsTimer, 0);
});

test('tick cools the multiplier down but not below x1.0', () => {
    const run = runAt({ combo: { multiplier: 1.5, comboCount: 2, lastMatchedFruit: 'a' } });
    assert.equal(Economy.tick(run, T, 10).combo.multiplier, 1.3);
    assert.equal(Economy.tick(Economy.tick(run, T, 10), T, 20).combo.multiplier, 1);
});

test('chargeSwap pays labor and counts the swap', () => {
    const run = Economy.chargeSwap(Economy.createRun(T), T);
    assert.equal(run.cash, 498);
    assert.equal(run.swaps, 1);
});

test('scoreMove prices fruits at the current stage and the revenue modifier', () => {
    const scored = Economy.scoreMove(Economy.createRun(T), T, oneStepResult('a', 3), 'a', 'b');
    assert.deepEqual(scored.stepScores, [6]);
    const doubled = Economy.scoreMove(runAt({ stage: 2, modifiers: { rent: 1, labor: 1, logistics: 1, revenue: 2 } }), T, oneStepResult('a', 4), 'a', 'b');
    assert.deepEqual(doubled.stepScores, [40]);
});

test('addEarnings raises both cash and revenue', () => {
    const run = Economy.addEarnings(Economy.createRun(T), 120);
    assert.equal(run.cash, 620);
    assert.equal(run.revenue, 120);
});

test('finishMove applies the new combo state and remembers the best multiplier and chain', () => {
    const run = Economy.createRun(T);
    const scored = Economy.scoreMove(run, T, oneStepResult('a', 3), 'a', 'b');
    const after = Economy.finishMove(run, scored, 3);
    assert.equal(after.combo.multiplier, 1.1);
    assert.equal(after.combo.lastMatchedFruit, 'a');
    assert.equal(after.maxMultiplier, 1.1);
    assert.equal(after.maxChain, 3);
    assert.equal(Economy.finishMove(after, scored, 1).maxChain, 3);
});

test('canExpand needs the full expansion cost', () => {
    assert.equal(Economy.canExpand(runAt({ cash: 999 }), T), false);
    assert.equal(Economy.canExpand(runAt({ cash: 1000 }), T), true);
    assert.equal(Economy.nextExpandCost(runAt({ stage: 3 }), T), 3000);
});

test('expand pays, moves up a stage, and restarts the stage clock but not game time', () => {
    const run = Economy.expand(runAt({ cash: 1500, time: 42, stageTime: 42 }), T);
    assert.equal(run.stage, 2);
    assert.equal(run.cash, 500);
    assert.equal(run.stageTime, 0);
    assert.equal(run.time, 42);
    assert.equal(run.ended, null);
});

test('expand does nothing without enough cash', () => {
    const before = runAt({ cash: 10 });
    assert.equal(Economy.expand(before, T), before);
});

test('expanding from the last stage before the clear ends the run as a clear', () => {
    const run = Economy.expand(runAt({ stage: 6, cash: 7000, revenue: 50000 }), T);
    assert.equal(run.stage, 7);
    assert.equal(run.ended, 'clear');
    assert.equal(Economy.nextExpandCost(run, T), null);
    assert.equal(Economy.canExpand(run, T), false);
    assert.equal(Economy.finalScore(run, T), 50000 + 6000 + 1000 * 2);
});

test('the run goes bankrupt at zero cash and scores its revenue', () => {
    assert.equal(Economy.isBankrupt(runAt({ cash: 0.5 })), false);
    assert.equal(Economy.isBankrupt(runAt({ cash: 0 })), true);
    const run = Economy.bankrupt(runAt({ cash: -3, revenue: 1234.7 }));
    assert.equal(run.ended, 'bankrupt');
    assert.equal(Economy.isBankrupt(run), false);
    assert.equal(Economy.finalScore(run, T), 1234);
});

test('an ended run no longer pays anything', () => {
    const run = runAt({ ended: 'bankrupt', cash: -5 });
    assert.equal(Economy.tick(run, T, 1), run);
    assert.equal(Economy.chargeSwap(run, T), run);
    assert.equal(Economy.isInDanger(run, T), false);
});

test('danger means cash for 10 seconds of rent or less', () => {
    assert.equal(Economy.isInDanger(runAt({ cash: 100 }), T), true);
    assert.equal(Economy.isInDanger(runAt({ cash: 101 }), T), false);
    assert.equal(Economy.isInDanger(runAt({ cash: 150, time: 30 }), T), true);
});

test('projectedRent prices another stage with today\'s inflation', () => {
    assert.equal(Economy.projectedRent(runAt({ time: 30 }), T, 2), 30);
    assert.equal(Economy.projectedRent(runAt({ stage: 5, time: 0 }), T, 6), 100);
});

test('no function changes the run it was given', () => {
    const run = runAt({ cash: 1500, stage: 1 });
    const copy = structuredClone(run);
    Economy.tick(run, T, 1);
    Economy.chargeSwap(run, T);
    Economy.addEarnings(run, 10);
    Economy.finishMove(run, Economy.scoreMove(run, T, oneStepResult('a', 3), 'a', 'b'), 2);
    Economy.expand(run, T);
    Economy.bankrupt(run);
    assert.deepEqual(run, copy);
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `node --test tests/economy.test.js`
Expected: FAIL — `Cannot find module '../economy.js'`.

- [ ] **Step 3: `economy.js` 작성**

```js
// Money rules for the growth mode: costs over time, earnings, expansion, and endings.
// Every function returns a new run state and never changes its input. No DOM access.
(function (root) {
    'use strict';

    const Scoring = typeof module !== 'undefined' && module.exports ? require('./scoring.js') : root.Scoring;

    function round3(value) {
        return Math.round(value * 1000) / 1000;
    }

    function stageInfo(state, tuning) {
        return tuning.stages[state.stage - 1];
    }

    function createRun(tuning) {
        return {
            stage: 1,
            cash: tuning.startCash,
            revenue: 0,
            time: 0,
            stageTime: 0,
            logisticsTimer: 0,
            combo: Scoring.createScoreState(),
            maxMultiplier: 1.0,
            maxChain: 0,
            swaps: 0,
            ended: null,
            // Room for phase 2 cards (e.g. rent: 0.8 for -20% rent). Phase 1 keeps them at 1.
            modifiers: { rent: 1, labor: 1, logistics: 1, revenue: 1 }
        };
    }

    function inflation(state, tuning) {
        return Math.pow(tuning.inflationRate, Math.floor(state.time / tuning.inflationInterval));
    }

    // Extra rent that keeps climbing while the shop stays at the last stage before the clear.
    function surcharge(state, tuning) {
        if (state.stage !== tuning.surchargeStage) return 1;
        return Math.pow(tuning.surchargeRate, Math.floor(state.stageTime / tuning.surchargeInterval));
    }

    // Rent per second right now.
    function currentRent(state, tuning) {
        return stageInfo(state, tuning).rent * inflation(state, tuning) * surcharge(state, tuning) * state.modifiers.rent;
    }

    // Rent per second the shop would pay at `stage` with today's prices (no surcharge yet).
    function projectedRent(state, tuning, stage) {
        return tuning.stages[stage - 1].rent * inflation(state, tuning) * state.modifiers.rent;
    }

    function currentLogistics(state, tuning) {
        return stageInfo(state, tuning).logistics * state.modifiers.logistics;
    }

    function currentPrice(state, tuning) {
        return stageInfo(state, tuning).price * state.modifiers.revenue;
    }

    // Moves game time forward by dt seconds: rent, logistics, and multiplier cooldown.
    function tick(state, tuning, dt) {
        if (state.ended) return state;

        let cash = state.cash - currentRent(state, tuning) * dt;
        let logisticsTimer = round3(state.logisticsTimer + dt);
        if (logisticsTimer >= tuning.logisticsInterval) {
            cash -= currentLogistics(state, tuning);
            logisticsTimer = round3(logisticsTimer - tuning.logisticsInterval);
        }

        return {
            ...state,
            cash,
            time: round3(state.time + dt),
            stageTime: round3(state.stageTime + dt),
            logisticsTimer,
            combo: { ...state.combo, multiplier: Scoring.decayMultiplier(state.combo.multiplier, dt, tuning.multiplierDecay) }
        };
    }

    // Labor is paid for every swap, including ones that bounce back.
    function chargeSwap(state, tuning) {
        if (state.ended) return state;
        return { ...state, cash: state.cash - tuning.laborPerSwap * state.modifiers.labor, swaps: state.swaps + 1 };
    }

    // Prices a resolved move at the current stage. Does not change the run: the caller adds
    // each step's amount with addEarnings as it plays, then calls finishMove.
    function scoreMove(state, tuning, result, movedFruit, displacedFruit) {
        return Scoring.scoreMove(result, state.combo, movedFruit, displacedFruit, currentPrice(state, tuning), tuning);
    }

    function addEarnings(state, amount) {
        return { ...state, cash: state.cash + amount, revenue: state.revenue + amount };
    }

    function finishMove(state, scored, chainLength) {
        return {
            ...state,
            combo: scored.state,
            maxMultiplier: Math.max(state.maxMultiplier, scored.state.multiplier),
            maxChain: Math.max(state.maxChain, chainLength)
        };
    }

    // What it costs to leave the current stage, or null at the last stage.
    function nextExpandCost(state, tuning) {
        return state.stage < tuning.stages.length ? stageInfo(state, tuning).expandCost : null;
    }

    function canExpand(state, tuning) {
        const cost = nextExpandCost(state, tuning);
        return !state.ended && cost !== null && state.cash >= cost;
    }

    // Pays for the next stage. Reaching the last stage ends the run as a clear.
    function expand(state, tuning) {
        if (!canExpand(state, tuning)) return state;
        const stage = state.stage + 1;
        return {
            ...state,
            cash: state.cash - nextExpandCost(state, tuning),
            stage,
            stageTime: 0,
            ended: stage === tuning.stages.length ? 'clear' : null
        };
    }

    function isBankrupt(state) {
        return !state.ended && state.cash <= 0;
    }

    function bankrupt(state) {
        return state.ended ? state : { ...state, ended: 'bankrupt' };
    }

    // Danger: only enough cash left for a few seconds of rent.
    function isInDanger(state, tuning) {
        return !state.ended && state.cash <= currentRent(state, tuning) * tuning.dangerSeconds;
    }

    // Revenue is the score. A clear adds the building's value and doubles the cash left.
    function finalScore(state, tuning) {
        if (state.ended === 'clear') {
            const buildingValue = tuning.stages[tuning.stages.length - 2].expandCost;
            return Math.floor(state.revenue + buildingValue + state.cash * tuning.clearCashMultiplier);
        }
        return Math.floor(state.revenue);
    }

    const Economy = {
        createRun,
        inflation,
        surcharge,
        currentRent,
        projectedRent,
        currentLogistics,
        currentPrice,
        tick,
        chargeSwap,
        scoreMove,
        addEarnings,
        finishMove,
        nextExpandCost,
        canExpand,
        expand,
        isBankrupt,
        bankrupt,
        isInDanger,
        finalScore
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Economy;
    } else {
        root.Economy = Economy;
    }
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test tests/*.test.js`
Expected: 전부 PASS (economy 19개 포함, 총 60개 안팎).

- [ ] **Step 5: Commit**

```bash
git add economy.js tests/economy.test.js
git commit -m "feat: add growth-mode economy rules

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: 밸런스 시뮬레이터

**Files:**
- Create: `tools/sim.js`

**Interfaces:**
- Consumes: `Board.createBoard`, `Board.hasPossibleMove`, `Board.shuffle`, `Board.findMatches`, `Board.resolveMove`, `Board.expandBoard` (Task 2); `Economy.*` (Task 3); `Tuning` (Task 1)
- Produces: CLI 도구 `node tools/sim.js [runsPerPlayer]`. 다른 코드에서 쓰지 않는다.

- [ ] **Step 1: `tools/sim.js` 작성**

```js
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
const EXPAND_BUFFER_SECONDS = 8; // the bot keeps this much of the next stage's rent after paying
const CLEAR_WAIT_SECONDS = 40; // the bot earns this long at the last stage before clearing

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

function playRun(interval, seed) {
    const rng = seededRng(seed);
    const first = Tuning.stages[0];
    let run = Economy.createRun(Tuning);
    let board = Board.createBoard(rng, fruitsFor(1), first.cols, first.rows);
    let nextSwapAt = interval;
    let clearReadyAt = null;
    const reachedAt = [];

    while (run.time < MAX_TIME && !run.ended) {
        run = Economy.tick(run, Tuning, DT);

        if (run.time >= nextSwapAt) {
            nextSwapAt += interval;
            if (!Board.hasPossibleMove(board)) board = Board.shuffle(board, rng);
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

        if (Economy.isBankrupt(run)) {
            run = Economy.bankrupt(run);
            break;
        }

        const lastBeforeClear = run.stage === Tuning.stages.length - 1;
        if (!lastBeforeClear) {
            const cost = Economy.nextExpandCost(run, Tuning);
            const buffer = Economy.projectedRent(run, Tuning, run.stage + 1) * EXPAND_BUFFER_SECONDS;
            if (run.cash >= cost + buffer) {
                run = Economy.expand(run, Tuning);
                reachedAt.push(Math.round(run.time));
                const info = Tuning.stages[run.stage - 1];
                board = Board.expandBoard(board, fruitsFor(run.stage), info.cols, info.rows, rng).board;
            }
        } else if (Economy.canExpand(run, Tuning)) {
            if (clearReadyAt === null) clearReadyAt = run.time;
            if (run.time - clearReadyAt >= CLEAR_WAIT_SECONDS) run = Economy.expand(run, Tuning);
        }
    }

    return { ended: run.ended || 'alive', time: run.time, stage: run.stage, score: Economy.finalScore(run, Tuning), reachedAt };
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
console.log('player      | clears | median time | median stage | median score | stage reached at (median run)');
PLAYERS.forEach(player => {
    const runs = [];
    for (let seed = 1; seed <= runsPerPlayer; seed++) runs.push(playRun(player.interval, seed));
    const clears = runs.filter(r => r.ended === 'clear').length;
    const medianScore = median(runs.map(r => r.score));
    const typical = runs.find(r => r.score === medianScore);
    console.log([
        `${player.name} (${player.interval}s)`.padEnd(11),
        `${clears}/${runs.length}`.padStart(6),
        formatTime(median(runs.map(r => r.time))).padStart(11),
        String(median(runs.map(r => r.stage))).padStart(12),
        medianScore.toLocaleString('en-US').padStart(12),
        typical.reachedAt.map((t, i) => `${i + 2}@${t}s`).join(' ')
    ].join(' | '));
});
```

- [ ] **Step 2: 실행해서 스펙 3.8의 표와 비교**

Run: `node tools/sim.js 20`
Expected (프로토타입 결과, 1초 안팎으로 끝난다):

```
runs per player: 20
player      | clears | median time | median stage | median score | stage reached at (median run)
설렁설렁 (3s)   |   0/20 |        5:01 |            4 |      327,560 | 2@21s 3@57s 4@117s 5@168s
보통 (2s)     |   0/20 |        5:17 |            5 |    1,150,823 | 2@24s 3@48s 4@126s 5@252s
잘함 (1.3s)   |   0/20 |        4:30 |            6 |    5,338,784 | 2@16s 3@31s 4@77s 5@105s 6@229s
고수 (1s)     |   0/20 |        4:34 |            6 |   10,875,485 | 2@10s 3@33s 4@51s 5@72s 6@135s
초고수 (0.8s)  |   3/20 |        4:36 |            6 |   14,821,280 | 2@9s 3@15s 4@27s 5@38s 6@74s
```

같은 시드라서 숫자가 정확히 같아야 한다. 다르면 Task 1~3 코드가 이 계획과 다른 것이므로 차이를 찾아 고친다.

- [ ] **Step 3: Commit**

```bash
git add tools/sim.js
git commit -m "feat: add bot simulator for balancing the growth economy

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: 새 게임 화면과 경제 루프 (투자 제외)

이 태스크가 끝나면 게임이 다시 돈다: 천막에서 시작해 매치로 벌고, 비용으로 새고, 위기 연출이 뜨고, 파산하면 결과 창이 뜬다. 확장은 6번 태스크다.

**Files:**
- Modify: `index.html` (글꼴 링크, `.game-container` 내부, 일시정지 오버레이, 스크립트 목록)
- Modify: `css_file.css` (`:root` 변수 추가, 옛 헤더·타이머 규칙 삭제, `.game-container`·`.grid`·`.cell` 교체, 새 규칙 추가)
- Modify: `js_file.js` (1행부터 `restartGame()` 끝까지 교체, 옛 `updateComboDisplay` 삭제, 끝부분 초기화 교체)

**Interfaces:**
- Consumes: `Tuning` (Task 1), `Board.createBoard(rng, fruits, cols, rows)`, `Board.resolveMove`, `Board.hasPossibleMove`, `Board.shuffle` (Task 2), `Economy.*` (Task 3), `GameAudio.*` (기존)
- Produces (6, 7번 태스크가 쓰는 전역):
  - 상태: `run`, `board`, `activeFruits`, `cellElements`, `gameRunning`, `isAnimating`, `sheetOpen`, `hiddenPause`, `gameSession`, `score`, `lastScore`, `highestScore`
  - 함수: `formatMoney(value)`, `stageInfo(stage)`, `fruitsForStage(stage)`, `buildGrid(cols, rows)`, `renderBoard()`, `newBoard(stage)`, `fruitWrapper(cell)`, `clearAnimations(cell)`, `cellPitch()`, `animate(element, keyframes, options)`, `wait(ms)`, `canAcceptInput()`, `isPaused()`, `renderBuilding(container, stage) → HTMLElement`, `updateStage()`, `updateDashboard()`, `showComboEffect(text)`, `endRun()`, `showResult()`, `restartGame()`, `setComboEffects(level)`
  - 상수: `FRUIT_NAMES` (과일 id → 한국어 이름)

- [ ] **Step 1: `index.html` — 글꼴에 `Jua` 추가**

`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;700&display=swap">`를 아래로 바꾼다. Fredoka에는 한글이 없어서 한글은 둥근 글꼴 Jua로 그린다.

```html
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;700&family=Jua&display=swap">
```

- [ ] **Step 2: `index.html` — 게임 화면 마크업 교체**

`<div class="game-container">`부터 그 닫는 `</div>`(`<div class="combo-text" id="comboText"></div>` 다음 줄)까지를 아래로 교체한다.

```html
    <div class="game-container">
        <div class="shop-area">
            <div class="stage-badge">
                <span class="stage-number" id="stageNumber">1단계</span>
                <span class="stage-name" id="stageName">천막</span>
            </div>
            <div class="shop-buttons">
                <button class="sound-btn" onclick="toggleSound()" aria-label="Toggle sound" aria-pressed="false">🔊</button>
                <button class="restart-btn-game" onclick="restartGame()" aria-label="Home">🏠</button>
            </div>
            <div class="building-slot" id="buildingSlot"></div>
            <div class="ground"></div>
        </div>

        <div class="dashboard">
            <div class="revenue-row">
                <div>
                    <div class="dash-label">매출 (점수)</div>
                    <div class="revenue-value" id="revenue">0</div>
                </div>
                <div class="combo-display">
                    <div class="combo-counter" id="comboCounter">0</div>
                    <div class="multiplier" id="multiplier">x1.0</div>
                </div>
            </div>
            <div class="cash-row" id="cashRow">
                <span class="dash-label">수익</span>
                <div class="cash-bar-track"><div class="cash-bar" id="cashBar"></div></div>
                <span class="cash-value" id="cash">0</span>
            </div>
            <div class="cost-line" id="costLine"></div>
        </div>

        <div class="board-frame" id="boardFrame">
            <div class="grid" id="grid"></div>
        </div>
        <div class="board-info" id="boardInfo"></div>

        <div class="combo-text" id="comboText"></div>
    </div>
```

- [ ] **Step 3: `index.html` — 일시정지 오버레이와 스크립트**

`<div class="siren-warning" id="sirenWarning"></div>` 바로 아래에 추가한다.

```html
    <div class="pause-overlay" id="pauseOverlay">
        <div class="pause-title">잠시 쉬는 중</div>
        <button class="start-btn" onclick="resumeGame()">계속하기</button>
    </div>
```

파일 끝의 스크립트 목록에서 `<script src="scoring.js"></script>` 다음, `<script src="js_file.js"></script>` 앞에 두 줄을 추가한다.

```html
    <script src="tuning.js"></script>
    <script src="economy.js"></script>
```

- [ ] **Step 4: `css_file.css` — 변수 추가와 옛 규칙 삭제**

1. `:root`의 `--gold: #FFC53D;` 다음 줄에 추가한다.

```css
    --grass: #8DC152;
    --grass-dark: #4E8A2A;
    --shelf: #7A4A1C;
    --window: #CFE8F7;
    --store-blue: #2F7FC1;
    --violet: #9B59B6;
    --night: #2B2356;
    --neon: #7FE3F5;
```

2. `body` 규칙의 `font-family`를 한글 글꼴을 포함하도록 바꾼다.

```css
    font-family: 'Fredoka', 'Jua', 'Arial Rounded MT Bold', 'Trebuchet MS', sans-serif;
```

3. 아래 규칙을 통째로 삭제한다(선택자로 찾는다): `.header`, `.score`, `.score-label`, `.timer-container`, `.timer-bar`, `.timer-bar.time-mid`, `.timer-bar.time-low`, `.timer-bar.timer-flash`, `@keyframes timerFlash`, `.time-bonus`, `@keyframes timeBonusFloat`. `.score-value`는 시작 화면이 쓰므로 남긴다.

4. `.game-container` 규칙을 아래로 교체한다.

```css
.game-container {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0 8px 8px;
    position: relative;
    z-index: 1;
}
```

5. `.grid` 규칙(맨 처음의 `display: grid;`로 시작하는 것. `.grid.combo-glow-*` 규칙들은 그대로 둔다)과 `.cell` 규칙을 아래로 교체한다.

```css
.grid {
    display: grid;
    grid-template-columns: repeat(var(--cols, 5), 1fr);
    grid-template-rows: repeat(var(--rows, 5), 1fr);
    width: calc(var(--cell) * var(--cols, 5));
    height: calc(var(--cell) * var(--rows, 5));
    background: var(--cream);
    border-radius: 10px;
    box-shadow: 0 0 0 3px var(--wood-dark);
    transition: box-shadow 0.3s ease, width 0.3s ease, height 0.3s ease;
    touch-action: none;
}

.cell {
    padding: 2px;
    background: rgba(90, 51, 16, 0.07);
    background-clip: content-box;
    border-radius: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    position: relative;
}
```

- [ ] **Step 5: `css_file.css` — 새 규칙 추가**

`@media (prefers-reduced-motion: reduce)` 블록 바로 위에 추가한다.

```css
[hidden] {
    display: none !important;
}

/* ---------- 가게 영역 ---------- */

.shop-area {
    position: relative;
    width: 100%;
    max-width: 380px;
    height: clamp(170px, 27vh, 240px);
    flex-shrink: 0;
    overflow: hidden; /* 6·7단계 건물은 윗부분이 잘린다 */
}

.stage-badge {
    position: absolute;
    top: 10px;
    left: 6px;
    z-index: 3;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px 4px 4px;
    background: var(--wood);
    border: 3px solid var(--wood-dark);
    border-radius: 14px;
    box-shadow: 0 4px 0 var(--wood-dark);
    color: var(--cream);
    font-weight: 700;
}

.stage-number {
    padding: 2px 8px;
    background: var(--wood-dark);
    color: var(--gold);
    border-radius: 10px;
    font-size: 13px;
}

.stage-name {
    font-size: 16px;
    text-shadow: 1px 1px 0 var(--wood-dark);
}

.shop-buttons {
    position: absolute;
    top: 10px;
    right: 6px;
    z-index: 3;
    display: flex;
    gap: 6px;
}

.building-slot {
    position: absolute;
    inset: 0;
    z-index: 2;
    pointer-events: none;
}

.ground {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 26px;
    z-index: 1;
    background: repeating-linear-gradient(90deg, var(--grass) 0 18px, var(--leaf) 18px 36px);
    border-top: 4px solid var(--grass-dark);
    border-radius: 12px 12px 0 0;
}

/* ---------- 건물 (CSS 임시 그래픽, img/building_N.png가 있으면 이미지) ---------- */

.building {
    position: absolute;
    left: 50%;
    bottom: 22px;
    width: calc(var(--w) * 1px);
    height: calc(var(--h) * 1px);
    transform: translateX(-50%);
}

.building[data-stage="1"] { --w: 76; --h: 60; }
.building[data-stage="2"] { --w: 104; --h: 90; }
.building[data-stage="3"] { --w: 132; --h: 130; }
.building[data-stage="4"] { --w: 150; --h: 170; }
.building[data-stage="5"] { --w: 188; --h: 210; }
.building[data-stage="6"] { --w: 170; --h: 250; }
.building[data-stage="7"] { --w: 190; --h: 300; }

.building-image {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: bottom;
    display: none;
}

.building.has-image .building-image {
    display: block;
}

.building.has-image .building-art {
    display: none;
}

.building-art {
    position: absolute;
    inset: 0;
    background: var(--cream);
    border: 3px solid var(--wood-dark);
    border-bottom: none;
    border-radius: 6px 6px 0 0;
}

/* 지붕 띠 */
.building-art::before {
    content: '';
    position: absolute;
    left: -8px;
    right: -8px;
    top: -3px;
    height: 22%;
    background: repeating-linear-gradient(90deg, var(--awning-red) 0 14px, var(--awning-cream) 14px 28px);
    border: 3px solid var(--wood-dark);
    border-radius: 6px;
}

/* 문 */
.building-art::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 0;
    width: 24%;
    height: 32%;
    transform: translateX(-50%);
    background: var(--wood);
    border: 3px solid var(--wood-dark);
    border-bottom: none;
    border-radius: 6px 6px 0 0;
}

/* 1 천막 */
.building[data-stage="1"] .building-art {
    border: none;
    border-radius: 0;
    background: repeating-linear-gradient(90deg, var(--sunset) 0 10px, var(--awning-cream) 10px 20px);
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
}

.building[data-stage="1"] .building-art::before {
    display: none;
}

.building[data-stage="1"] .building-art::after {
    width: 26%;
    height: 45%;
    background: var(--wood-dark);
    border: none;
}

/* 2 좌판: 과일 상자 세 개 */
.building[data-stage="2"] .building-art {
    background:
        linear-gradient(90deg, transparent 10%, var(--gold) 10% 30%, transparent 30% 40%, var(--leaf) 40% 60%, transparent 60% 70%, var(--awning-red) 70% 90%, transparent 90%) 0 60% / 100% 22% no-repeat,
        var(--cream);
}

.building[data-stage="2"] .building-art::before {
    height: 30%;
}

.building[data-stage="2"] .building-art::after {
    display: none;
}

/* 3 매대: 초록 지붕, 창문 두 개 */
.building[data-stage="3"] .building-art {
    background:
        linear-gradient(var(--window), var(--window)) 12% 45% / 26% 24% no-repeat,
        linear-gradient(var(--window), var(--window)) 88% 45% / 26% 24% no-repeat,
        var(--cream);
}

.building[data-stage="3"] .building-art::before {
    background: var(--leaf);
}

/* 4 편의점: 파랑·노랑·빨강 띠, 큰 유리창 */
.building[data-stage="4"] .building-art {
    background:
        linear-gradient(var(--window), var(--window)) 10% 55% / 32% 30% no-repeat,
        linear-gradient(var(--window), var(--window)) 90% 55% / 32% 30% no-repeat,
        var(--cream);
}

.building[data-stage="4"] .building-art::before {
    height: 18%;
    background: linear-gradient(var(--store-blue) 0 60%, var(--gold) 60% 80%, var(--awning-red) 80%);
}

/* 5·6·7 창문 격자 */
.building[data-stage="5"] .building-art,
.building[data-stage="6"] .building-art {
    background:
        linear-gradient(var(--cream), var(--cream)) bottom / 100% 30% no-repeat,
        repeating-linear-gradient(0deg, var(--cream) 0 10px, transparent 10px 30px),
        repeating-linear-gradient(90deg, var(--cream) 0 10px, var(--window) 10px 30px);
}

/* 5 대형마트: 간판 */
.building[data-stage="5"] .building-art {
    border-top: 10px solid var(--awning-red);
}

.building[data-stage="5"] .building-art::before {
    content: 'FRUIT MART';
    left: 10%;
    right: 10%;
    top: -26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--wood-dark);
    color: var(--gold);
    font-size: 13px;
    font-weight: 700;
    border-radius: 8px;
}

/* 6 백화점: 보라 지붕 */
.building[data-stage="6"] .building-art::before {
    height: 8%;
    background: var(--violet);
}

/* 7 우주 최강 건물: 밤하늘 빌딩, 원반 지붕 */
.building[data-stage="7"] .building-art {
    background:
        repeating-linear-gradient(0deg, var(--night) 0 10px, transparent 10px 28px),
        repeating-linear-gradient(90deg, var(--night) 0 10px, var(--neon) 10px 28px);
}

.building[data-stage="7"] .building-art::before {
    left: -22%;
    right: -22%;
    top: -6%;
    height: 14%;
    background: var(--violet);
    border-radius: 50%;
}

.building[data-stage="7"] .building-art::after {
    background: var(--gold);
}

/* 시트·결과 화면의 작은 건물 */
.mini-building {
    position: relative;
    width: 120px;
    height: 90px;
    flex-shrink: 0;
}

.mini-building .building {
    bottom: 0;
    transform: translateX(-50%) scale(min(1, calc(84 / var(--h))));
    transform-origin: bottom center;
}

/* ---------- 계기판 ---------- */

.dashboard {
    width: 100%;
    max-width: 380px;
    margin: 6px 0 10px;
    padding: 8px 12px;
    flex-shrink: 0;
    background: var(--cream);
    border: 4px solid var(--wood-dark);
    border-radius: 16px;
    box-shadow: 0 5px 0 var(--wood-dark);
}

.revenue-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
}

.dash-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--wood);
}

.revenue-value {
    font-size: 30px;
    font-weight: 700;
    line-height: 1.1;
    color: var(--wood-dark);
    font-variant-numeric: tabular-nums;
}

.dashboard .multiplier {
    color: var(--wood-dark);
    text-shadow: none;
}

.cash-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
}

.cash-bar-track {
    flex: 1;
    height: 14px;
    background: var(--awning-cream);
    border: 3px solid var(--wood-dark);
    border-radius: 8px;
    overflow: hidden;
}

.cash-bar {
    width: 0;
    height: 100%;
    background: var(--leaf);
    transition: width 0.15s linear, background 0.3s ease;
}

.cash-value {
    min-width: 72px;
    text-align: right;
    font-size: 16px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

.cash-row.danger .cash-bar {
    background: var(--awning-red);
}

.cash-row.danger .cash-value {
    color: var(--awning-red);
}

.cash-row.danger {
    animation: dangerBlink 0.6s ease-in-out infinite;
}

@keyframes dangerBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.45; }
}

.cost-line {
    margin-top: 4px;
    text-align: right;
    font-size: 11px;
    color: var(--wood);
}

.cost-line.cost-bump {
    animation: costBump 0.6s ease-out;
}

@keyframes costBump {
    0% { color: var(--awning-red); transform: scale(1.08); }
    100% { color: var(--wood); transform: scale(1); }
}

/* ---------- 보드 프레임 ---------- */

.board-frame {
    --frame: min(360px, calc(100vw - 16px), calc(100vh - 430px));
    --cell: calc((var(--frame) - 32px) / 7);
    position: relative;
    width: var(--frame);
    height: var(--frame);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: repeating-linear-gradient(0deg, var(--wood-dark) 0 3px, var(--shelf) 3px var(--cell));
    border: 6px solid var(--wood);
    border-radius: 18px;
    box-shadow: 0 0 0 4px var(--wood-dark), 0 8px 0 var(--wood-dark);
}

.board-info {
    margin-top: 14px;
    padding: 3px 10px;
    font-size: 12px;
    font-weight: 700;
    color: var(--wood-dark);
    background: var(--cream);
    border: 2px solid var(--wood-dark);
    border-radius: 10px;
}

.earning-float {
    position: absolute;
    left: 50%;
    top: 40%;
    z-index: 5;
    font-size: 26px;
    font-weight: 700;
    color: var(--gold);
    text-shadow: var(--outline);
    pointer-events: none;
    white-space: nowrap;
    animation: earningFloat 0.9s ease-out forwards;
}

@keyframes earningFloat {
    0% { opacity: 0; transform: translate(-50%, 10px) scale(0.8); }
    20% { opacity: 1; transform: translate(-50%, 0) scale(1.1); }
    100% { opacity: 0; transform: translate(-50%, -50px) scale(1); }
}

/* ---------- 일시정지 ---------- */

.pause-overlay {
    position: fixed;
    inset: 0;
    z-index: 1100;
    display: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 18px;
    background: rgba(90, 51, 16, 0.75);
}

.pause-overlay.show {
    display: flex;
}

.pause-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--cream);
    text-shadow: var(--outline);
}
```

그리고 `@media (prefers-reduced-motion: reduce)` 블록 안, 애니메이션을 끄는 선택자 목록의 마지막 줄 `    .siren-active {`를 아래 네 줄로 바꾼다(`.earning-float`는 애니메이션이 없어도 900ms 뒤 JS가 지운다).

```css
    .siren-active,
    .cash-row.danger,
    .cost-line.cost-bump,
    .earning-float {
```

- [ ] **Step 6: `js_file.js` — 앞부분 교체**

`const ALL_FRUITS = [...]`(1행)부터 `function restartGame() { ... }`의 닫는 `}`까지(현재 674행)를 아래 코드로 교체한다. `setupMarketDecorations`, `updateSoundButtons`, `toggleSound`, `fruitSrc`, 애니메이션 함수들(`animate`, `animateSwap`, `animatePop`, `animateFalls`, `animateShuffle`, `showFailedExpression`), 입력 함수, `showComboEffect`, `startGame`, `showCountdown`은 아래에 그대로(또는 필요한 곳만 바뀐 채로) 들어 있다.

```js
const SWIPE_THRESHOLD = 0.3; // fraction of a cell the finger must travel to count as a swipe
const TICK_MS = 100;
const TICK_SECONDS = TICK_MS / 1000;
const FRUIT_NAMES = {
    apple: '사과',
    banana: '바나나',
    grape: '포도',
    kiwi: '키위',
    orange: '오렌지',
    strawberry: '딸기',
    cherry: '체리'
};

let run = null;
let board = [];
let activeFruits = [];
let cellElements = [];
let gameRunning = false;
let isAnimating = false;
let sheetOpen = false;
let hiddenPause = false;
let loopInterval;
let gameSession = 0;
let pointerStart = null;
let comboTextTimer;
let comboLevel = 0;
let shownRent = 0;
let dangerShown = false;
let score = 0; // final score of the last finished run
let lastScore = 0;
let highestScore = 0;
const missingBuildingImages = new Set();

const BULB_COUNT = 12;
const CONFETTI_COUNT = 24;
const CONFETTI_COLORS = ['#E8413B', '#FFC53D', '#6DB33F', '#FF9F5A', '#FFF1D6'];

// Builds the light bulbs and confetti pieces once. CSS decides when they show.
function setupMarketDecorations() {
    const lights = document.getElementById('stringLights');
    for (let i = 0; i < BULB_COUNT; i++) {
        const bulb = document.createElement('span');
        bulb.className = 'bulb';
        bulb.style.marginTop = (i % 3) * 5 + 'px';
        bulb.style.animationDelay = (i * 0.1).toFixed(1) + 's';
        lights.appendChild(bulb);
    }

    const confetti = document.getElementById('confetti');
    for (let i = 0; i < CONFETTI_COUNT; i++) {
        const piece = document.createElement('span');
        piece.style.left = (i * 4 + Math.random() * 3).toFixed(1) + '%';
        piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        piece.style.animationDuration = (2.6 + Math.random() * 2).toFixed(1) + 's';
        piece.style.animationDelay = (Math.random() * 3).toFixed(1) + 's';
        confetti.appendChild(piece);
    }
}

function updateSoundButtons() {
    const label = GameAudio.isMuted() ? '🔇' : '🔊';
    document.querySelectorAll('.sound-btn').forEach(button => {
        button.textContent = label;
        button.setAttribute('aria-pressed', GameAudio.isMuted() ? 'true' : 'false');
    });
}

function toggleSound() {
    GameAudio.init();
    GameAudio.setMuted(!GameAudio.isMuted());
    updateSoundButtons();
}

function formatMoney(value) {
    return Math.floor(value).toLocaleString('ko-KR');
}

function stageInfo(stage) {
    return Tuning.stages[stage - 1];
}

function fruitsForStage(stage) {
    return Tuning.fruitOrder.slice(0, stageInfo(stage).fruits);
}

function fruitSrc(fruit, frame) {
    return `img/fruit_${fruit}_${frame}.png`;
}

// Builds the cell elements for a cols x rows board. Each cell holds a .fruit wrapper
// (moved by animations) around the fruit image (which keeps its idle CSS animation).
function buildGrid(cols, rows) {
    const gridElement = document.getElementById('grid');
    gridElement.innerHTML = '';
    gridElement.style.setProperty('--cols', cols);
    gridElement.style.setProperty('--rows', rows);
    cellElements = [];

    for (let row = 0; row < rows; row++) {
        const rowElements = [];
        for (let col = 0; col < cols; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;

            const wrapper = document.createElement('div');
            wrapper.className = 'fruit';

            const img = document.createElement('img');
            img.className = 'fruit-image';
            img.alt = '';
            img.draggable = false;

            wrapper.appendChild(img);
            cell.appendChild(wrapper);
            gridElement.appendChild(cell);
            rowElements.push(cell);
        }
        cellElements.push(rowElements);
    }
}

function fruitWrapper(cell) {
    return cellElements[cell.row][cell.col].firstChild;
}

function fruitImage(cell) {
    return fruitWrapper(cell).firstChild;
}

function setCellFruit(cell, fruit, frame = '001') {
    const img = fruitImage(cell);
    img.src = fruitSrc(fruit, frame);
    img.dataset.fruit = fruit;
}

function setCellFrame(cell, frame) {
    const img = fruitImage(cell);
    img.src = fruitSrc(img.dataset.fruit, frame);
}

function clearAnimations(cell) {
    const wrapper = fruitWrapper(cell);
    wrapper.getAnimations().forEach(animation => animation.cancel());
    wrapper.classList.remove('moving');
}

function renderBoard() {
    for (let row = 0; row < board.length; row++) {
        for (let col = 0; col < board[0].length; col++) {
            const cell = { row, col };
            clearAnimations(cell);
            setCellFruit(cell, board[row][col]);
        }
    }
}

function newBoard(stage) {
    const info = stageInfo(stage);
    activeFruits = fruitsForStage(stage);
    board = Board.createBoard(Math.random, activeFruits, info.cols, info.rows);
    buildGrid(info.cols, info.rows);
    renderBoard();
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// Runs a Web Animation and resolves when it ends. Cancelled animations resolve too.
function animate(element, keyframes, options) {
    return element.animate(keyframes, { fill: 'forwards', ...options }).finished.catch(() => {});
}

// Distance in layout pixels between neighboring cells (cells are square, boards are at least 5 wide).
function cellPitch() {
    return cellElements[0][1].offsetLeft - cellElements[0][0].offsetLeft;
}

function animateSwap(a, b, reverse = false) {
    const pitch = cellPitch();
    const dx = (b.col - a.col) * pitch;
    const dy = (b.row - a.row) * pitch;
    const wrapperA = fruitWrapper(a);
    const wrapperB = fruitWrapper(b);
    const still = 'translate(0px, 0px)';
    const toB = `translate(${dx}px, ${dy}px)`;
    const toA = `translate(${-dx}px, ${-dy}px)`;
    const options = { duration: 150, easing: 'ease-in-out' };

    wrapperA.classList.add('moving');
    return Promise.all([
        animate(wrapperA, reverse ? [{ transform: toB }, { transform: still }] : [{ transform: still }, { transform: toB }], options),
        animate(wrapperB, reverse ? [{ transform: toA }, { transform: still }] : [{ transform: still }, { transform: toA }], options)
    ]);
}

function animatePop(cells) {
    cells.forEach(cell => setCellFrame(cell, '003'));
    return Promise.all(cells.map(cell => animate(fruitWrapper(cell), [
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(1.25)', opacity: 1, offset: 0.4 },
        { transform: 'scale(0.2)', opacity: 0 }
    ], { duration: 250, easing: 'ease-in' })));
}

// Every cell that changed receives its new fruit, starting from where it falls from.
async function animateFalls(step) {
    const pitch = cellPitch();
    const moves = [
        ...step.falls.map(fall => ({ to: fall.to, fruit: fall.fruit, distance: fall.to.row - fall.from.row })),
        ...step.spawns.map(spawn => ({ to: spawn.to, fruit: spawn.fruit, distance: spawn.to.row - spawn.fromRow }))
    ];

    const animations = moves.map(move => {
        clearAnimations(move.to);
        setCellFruit(move.to, move.fruit);
        return animate(fruitWrapper(move.to), [
            { transform: `translateY(${-move.distance * pitch}px)` },
            { transform: 'translateY(0px)' }
        ], { duration: Math.min(400, 200 + move.distance * 50), easing: 'ease-in' });
    });

    await Promise.all(animations);
    moves.forEach(move => clearAnimations(move.to));
}

async function animateShuffle(nextBoard, session) {
    const wrappers = cellElements.flat().map(cell => cell.firstChild);
    await Promise.all(wrappers.map(wrapper => animate(wrapper, [
        { transform: 'scale(1)' },
        { transform: 'scale(0)' }
    ], { duration: 200, easing: 'ease-in' })));
    if (session !== gameSession) return;

    board = nextBoard;
    renderBoard();
    await Promise.all(wrappers.map(wrapper => animate(wrapper, [
        { transform: 'scale(0)' },
        { transform: 'scale(1)' }
    ], { duration: 200, easing: 'ease-out' })));
    wrappers.forEach(wrapper => wrapper.getAnimations().forEach(animation => animation.cancel()));
}

// Frowning faces on the two swapped fruits. Does not block input.
function showFailedExpression(cells) {
    cells.forEach(cell => setCellFrame(cell, '004'));
    setTimeout(() => {
        cells.forEach(cell => {
            if (fruitImage(cell).src.endsWith('_004.png')) setCellFrame(cell, '001');
        });
    }, 500);
}

function isPaused() {
    return sheetOpen || hiddenPause;
}

function canAcceptInput() {
    return gameRunning && !isAnimating && !isPaused();
}

function cellFromEvent(event) {
    const cellElement = event.target.closest('.cell');
    if (!cellElement) return null;
    return { row: Number(cellElement.dataset.row), col: Number(cellElement.dataset.col) };
}

function onGridPointerDown(event) {
    if (!canAcceptInput() || pointerStart) return;
    if (event.button !== 0) return;
    const cell = cellFromEvent(event);
    if (!cell) return;

    event.preventDefault();
    document.getElementById('grid').setPointerCapture(event.pointerId);
    pointerStart = { pointerId: event.pointerId, cell, x: event.clientX, y: event.clientY };
    GameAudio.playPop();
    setCellFrame(cell, '002');
}

function onGridPointerMove(event) {
    if (!pointerStart || event.pointerId !== pointerStart.pointerId) return;

    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    const threshold = cellElements[0][0].getBoundingClientRect().width * SWIPE_THRESHOLD;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;

    const from = pointerStart.cell;
    const to = Math.abs(dx) > Math.abs(dy)
        ? { row: from.row, col: from.col + Math.sign(dx) }
        : { row: from.row + Math.sign(dy), col: from.col };
    pointerStart = null;

    if (to.row < 0 || to.row >= board.length || to.col < 0 || to.col >= board[0].length) {
        setCellFrame(from, '001');
        return;
    }
    handleSwap(from, to);
}

function onGridPointerEnd(event) {
    if (!pointerStart || event.pointerId !== pointerStart.pointerId) return;
    const cell = pointerStart.cell;
    pointerStart = null;
    setCellFrame(cell, '001');
}

function setupGridInput() {
    const gridElement = document.getElementById('grid');
    gridElement.addEventListener('pointerdown', onGridPointerDown);
    gridElement.addEventListener('pointermove', onGridPointerMove);
    gridElement.addEventListener('pointerup', onGridPointerEnd);
    gridElement.addEventListener('pointercancel', onGridPointerEnd);
    gridElement.addEventListener('lostpointercapture', onGridPointerEnd);
}

// a: the cell the player dragged, b: the neighbor it was pushed into.
async function handleSwap(a, b) {
    if (!canAcceptInput()) return;
    isAnimating = true;
    const session = gameSession;
    const movedFruit = board[a.row][a.col];
    const displacedFruit = board[b.row][b.col];
    run = Economy.chargeSwap(run, Tuning);
    updateDashboard();
    const result = Board.resolveMove(board, a, b, Math.random, activeFruits);

    await animateSwap(a, b);
    if (session !== gameSession) return;

    if (!result.valid) {
        await animateSwap(a, b, true);
        if (session !== gameSession) return;
        clearAnimations(a);
        clearAnimations(b);
        GameAudio.playFail();
        showFailedExpression([a, b]);
        await finishTurn(session);
        return;
    }

    setCellFruit(a, result.swappedBoard[a.row][a.col]);
    setCellFruit(b, result.swappedBoard[b.row][b.col]);
    clearAnimations(a);
    clearAnimations(b);

    const scored = Economy.scoreMove(run, Tuning, result, movedFruit, displacedFruit);
    const completed = await playSteps(result.steps, scored.stepScores, session);
    if (!completed) return;

    board = result.finalBoard;
    run = Economy.finishMove(run, scored, result.steps.length);
    if (scored.isCombo) {
        showComboEffect(`COMBO x${run.combo.comboCount}!`);
    }
    pulseMultiplier();
    updateDashboard();
    updateComboDisplay();

    await finishTurn(session);
}

// Plays each pop-and-fall step in order and pays out as it goes.
// Returns false if the game was left midway.
async function playSteps(steps, stepScores, session) {
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        GameAudio.playSuccess(step.chain);
        await animatePop(step.cleared);
        if (session !== gameSession) return false;

        run = Economy.addEarnings(run, stepScores[i]);
        showEarning(stepScores[i]);
        updateDashboard();
        if (step.chain >= 2) {
            showComboEffect(`CHAIN x${step.chain}!`);
        }

        await animateFalls(step);
        if (session !== gameSession) return false;
    }
    return true;
}

// Ends the move. Rent that ran out during the animation only counts once the move has paid.
async function finishTurn(session) {
    if (!Board.hasPossibleMove(board)) {
        showComboEffect('Shuffle!');
        await animateShuffle(Board.shuffle(board, Math.random), session);
        if (session !== gameSession) return;
    }
    isAnimating = false;
    if (gameRunning && Economy.isBankrupt(run)) {
        endRun();
    }
}

function showEarning(amount) {
    if (amount <= 0) return;
    const label = document.createElement('div');
    label.className = 'earning-float';
    label.textContent = '+' + formatMoney(amount);
    document.getElementById('boardFrame').appendChild(label);
    setTimeout(() => label.remove(), 900);
}

// Draws the building for `stage` into `container`. Uses img/building_N.png when it exists.
function renderBuilding(container, stage) {
    container.innerHTML = '';
    const building = document.createElement('div');
    building.className = 'building';
    building.dataset.stage = stage;

    const art = document.createElement('div');
    art.className = 'building-art';
    building.appendChild(art);

    if (!missingBuildingImages.has(stage)) {
        const img = document.createElement('img');
        img.className = 'building-image';
        img.alt = '';
        img.draggable = false;
        img.addEventListener('load', () => building.classList.add('has-image'));
        img.addEventListener('error', () => {
            missingBuildingImages.add(stage);
            img.remove();
        });
        img.src = `img/building_${stage}.png`;
        building.appendChild(img);
    }

    container.appendChild(building);
    return building;
}

function updateStage() {
    const info = stageInfo(run.stage);
    document.getElementById('stageNumber').textContent = `${run.stage}단계`;
    document.getElementById('stageName').textContent = info.name;
    return renderBuilding(document.getElementById('buildingSlot'), run.stage);
}

function updateDashboard() {
    if (!run) return;
    document.getElementById('revenue').textContent = formatMoney(run.revenue);
    document.getElementById('cash').textContent = formatMoney(Math.max(0, run.cash));

    const cost = Economy.nextExpandCost(run, Tuning);
    const ratio = cost ? Math.min(1, Math.max(0, run.cash) / cost) : 1;
    document.getElementById('cashBar').style.width = (ratio * 100).toFixed(1) + '%';

    updateCostLine();
    updateMultiplier();
    updateDanger();
    updateBoardInfo();
}

function updateCostLine() {
    const rent = Math.round(Economy.currentRent(run, Tuning));
    const labor = Tuning.laborPerSwap * run.modifiers.labor;
    const logistics = Math.round(Economy.currentLogistics(run, Tuning));
    const line = document.getElementById('costLine');
    line.textContent = `임대료 −${formatMoney(rent)}/초 · 인건비 −${formatMoney(labor)}/스왑 · 물류비 −${formatMoney(logistics)}/${Tuning.logisticsInterval}초`;

    if (shownRent > 0 && rent > shownRent) {
        line.classList.remove('cost-bump');
        void line.offsetWidth; // restart the CSS animation
        line.classList.add('cost-bump');
    }
    shownRent = rent;
}

function updateMultiplier() {
    const multiplier = run.combo.multiplier;
    document.getElementById('multiplier').textContent = `x${multiplier.toFixed(1)}`;
    const level = multiplier >= 3 ? 3 : multiplier >= 2 ? 2 : multiplier >= 1.5 ? 1 : 0;
    if (level !== comboLevel) {
        comboLevel = level;
        setComboEffects(level);
    }
}

function setComboEffects(level) {
    const body = document.body;
    const grid = document.getElementById('grid');
    body.classList.remove('combo-bg-1', 'combo-bg-2', 'combo-bg-3');
    grid.classList.remove('combo-glow-1', 'combo-glow-2', 'combo-glow-3');
    if (level > 0) {
        body.classList.add(`combo-bg-${level}`);
        grid.classList.add(`combo-glow-${level}`);
    }
    GameAudio.setIntensity(level);
}

function pulseMultiplier() {
    const multiplierElement = document.getElementById('multiplier');
    multiplierElement.classList.add('multiplier-boost');
    setTimeout(() => multiplierElement.classList.remove('multiplier-boost'), 800);
}

function updateDanger() {
    const danger = gameRunning && Economy.isInDanger(run, Tuning);
    document.getElementById('cashRow').classList.toggle('danger', danger);
    if (danger === dangerShown) return;
    dangerShown = danger;
    document.getElementById('sirenWarning').classList.toggle('siren-active', danger);
    GameAudio.setHurry(danger);
}

function updateBoardInfo() {
    const info = stageInfo(run.stage);
    const inflationPercent = Math.round((Economy.inflation(run, Tuning) - 1) * 100);
    let text = `진열대 ${info.cols}×${info.rows} · 과일 ${info.fruits}종 · 물가 +${inflationPercent}%`;
    const surchargePercent = Math.round((Economy.surcharge(run, Tuning) - 1) * 100);
    if (surchargePercent > 0) {
        text += ` · 백화점 할증 +${surchargePercent}%`;
    }
    document.getElementById('boardInfo').textContent = text;
}

function updateComboDisplay() {
    const comboElement = document.getElementById('comboCounter');
    const comboCount = run ? run.combo.comboCount : 0;
    comboElement.textContent = comboCount;

    // Add glow effect when combo is active
    if (comboCount > 1) {
        comboElement.classList.add('combo-active');
        setTimeout(() => {
            comboElement.classList.remove('combo-active');
        }, 800);
    } else {
        comboElement.classList.remove('combo-active');
    }
}

function showComboEffect(text) {
    const comboElement = document.getElementById('comboText');
    comboElement.textContent = text;
    comboElement.classList.remove('combo-show');
    void comboElement.offsetWidth; // restart the CSS animation
    comboElement.classList.add('combo-show');

    clearTimeout(comboTextTimer);
    comboTextTimer = setTimeout(() => {
        comboElement.classList.remove('combo-show');
    }, 1500);
}

// Game time only moves while nothing is paused. Bankruptcy waits for the move on screen.
function onTick() {
    if (!gameRunning || isPaused()) return;
    run = Economy.tick(run, Tuning, TICK_SECONDS);
    updateDashboard();
    if (!isAnimating && Economy.isBankrupt(run)) {
        endRun();
    }
}

function startLoop() {
    clearInterval(loopInterval);
    loopInterval = setInterval(onTick, TICK_MS);
}

function endRun() {
    if (!gameRunning) return;
    gameRunning = false;
    clearInterval(loopInterval);
    run = Economy.bankrupt(run); // keeps a clear as a clear
    score = Economy.finalScore(run, Tuning);
    updateDashboard();
    GameAudio.stopMusic();

    showResult();

    lastScore = score;
    if (score > highestScore) {
        highestScore = score;
    }
    saveGameData();
    updateStartScreenStats();
}

// Basic result popup. Task 7 replaces this with the full result screen.
function showResult() {
    document.getElementById('finalScore').textContent = formatMoney(score);
    const isNewPersonalBest = score > highestScore;
    const meetsMinimumThreshold = score >= Tuning.leaderboardMinScore;
    if (isNewPersonalBest && meetsMinimumThreshold) {
        document.getElementById('scoreSubmit').style.display = 'block';
        document.getElementById('playAgainBtn').style.display = 'none';
    } else {
        document.getElementById('scoreSubmit').style.display = 'none';
        document.getElementById('playAgainBtn').style.display = 'block';
    }
    document.getElementById('gameOver').style.display = 'flex';
}

function pauseForHidden() {
    if (!gameRunning || hiddenPause) return;
    hiddenPause = true;
    document.getElementById('pauseOverlay').classList.add('show');
}

function resumeGame() {
    hiddenPause = false;
    document.getElementById('pauseOverlay').classList.remove('show');
}

// Submit score to Firebase
async function submitScore() {
    const playerName = document.getElementById('playerNameInput').value.trim();
    
    if (!playerName) {
        alert('Please enter your name!');
        return;
    }
    
    // Show loading state
    const submitBtn = document.querySelector('.submit-score-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="btn-icon">⏳</span>Submitting...';
    submitBtn.disabled = true;
    
    try {
        const success = await submitScoreToFirebase(playerName, score);
        
        if (success) {
            alert('Successfully added to leaderboard! 🎉');
        } else {
            alert('Failed to submit score. Please try again.');
        }
    } catch (error) {
        alert('An error occurred while submitting your score.');
        console.error('Submit score error:', error);
    }
    
    // Reset button state
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
    
    // Hide submit form and show play again button
    hideSubmitForm();
}

// Skip score submission
function skipSubmit() {
    hideSubmitForm();
}

// Hide submit form and show play again button
function hideSubmitForm() {
    document.getElementById('scoreSubmit').style.display = 'none';
    document.getElementById('playAgainBtn').style.display = 'block';
}

function startGame() {
    // Initialize audio (after user gesture)
    GameAudio.init();
    
    // Hide start screen
    document.getElementById('startScreen').style.display = 'none';
    document.body.classList.remove('on-start');

    // Show countdown
    showCountdown();
}

function showCountdown() {
    const countdownOverlay = document.getElementById('countdownOverlay');
    const countdownText = document.getElementById('countdownText');
    
    // Show countdown overlay
    countdownOverlay.classList.add('show');
    
    // Start with "Ready"
    countdownText.textContent = 'Ready';
    countdownText.className = 'countdown-text ready';
    countdownText.style.animation = 'countdownPulse 1s ease-out';
    
    setTimeout(() => {
        // Change to "START!"
        countdownText.textContent = 'START!';
        countdownText.className = 'countdown-text start';
        countdownText.style.animation = 'countdownPulse 1s ease-out';
        
        setTimeout(() => {
            // Hide countdown and start game
            countdownOverlay.classList.remove('show');
            actuallyStartGame();
        }, 1000);
    }, 1000);
}

function actuallyStartGame() {
    gameSession++;
    run = Economy.createRun(Tuning);
    gameRunning = true;
    isAnimating = false;
    sheetOpen = false;
    hiddenPause = false;
    pointerStart = null;
    comboLevel = -1; // forces the first update to set the effects
    shownRent = 0;
    dangerShown = false;

    newBoard(run.stage);
    updateStage();
    updateDashboard();
    updateComboDisplay();
    GameAudio.setHurry(false);

    GameAudio.startMusic();
    startLoop();
}

function restartGame() {
    // Stop current game session; any running move animation sees the new session and stops
    gameRunning = false;
    gameSession++;
    isAnimating = false;
    sheetOpen = false;
    hiddenPause = false;
    pointerStart = null;
    clearInterval(loopInterval);

    GameAudio.stopMusic();
    GameAudio.setHurry(false);
    dangerShown = false;

    comboLevel = 0;
    setComboEffects(0);

    // Hide game over screen and show start screen
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('pauseOverlay').classList.remove('show');
    document.getElementById('startScreen').style.display = 'flex';
    document.body.classList.add('on-start');

    // Reset siren warning
    document.getElementById('sirenWarning').classList.remove('siren-active');
}
```

- [ ] **Step 7: `js_file.js` — 나머지 정리**

1. 파일 뒤쪽의 옛 `updateComboDisplay` 함수(`function updateComboDisplay() {`부터 닫는 `}`까지, 주석 `// Add glow effect when combo is active` 포함)를 삭제한다. 새 버전은 Step 6 코드에 있다.

2. 파일 맨 끝의 `visibilitychange` 리스너와 `// Initialize` 블록(`document.addEventListener('visibilitychange', ...)`부터 `initializeTitleAnimations();`까지)을 아래로 교체한다.

```js
document.addEventListener('visibilitychange', () => {
    GameAudio.setPageHidden(document.hidden);
    if (document.hidden) {
        pauseForHidden();
    }
});

// Initialize
loadGameData();
setupMarketDecorations();
updateSoundButtons();
setupGridInput();
newBoard(1);
renderBuilding(document.getElementById('buildingSlot'), 1);
initializeTitleAnimations();
```

3. 다른 곳에 옛 전역(`timeLeft`, `multiplier`, `comboCount`, `lastMatchedFruit`, `maxMultiplier`, `timeUp`, `ALL_FRUITS`, `GAME_DURATION`, `Board.ROWS`, `Board.COLS`)을 쓰는 코드가 남아 있지 않은지 확인한다.

Run: `grep -nE "timeLeft|timeUp|ALL_FRUITS|GAME_DURATION|Board\.(ROWS|COLS)|\bmaxMultiplier\b|lastMatchedFruit|stepTimeBonus|baseScore" js_file.js`
Expected: 출력 없음.

- [ ] **Step 8: 문법 검사와 테스트**

Run: `node --check js_file.js && node --test tests/*.test.js`
Expected: 오류 없음, 테스트 전부 PASS.

- [ ] **Step 9: 브라우저 확인**

"브라우저 확인 방법"을 따른다. 음소거 후 `startGame()`.

확인할 것:
- 콘솔에 새 오류가 없다(무시 목록 제외).
- 위에서부터 가게 영역(1단계 천막 뱃지, 소리·홈 버튼, 가운데 천막, 잔디), 계기판(매출 0, 수익 500, 초록 바, 비용 줄 "임대료 −4/초 · 인건비 −2/스왑 · 물류비 −0/5초"), 7×7 크기 나무 프레임 가운데 5×5 보드(사과·바나나·포도만), 아래 "진열대 5×5 · 과일 3종 · 물가 +0%" 순서로 보인다. 375×812에서 세로 스크롤 없이 다 들어간다.
- 가만히 두면 수익이 초당 4씩 준다(`run.cash` 확인).
- 스와이프 매치가 되고, "+금액"이 떠오르고, 매출과 수익이 같이 오른다. 배율이 오르고 가만히 두면 천천히 내려간다.
- 30초가 지나면 판 아래 줄이 "물가 +12%"가 된다(임대료 표시는 4×1.12=4.48이라 아직 −4). 60초가 지나면 임대료가 −5(4×1.2544)로 바뀌며 잠깐 빨갛게 튄다.
- `run = { ...run, cash: 30 }; updateDashboard();` → 수익 바가 빨갛게 깜빡이고 사이렌이 켜진다. 매치해서 40 넘게 벌면 꺼진다.
- `run = { ...run, cash: 1 }; updateDashboard();` 후 기다리면 파산하고 결과 창에 최종 매출이 보인다. "Play Again"으로 시작 화면에 돌아간다.
- 게임 중 다른 탭으로 갔다 오면 "잠시 쉬는 중" 오버레이가 보이고, 그동안 `run.time`이 늘지 않는다. "계속하기"로 재개된다.
- 스크린샷을 남긴다.

- [ ] **Step 10: Commit**

```bash
git add index.html css_file.css js_file.js
git commit -m "feat: replace the timed game with the growth-mode economy loop

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: 확장 버튼, 투자 시트, 확장 연출, 클리어

**Files:**
- Modify: `index.html` (가게 영역에 확장 버튼, 투자 시트 추가)
- Modify: `css_file.css` (확장 버튼·시트 규칙)
- Modify: `js_file.js` (확장 관련 함수 추가, `updateDashboard`·`restartGame`·팝업 닫기 처리 수정)

**Interfaces:**
- Consumes: Task 5의 전역 함수·상태(`run`, `board`, `activeFruits`, `gameSession`, `isAnimating`, `sheetOpen`, `canAcceptInput`, `renderBuilding`, `updateStage`, `updateDashboard`, `buildGrid`, `renderBoard`, `cellPitch`, `fruitWrapper`, `clearAnimations`, `animate`, `wait`, `showComboEffect`, `endRun`, `stageInfo`, `fruitsForStage`, `formatMoney`, `FRUIT_NAMES`), `Board.expandBoard` (Task 2), `Economy.nextExpandCost`, `canExpand`, `expand`, `currentRent`, `projectedRent`, `isBankrupt` (Task 3)
- Produces: `openExpandSheet()`, `closeExpandSheet()`, `confirmExpand()`, `updateExpandButton()`, `withRo(word)`

- [ ] **Step 1: `index.html` — 확장 버튼**

가게 영역의 `<div class="ground"></div>` 바로 아래(`.shop-area` 안)에 추가한다.

```html
            <button class="expand-btn" id="expandBtn" onclick="openExpandSheet()" disabled>
                <span class="expand-title" id="expandTitle"></span>
                <span class="expand-hint" id="expandHint"></span>
            </button>
```

- [ ] **Step 2: `index.html` — 투자 시트**

`<div class="pause-overlay" id="pauseOverlay">` 블록 바로 아래에 추가한다.

```html
    <div class="sheet-overlay" id="expandSheet">
        <div class="sheet">
            <div class="sheet-header">
                <h2 id="sheetTitle"></h2>
                <span class="sheet-cost" id="sheetCost"></span>
            </div>
            <p class="sheet-summary" id="sheetSummary"></p>
            <p class="sheet-warning" id="sheetWarning" hidden>확장 직후 임대료 감당이 빠듯해집니다.</p>
            <div class="sheet-buildings">
                <div class="mini-building" id="sheetFrom"></div>
                <span class="sheet-arrow">→</span>
                <div class="mini-building" id="sheetTo"></div>
            </div>
            <div class="sheet-changes" id="sheetChanges"></div>
            <button class="start-btn sheet-confirm" id="sheetConfirm" onclick="confirmExpand()">확장한다</button>
            <button class="tutorial-btn sheet-cancel" onclick="closeExpandSheet()">조금 더 벌고 올게요</button>
        </div>
    </div>
```

- [ ] **Step 3: `css_file.css` — 확장 버튼과 시트**

`@media (prefers-reduced-motion: reduce)` 블록 바로 위에 추가한다.

```css
/* ---------- 확장 버튼 ---------- */

.expand-btn {
    position: absolute;
    right: 6px;
    bottom: 32px;
    z-index: 3;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
    padding: 5px 10px;
    font-family: inherit;
    color: var(--wood-dark);
    background: var(--cream);
    border: 3px solid var(--wood-dark);
    border-radius: 12px;
    box-shadow: 0 4px 0 var(--wood-dark);
    cursor: pointer;
    transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.expand-btn:disabled {
    opacity: 0.65;
    cursor: default;
}

.expand-btn.ready {
    background: var(--gold);
    animation: expandWiggle 1.4s ease-in-out infinite;
}

.expand-btn:not(:disabled):active {
    transform: translateY(3px);
    box-shadow: 0 1px 0 var(--wood-dark);
}

.expand-title {
    font-size: 14px;
    font-weight: 700;
}

.expand-hint {
    font-size: 11px;
    color: var(--wood);
}

.expand-btn.ready .expand-hint {
    color: var(--wood-dark);
}

@keyframes expandWiggle {
    0%, 60%, 100% { transform: rotate(0deg); }
    10% { transform: rotate(-3deg); }
    20% { transform: rotate(3deg); }
    30% { transform: rotate(-2deg); }
    40% { transform: rotate(0deg); }
}

/* ---------- 투자 시트 ---------- */

.sheet-overlay {
    position: fixed;
    inset: 0;
    z-index: 1050;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgba(90, 51, 16, 0.6);
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s ease, visibility 0.2s ease;
}

.sheet-overlay.show {
    opacity: 1;
    visibility: visible;
}

.sheet {
    width: 100%;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px 18px 24px;
    background: var(--cream);
    border: 5px solid var(--wood-dark);
    border-bottom: none;
    border-radius: 24px 24px 0 0;
    transform: translateY(100%);
    transition: transform 0.25s ease-out;
}

.sheet-overlay.show .sheet {
    transform: translateY(0);
}

.sheet-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
}

.sheet-header h2 {
    font-size: 21px;
}

.sheet-cost {
    font-size: 20px;
    font-weight: 700;
    color: var(--awning-red);
    white-space: nowrap;
}

.sheet-summary {
    font-size: 13px;
    color: var(--wood);
}

.sheet-warning {
    font-size: 13px;
    font-weight: 700;
    color: var(--awning-red);
}

.sheet-buildings {
    display: flex;
    align-items: flex-end;
    justify-content: space-around;
}

.sheet-arrow {
    padding-bottom: 20px;
    font-size: 28px;
    font-weight: 700;
}

.sheet-changes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
}

.sheet-change {
    padding: 8px 10px;
    background: var(--awning-cream);
    border: 2px solid var(--wood-light);
    border-radius: 12px;
}

.sheet-change-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--awning-red);
}

.sheet-change-value {
    font-size: 15px;
    font-weight: 700;
}

.sheet-confirm,
.sheet-cancel {
    width: 100%;
    min-width: 0;
}
```

그리고 `@media (prefers-reduced-motion: reduce)`의 애니메이션 끄는 선택자 목록에서 `    .siren-active,` 줄 바로 아래에 `    .expand-btn.ready,`를 추가한다.

- [ ] **Step 4: `js_file.js` — 확장 함수 추가**

`function updateDashboard() {` 바로 위에 추가한다.

```js
// "좌판으로", "매대로": 로 after a vowel or ㄹ, 으로 after any other final consonant.
function withRo(word) {
    const code = word.charCodeAt(word.length - 1) - 0xAC00;
    const finalConsonant = code >= 0 && code < 11172 ? code % 28 : 0;
    return word + (finalConsonant === 0 || finalConsonant === 8 ? '로' : '으로');
}

function updateExpandButton() {
    const button = document.getElementById('expandBtn');
    const cost = Economy.nextExpandCost(run, Tuning);
    if (cost === null) {
        button.hidden = true;
        return;
    }
    button.hidden = false;

    const isFinal = run.stage === Tuning.stages.length - 1;
    const nextName = stageInfo(run.stage + 1).name;
    document.getElementById('expandTitle').textContent = isFinal
        ? `${nextName} 세우기 · ${formatMoney(cost)}`
        : `${withRo(nextName)} 확장 · ${formatMoney(cost)}`;

    const ready = gameRunning && Economy.canExpand(run, Tuning);
    document.getElementById('expandHint').textContent = ready
        ? (isFinal ? '영업을 마치고 정산할 수 있어요' : '지금 확장할 수 있어요')
        : `수익 ${formatMoney(cost - Math.max(0, run.cash))} 더 필요`;
    button.disabled = !ready;
    button.classList.toggle('ready', ready);
}

function openExpandSheet() {
    if (!canAcceptInput() || !Economy.canExpand(run, Tuning)) return;
    sheetOpen = true;

    const cost = Economy.nextExpandCost(run, Tuning);
    const nextStage = run.stage + 1;
    const current = stageInfo(run.stage);
    const next = stageInfo(nextStage);
    const isFinal = nextStage === Tuning.stages.length;
    const cashAfter = run.cash - cost;
    const nextRent = Economy.projectedRent(run, Tuning, nextStage);

    document.getElementById('sheetTitle').textContent = isFinal
        ? `${next.name}을 세울까요?`
        : `${withRo(next.name)} 확장할까요?`;
    document.getElementById('sheetCost').textContent = '−' + formatMoney(cost);
    document.getElementById('sheetSummary').textContent = isFinal
        ? `영업을 마치고 정산합니다. 점수 = 매출 + 건물 가치 ${formatMoney(cost)} + 남은 수익 × ${Tuning.clearCashMultiplier}`
        : `수익 ${formatMoney(run.cash)} → ${formatMoney(cashAfter)}`;
    document.getElementById('sheetWarning').hidden = isFinal || cashAfter >= nextRent * Tuning.dangerSeconds;

    renderBuilding(document.getElementById('sheetFrom'), run.stage);
    renderBuilding(document.getElementById('sheetTo'), nextStage);

    const newFruit = Tuning.fruitOrder[next.fruits - 1];
    const changes = isFinal
        ? [['예상 점수', formatMoney(run.revenue + cost + cashAfter * Tuning.clearCashMultiplier)]]
        : [
            ['임대료', `${formatMoney(Economy.currentRent(run, Tuning))} → ${formatMoney(nextRent)} /초`],
            ['진열대', `${current.cols}×${current.rows} → ${next.cols}×${next.rows}`],
            ['과일', next.fruits > current.fruits ? `${FRUIT_NAMES[newFruit]} 입고 (${next.fruits}종)` : `그대로 (${next.fruits}종)`]
        ];
    const list = document.getElementById('sheetChanges');
    list.innerHTML = '';
    changes.forEach(([label, value]) => {
        const item = document.createElement('div');
        item.className = 'sheet-change';
        const labelElement = document.createElement('div');
        labelElement.className = 'sheet-change-label';
        labelElement.textContent = label;
        const valueElement = document.createElement('div');
        valueElement.className = 'sheet-change-value';
        valueElement.textContent = value;
        item.append(labelElement, valueElement);
        list.appendChild(item);
    });

    document.getElementById('sheetConfirm').textContent = isFinal ? '세우고 영업 마치기' : '확장한다';
    document.getElementById('expandSheet').classList.add('show');
}

function closeExpandSheet() {
    sheetOpen = false;
    document.getElementById('expandSheet').classList.remove('show');
}

async function confirmExpand() {
    if (!sheetOpen) return;
    closeExpandSheet();
    if (!canAcceptInput() || !Economy.canExpand(run, Tuning)) return;

    const session = gameSession;
    const previousFruits = activeFruits;
    isAnimating = true;
    run = Economy.expand(run, Tuning);
    GameAudio.playSuccess(3);
    updateDashboard();

    await showNewBuilding();
    if (session !== gameSession) return;

    if (run.ended === 'clear') {
        await wait(600);
        if (session !== gameSession) return;
        isAnimating = false;
        endRun();
        return;
    }

    await growBoard(session);
    if (session !== gameSession) return;

    const newFruit = activeFruits.find(fruit => !previousFruits.includes(fruit));
    if (newFruit) {
        showComboEffect(`${FRUIT_NAMES[newFruit]} 입고!`);
    }
    isAnimating = false;
    if (gameRunning && Economy.isBankrupt(run)) {
        endRun();
    }
}

async function showNewBuilding() {
    const building = updateStage();
    await animate(building, [
        { transform: 'translateX(-50%) scale(0.6)', opacity: 0 },
        { transform: 'translateX(-50%) scale(1.12)', opacity: 1, offset: 0.6 },
        { transform: 'translateX(-50%) scale(1)', opacity: 1 }
    ], { duration: 500, easing: 'ease-out' });
}

// Grows the board to the new stage's size; new cells drop in from above.
async function growBoard(session) {
    const info = stageInfo(run.stage);
    activeFruits = fruitsForStage(run.stage);
    const grown = Board.expandBoard(board, activeFruits, info.cols, info.rows, Math.random);
    board = grown.board;
    buildGrid(info.cols, info.rows);
    renderBoard();

    const pitch = cellPitch();
    await Promise.all(grown.added.map(cell => animate(fruitWrapper(cell), [
        { transform: `translateY(${-pitch}px) scale(0.4)`, opacity: 0 },
        { transform: 'translateY(0px) scale(1)', opacity: 1 }
    ], { duration: 350, delay: 40 * cell.col, easing: 'ease-out' })));
    if (session !== gameSession) return;
    grown.added.forEach(cell => clearAnimations(cell));
}
```

- [ ] **Step 5: `js_file.js` — 기존 함수 수정**

1. `updateDashboard()` 안의 `updateBoardInfo();` 다음 줄에 `updateExpandButton();`을 추가한다.

2. `restartGame()` 안의 `document.getElementById('pauseOverlay').classList.remove('show');` 다음 줄에 추가한다.

```js
    document.getElementById('expandSheet').classList.remove('show');
```

3. 파일 뒤쪽의 "Close popup when clicking outside" 리스너와 Escape 리스너를 아래처럼 바꾼다(시트 바깥을 누르거나 Escape를 누르면 시트도 닫힌다).

```js
// Close popup when clicking outside
document.addEventListener('click', function(e) {
    const tutorialPopup = document.getElementById('tutorialPopup');
    const rankingPopup = document.getElementById('rankingPopup');
    const expandSheet = document.getElementById('expandSheet');
    
    if (e.target === tutorialPopup) {
        closeTutorial();
    }
    if (e.target === rankingPopup) {
        closeRanking();
    }
    if (e.target === expandSheet) {
        closeExpandSheet();
    }
});

// Close popup with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeTutorial();
        closeRanking();
        if (sheetOpen) {
            closeExpandSheet();
        }
    }
});
```

- [ ] **Step 6: 문법 검사와 테스트**

Run: `node --check js_file.js && node --test tests/*.test.js`
Expected: 오류 없음, 테스트 전부 PASS.

- [ ] **Step 7: 브라우저 확인**

음소거 후 `startGame()`.

확인할 것:
- 확장 버튼이 가게 영역 오른쪽 아래에 "좌판으로 확장 · 1,300 / 수익 800 더 필요"(수익 500 기준)로 흐리게 보인다.
- `run = { ...run, cash: 5000 }; updateDashboard();` → 버튼이 노랗게 흔들리고 "지금 확장할 수 있어요". 누르면 시트가 아래에서 올라온다: "좌판으로 확장할까요?", "−1,300", "수익 5,000 → 3,700", 천막 → 좌판 그림, 임대료 "4 → 32 /초"(물가 없을 때), 진열대 "5×5 → 6×5", 과일 "키위 입고 (4종)".
- 시트가 열려 있는 동안 `run.time`이 늘지 않고 보드를 밀 수 없다. 시트 바깥을 누르거나 "조금 더 벌고 올게요"로 닫힌다.
- "확장한다" → 수익이 3,700으로 줄고, 건물이 좌판으로 통통 튀며 바뀌고, 뱃지가 "2단계 좌판", 보드 오른쪽에 새 열이 위에서 내려오고, "키위 입고!" 문구가 뜬다. 판 아래 줄이 "진열대 6×5 · 과일 4종"이다. 이후 매치로 키위가 섞여 나온다.
- 2단계에서 `run = { ...run, cash: 8500 }; updateDashboard();` 후 시트를 열면 "매대로 확장할까요?"(7,900)와 함께 "확장 직후 임대료 감당이 빠듯해집니다" 경고가 보인다(남는 600이 매대 임대료 10초분 1,360보다 적다). `cash: 20000`이면 경고가 없다.
- 백화점으로 바로 가기: `run = { ...run, stage: 6, cash: 5000000 }; newBoard(6); updateStage(); updateDashboard();` → 버튼 "우주 최강 건물 세우기 · 4,500,000", 판 아래 줄에 할증은 아직 없고, 20초 뒤 "백화점 할증 +15%"가 붙는다. 시트 제목 "우주 최강 건물을 세울까요?", 예상 점수 표시. "세우고 영업 마치기" → 건물이 바뀌고 잠시 뒤 결과 창. 결과 점수 = 매출 + 4,500,000 + 남은 수익×2.
- 확장 연출 중(약 1초) 스와이프가 먹지 않는다.
- 스크린샷: 시트가 열린 화면, 2단계 화면.

- [ ] **Step 8: Commit**

```bash
git add index.html css_file.css js_file.js
git commit -m "feat: invest in shop expansions with a confirm sheet and the clear ending

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: 결과 화면, 저장·랭킹 분리, 한국어 시작 화면

**Files:**
- Modify: `index.html` (시작 화면 문구, 결과 화면 마크업, 게임 방법 팝업)
- Modify: `css_file.css` (결과 화면 규칙)
- Modify: `js_file.js` (`showResult` 교체, `countUp` 추가, 제출 문구, 저장 키, 랭킹 컬렉션·헤더·더미 점수)

**Interfaces:**
- Consumes: Task 5·6의 전역(`run`, `score`, `highestScore`, `gameSession`, `renderBuilding`, `stageInfo`, `formatMoney`), `Tuning.leaderboardMinScore`
- Produces: 없음(마지막 태스크)

- [ ] **Step 1: `index.html` — 시작 화면 문구**

시작 화면의 문구만 바꾼다(구조와 클래스는 그대로).

- `📊 Last Score` → `📊 최근 점수`
- `🏆 Best Score` → `🏆 최고 점수`
- `📖 How to Play` → `📖 게임 방법`
- `🏆 Global Ranking` (시작 화면 버튼) → `🏆 이번 달 랭킹`
- `🎮 Start Game` → `🏪 개업하기`

- [ ] **Step 2: `index.html` — 결과 화면 마크업 교체**

`<div class="game-over" id="gameOver">` 블록 전체를 아래로 교체한다.

```html
    <div class="game-over" id="gameOver">
        <div class="game-over-content">
            <h2 id="resultTitle">파산 — 영업 종료</h2>
            <p class="result-subtitle" id="resultSubtitle"></p>

            <div class="result-label">총 매출 (점수)</div>
            <div class="final-score" id="finalScore">0</div>
            <div class="new-record-badge" id="newRecordBadge" hidden>★ 신기록</div>

            <div class="result-grade">
                <div class="mini-building" id="resultBuilding"></div>
                <div>
                    <div class="result-label">도달 등급</div>
                    <div class="result-grade-name" id="resultGrade"></div>
                </div>
            </div>

            <div class="result-stats">
                <div><b id="resultMaxMultiplier">x1.0</b><span>최고 배율</span></div>
                <div><b id="resultMaxChain">0</b><span>최장 체인</span></div>
            </div>

            <!-- Score submission form -->
            <div class="score-submit" id="scoreSubmit" style="display: none;">
                <p class="new-record-text">🎉 신기록! 랭킹에 이름을 올려 보세요</p>
                <input type="text" id="playerNameInput" placeholder="이름" maxlength="15" class="name-input">
                <div class="submit-buttons">
                    <button class="submit-score-btn" onclick="submitScore()">
                        <span class="btn-icon">🏆</span>
                        랭킹에 등록
                    </button>
                    <button class="skip-submit-btn" onclick="skipSubmit()">
                        <span class="btn-icon">⏭️</span>
                        건너뛰기
                    </button>
                </div>
            </div>

            <button class="restart-btn" id="playAgainBtn" onclick="restartGame()">다시 개업</button>
        </div>
    </div>
```

- [ ] **Step 3: `index.html` — 게임 방법 팝업**

`<div class="popup-overlay" id="tutorialPopup">` 안의 `<h2>📖 How to Play</h2>`를 `<h2>📖 게임 방법</h2>`로 바꾸고, `<div class="popup-body">`의 내용 전체를 아래로 교체한다.

```html
                <div class="rule-section">
                    <div class="rule-title">🍎 과일 팔기</div>
                    <div class="rule-text">과일을 위아래 양옆으로 밀어 같은 과일 3개 이상을 한 줄로 맞추면 팔려요. 연쇄로 터지면 훨씬 많이 팔리고, 같은 과일을 연달아 팔면 배율이 빨리 올라요.</div>
                </div>

                <div class="rule-section">
                    <div class="rule-title">💰 매출과 수익</div>
                    <div class="rule-text">판 돈은 매출(점수)과 수익(잔고)에 함께 쌓여요. 매출은 줄지 않지만, 수익은 임대료·인건비·물류비로 계속 빠져나가요. 수익이 0이 되면 파산!</div>
                </div>

                <div class="rule-section">
                    <div class="rule-title">🏪 가게 키우기</div>
                    <div class="rule-text">수익이 모이면 가게를 확장하세요. 진열대가 넓어지고 과일이 비싸게 팔리지만 임대료도 크게 올라요. 물가는 시간이 갈수록 오르니 너무 오래 망설이면 안 돼요.</div>
                </div>

                <div class="rule-section">
                    <div class="rule-title">🚀 우주 최강 건물</div>
                    <div class="rule-text">백화점에서 우주 최강 건물을 세우면 클리어! 건물 가치와 남은 수익 두 배가 점수에 더해져요. 하지만 백화점 임대료는 머무를수록 치솟아요.</div>
                </div>
```

랭킹 팝업의 `<span class="rank-name">You</span>`는 `<span class="rank-name">나</span>`로 바꾼다.

- [ ] **Step 4: `css_file.css` — 결과 화면 규칙**

기존 `.game-over-content` 규칙에 폭 제한을 추가하고(아래로 교체), `.final-score`의 `margin`을 줄인다.

```css
.game-over-content {
    width: calc(100% - 32px);
    max-width: 360px;
    max-height: calc(100vh - 32px);
    overflow-y: auto;
    background: var(--cream);
    border: 5px solid var(--wood-dark);
    padding: 24px 20px;
    border-radius: 22px;
    text-align: center;
    color: var(--wood-dark);
    box-shadow: 0 10px 0 var(--wood-dark);
}
```

`.final-score` 규칙의 `margin: 18px 0;`을 `margin: 2px 0 6px;`으로 바꾸고 `font-variant-numeric: tabular-nums;`를 추가한다.

`@media (prefers-reduced-motion: reduce)` 블록 바로 위에 추가한다.

```css
/* ---------- 결과 화면 ---------- */

.result-subtitle {
    margin-top: 4px;
    font-size: 14px;
    color: var(--wood);
}

.result-label {
    margin-top: 14px;
    font-size: 12px;
    font-weight: 700;
    color: var(--wood);
}

.new-record-badge {
    display: inline-block;
    padding: 3px 12px;
    font-size: 13px;
    font-weight: 700;
    color: var(--cream);
    background: var(--awning-red);
    border-radius: 12px;
}

.result-grade {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 14px;
    padding: 10px;
    text-align: left;
    background: var(--awning-cream);
    border: 3px solid var(--wood-light);
    border-radius: 16px;
}

.result-grade .result-label {
    margin-top: 0;
}

.result-grade-name {
    font-size: 20px;
    font-weight: 700;
}

.result-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 10px;
}

.result-stats div {
    display: flex;
    flex-direction: column;
    padding: 8px;
    color: var(--cream);
    background: var(--wood);
    border-radius: 12px;
}

.result-stats b {
    font-size: 20px;
}

.result-stats span {
    font-size: 11px;
}
```

- [ ] **Step 5: `js_file.js` — 결과 화면**

Task 5의 `showResult()` 함수(주석 `// Basic result popup. Task 7 replaces this with the full result screen.` 포함)를 아래 두 함수로 교체한다.

```js
function showResult() {
    const cleared = run.ended === 'clear';
    const minutes = Math.floor(run.time / 60);
    const seconds = Math.floor(run.time % 60);
    const played = `${minutes}분 ${seconds}초`;

    document.getElementById('resultTitle').textContent = cleared ? '클리어 — 우주 최강 건물 개업' : '파산 — 영업 종료';
    document.getElementById('resultSubtitle').textContent = cleared ? `${played} 만에 개업` : `${played} 버팀 · 임대료에 무릎`;

    const isNewPersonalBest = score > highestScore;
    document.getElementById('newRecordBadge').hidden = !isNewPersonalBest;

    renderBuilding(document.getElementById('resultBuilding'), run.stage);
    document.getElementById('resultGrade').textContent = `${run.stage}단계 ${stageInfo(run.stage).name}`;
    document.getElementById('resultMaxMultiplier').textContent = `x${run.maxMultiplier.toFixed(1)}`;
    document.getElementById('resultMaxChain').textContent = run.maxChain;

    const canSubmit = isNewPersonalBest && score >= Tuning.leaderboardMinScore;
    document.getElementById('scoreSubmit').style.display = canSubmit ? 'block' : 'none';
    document.getElementById('playAgainBtn').style.display = canSubmit ? 'none' : 'block';

    document.getElementById('gameOver').style.display = 'flex';
    countUp(document.getElementById('finalScore'), score, 1200);
}

// Rolls a number up to `target` like a jackpot counter.
function countUp(element, target, duration) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        element.textContent = formatMoney(target);
        return;
    }
    const session = gameSession;
    const start = performance.now();
    element.textContent = '0';

    function frame(now) {
        if (session !== gameSession) return;
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = formatMoney(target * eased);
        if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}
```

- [ ] **Step 6: `js_file.js` — 제출 문구 한국어로**

`submitScore()` 안의 문구를 바꾼다(로직은 그대로).

- `alert('Please enter your name!')` → `alert('이름을 입력해 주세요!')`
- `'<span class="btn-icon">⏳</span>Submitting...'` → `'<span class="btn-icon">⏳</span>등록 중...'`
- `alert('Successfully added to leaderboard! 🎉')` → `alert('랭킹에 등록했어요! 🎉')`
- `alert('Failed to submit score. Please try again.')` → `alert('등록에 실패했어요. 다시 시도해 주세요.')`
- `alert('An error occurred while submitting your score.')` → `alert('등록 중 오류가 났어요.')`

- [ ] **Step 7: `js_file.js` — 저장 키와 랭킹 컬렉션 분리**

1. `saveGameData()`와 `loadGameData()`의 `'fruitMarketData'` 두 곳을 `'fruitMarketGrowthData'`로 바꾼다.

2. `getCurrentMonthCollection()`의 반환 줄과 주석을 바꾼다.

```js
    return `growth_rankings_${year}_${month}`; // e.g., "growth_rankings_2026_09"
```

3. `showRanking()`의 헤더 설정 부분을 한국어로 바꾼다(`monthNames` 배열과 `currentMonth` 변수는 지운다).

```js
    const now = new Date();
    const header = popup.querySelector('.popup-header h2');
    header.textContent = `🏆 이번 달 랭킹 - ${now.getFullYear()}년 ${now.getMonth() + 1}월`;
```

4. 새 점수 규모에 맞게 `generateFakeRanking()`의 점수 범위를 바꾼다.

```js
    // Generate 10 random scores between 1,000,000 and 5,000,000
    const rankings = [];
    for (let i = 0; i < 10; i++) {
        const score = Math.floor(Math.random() * 4000000) + 1000000;
```

5. `initializeMonthlyRankings()`의 `dummyData` 점수를 새 규모로 바꾼다(이름과 주석은 그대로).

```js
        const dummyData = [
            { name: "God", score: 20000000 },        // 신
            { name: "Deity", score: 9000000 },       // 신들중에 가장 아래
            { name: "Demigod", score: 5000000 },     // 신의 바로 밑 인간
            { name: "Bookworm", score: 2500000 },    // 책을 읽을 줄 아는 인간
            { name: "Awakened", score: 1200000 },    // 정신차린 인간
            { name: "Noob", score: 600000 },         // 폐급 인간
            { name: "Human", score: 300000 },        // 드디어 인간
            { name: "Fruitarian", score: 150000 },   // 과일을 좋아하는 유인원
            { name: "Thinker", score: 80000 },       // 생각을 하는 유인원
            { name: "Ape", score: 30000 }            // 유인원
        ];
```

- [ ] **Step 8: 문법 검사와 테스트**

Run: `node --check js_file.js && node --test tests/*.test.js && grep -n "fruitMarketData\|rankings_\${" js_file.js`
Expected: 오류 없음, 테스트 전부 PASS. `grep` 결과에는 `fruitMarketGrowthData`와 `growth_rankings_` 줄만 나온다.

- [ ] **Step 9: 브라우저 확인**

음소거 후 확인한다.

- 시작 화면: 한국어 버튼(게임 방법, 이번 달 랭킹, 개업하기)과 점수 칸(최근 점수, 최고 점수). 게임 방법 팝업이 새 규칙 4개 섹션으로 보인다. 랭킹 팝업 헤더가 "🏆 이번 달 랭킹 - 2026년 9월" 형식이다. (Firebase에 새 컬렉션이 비어 있으면 가짜 랭킹 100만~500만 점이 보인다.)
- `localStorage.getItem('fruitMarketData')`가 게임 전후로 바뀌지 않는다.
- 게임을 시작해 조금 번 뒤 `run = { ...run, cash: 1 }; updateDashboard();`로 파산시킨다 → "파산 — 영업 종료", "N분 N초 버팀 · 임대료에 무릎", 점수가 0부터 촤르륵 올라간다, 천막 그림과 "1단계 천막", 최고 배율·최장 체인. 첫 판이면 "★ 신기록". 점수가 10만 미만이라 랭킹 등록 폼은 안 뜨고 "다시 개업" 버튼만 보인다.
- `localStorage.getItem('fruitMarketGrowthData')`에 방금 점수가 저장된다. 시작 화면 최근 점수에도 보인다.
- 클리어: Task 6의 "백화점으로 바로 가기"로 클리어 → "클리어 — 우주 최강 건물 개업", 우주 최강 건물 그림, "7단계 우주 최강 건물", 점수가 10만 이상이고 신기록이면 랭킹 등록 폼이 보인다. **실제 등록 버튼은 누르지 않는다**(실제 Firebase에 기록이 남는다). "건너뛰기" → "다시 개업".
- 결과 창이 375×812에서 넘치지 않는다(넘치면 창 안에서 스크롤된다).
- 스크린샷: 파산 결과 화면, 클리어 결과 화면.

- [ ] **Step 10: 시뮬레이터 재확인과 Commit**

Run: `node tools/sim.js 20`
Expected: Task 4 Step 2와 같은 표(이 태스크는 규칙 파일을 건드리지 않는다).

```bash
git add index.html css_file.css js_file.js
git commit -m "feat: growth-mode result screen, separate saves and rankings, Korean menus

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```
