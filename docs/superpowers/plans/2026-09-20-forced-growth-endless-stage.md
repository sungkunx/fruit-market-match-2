# 머무를 수 없는 성장과 끝없는 7단계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 확장할 돈이 모이면 반드시 확장하게 하고(확인 버튼 하나짜리 창), 클리어 엔딩 대신 끝없는 7단계 "우주 최강 건물"을 만든다.

**Architecture:** 규칙(`economy.js`, `tuning.js`)에서 클리어·연장전을 없애고 7단계를 평범한 마지막 단계로, 할증을 7단계로 옮긴다. 시뮬레이터 봇은 확장 가능하면 바로 확장한다. 컨트롤러는 확장 창을 저절로 열고 닫을 수 없게 하며, 확장 버튼은 진행 표시판이 된다.

**Tech Stack:** 빌드 도구 없는 HTML/CSS/JavaScript, Node `node:test`

**Spec:** `docs/superpowers/specs/2026-09-19-growth-mode-phase1b-design.md` §11

## Global Constraints

- npm 패키지·빌드 도구를 추가하지 않는다.
- 규칙 모듈은 DOM 없는 순수 함수, 입력을 바꾸지 않는다. 테스트는 테스트 파일 안의 고정 수치(`T`)를 쓴다. 모든 규칙 수치는 `tuning.js`에만 둔다.
- 컨트롤러는 튜닝 값을 `rules`로 읽는다. 돈은 `formatMoney()`(`$` 포함)로 표시한다.
- `js_file.js`는 4칸 들여쓰기, 세미콜론. 색은 `:root` 변수만.
- **브라우저 확인은 음소거로**: `GameAudio.init(); GameAudio.setMuted(true); updateSoundButtons();`. 끝나면 서버를 멈추고 탭을 닫는다. 실제 랭킹 등록 버튼은 누르지 않는다.
- 브라우저 확인: 미리보기 도구의 `fruit-market`(포트 8766) 또는 `python3 -m http.server 8797`, 375×812. 옛 JS가 보이면 `await Promise.all(['js_file.js','economy.js','tuning.js','css_file.css','index.html'].map(f => fetch(f, {cache: 'reload'}))); location.reload();`. 창이 숨겨져 자동 일시정지되면 `resumeGame()`. 튜토리얼 건너뛰기: `localStorage.setItem('fruitMarketTutorialDone', 'true')`. 실시간으로 임대료가 빠지니 콘솔 테스트에는 돈을 넉넉히 넣는다.
- 커밋 메시지 끝에 정확히 이 줄(자기 모델 이름을 쓰지 않는다):
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  ```

---

### Task 1: 규칙 — 클리어·연장전 제거, 끝없는 7단계, 7단계 할증

**Files:**
- Modify: `economy.js` (전체 교체)
- Modify: `tuning.js` (전체 교체)
- Modify: `tools/sim.js` (전체 교체)
- Test: `tests/economy.test.js`

**Interfaces:**
- Produces: `Economy.expand`는 더 이상 `ended`를 바꾸지 않는다(7단계로 가도 판이 계속된다). `Economy.expandRequirement`는 마지막 단계 진입에도 준비금을 더한다. `Economy.finalScore(run)`은 `floor(run.revenue)`(두 번째 인자 없음). `Economy.stayOvertime`, `run.overtime`, `Tuning.clearCashMultiplier`는 없다. `Tuning.stages[6]`은 단가 8100, 임대료 9000, 물류비 540. `Tuning.surchargeStage === 7`, `Tuning.surchargeRate === 1.2`.

- [ ] **Step 1: 테스트 먼저 — `tests/economy.test.js`**

1. 고정 수치 `T`에서 마지막 단계 줄을 진짜 단계로 바꾼다.

```js
        { name: 's7', cols: 7, rows: 7, fruits: 7, price: 10, rent: 200, logistics: 12, expandCost: null }
```

2. `T`에서 `    clearCashMultiplier: 2,` 줄을 지운다.

3. `test('the reserve uses today\'s inflation and is not needed for the clear', ...)` 테스트 전체를 아래로 바꾼다.

```js
test('the reserve uses today\'s inflation, including for the last stage', () => {
    assert.equal(Economy.expandRequirement(runAt({ time: 30 }), T), 1000 + 20 * 1.5 * 10);
    assert.equal(Economy.expandRequirement(runAt({ stage: 6 }), T), 6000 + 200 * 10);
    assert.equal(Economy.expandRequirement(runAt({ stage: 7 }), T), null);
});
```

4. `test('expanding from the last stage before the clear ends the run as a clear', ...)` 테스트 전체를 아래로 바꾼다.

```js
test('the last stage is endless: expanding into it keeps the run going and it cannot grow further', () => {
    const run = Economy.expand(runAt({ stage: 6, cash: 9000, revenue: 50000 }), T);
    assert.equal(run.stage, 7);
    assert.equal(run.ended, null);
    assert.equal(run.cash, 3000);
    assert.equal(Economy.nextExpandCost(run, T), null);
    assert.equal(Economy.canExpand(run, T), false);
    assert.equal(Economy.finalScore(run), 50000);
});
```

5. `the run goes bankrupt at zero cash and scores its revenue` 테스트의 `assert.equal(Economy.finalScore(run, T), 1234);`를 `assert.equal(Economy.finalScore(run), 1234);`로 바꾼다.

6. 파일 끝의 연장전 테스트 두 개(`a run starts outside overtime, ...`와 `an ended run cannot go into overtime`)를 지운다.

Run: `node --test tests/economy.test.js`
Expected: FAIL — 마지막 단계 준비금 테스트(6000 ≠ 8000)와 끝없는 단계 테스트(`ended`가 `'clear'`).

- [ ] **Step 2: `economy.js` 전체 교체**

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

    function createRun(tuning, options = {}) {
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
            // A practice (tutorial) run never goes bankrupt and never shows danger.
            tutorial: Boolean(options.tutorial),
            // Room for phase 2 cards (e.g. rent: 0.8 for -20% rent). Phase 1 keeps them at 1.
            modifiers: { rent: 1, labor: 1, logistics: 1, revenue: 1 }
        };
    }

    function keepTutorialCash(state, cash) {
        return state.tutorial ? Math.max(0, cash) : cash;
    }

    function inflation(state, tuning) {
        return Math.pow(tuning.inflationRate, Math.floor(state.time / tuning.inflationInterval));
    }

    // Extra rent that keeps climbing the longer the shop stays at the endless last stage.
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
            cash: keepTutorialCash(state, cash),
            time: round3(state.time + dt),
            stageTime: round3(state.stageTime + dt),
            logisticsTimer,
            combo: { ...state.combo, multiplier: Scoring.decayMultiplier(state.combo.multiplier, dt, tuning.multiplierDecay) }
        };
    }

    // Labor is paid for every swap, including ones that bounce back.
    function chargeSwap(state, tuning) {
        if (state.ended) return state;
        return { ...state, cash: keepTutorialCash(state, state.cash - tuning.laborPerSwap * state.modifiers.labor), swaps: state.swaps + 1 };
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

    // Cash needed before expanding: the cost plus a reserve of the next stage's rent, so the
    // bigger shop does not go bankrupt before its first sale. Only the cost is paid.
    // Null at the last stage.
    function expandRequirement(state, tuning) {
        const cost = nextExpandCost(state, tuning);
        if (cost === null) return null;
        return cost + projectedRent(state, tuning, state.stage + 1) * tuning.expandReserveSeconds;
    }

    function canExpand(state, tuning) {
        const requirement = expandRequirement(state, tuning);
        return !state.ended && requirement !== null && state.cash >= requirement;
    }

    // Pays for the next stage. The last stage is endless: the run goes on until bankruptcy.
    function expand(state, tuning) {
        if (!canExpand(state, tuning)) return state;
        return {
            ...state,
            cash: state.cash - nextExpandCost(state, tuning),
            stage: state.stage + 1,
            stageTime: 0
        };
    }

    function isBankrupt(state) {
        return !state.ended && !state.tutorial && state.cash <= 0;
    }

    function bankrupt(state) {
        return state.ended ? state : { ...state, ended: 'bankrupt' };
    }

    // Danger: only enough cash left for a few seconds of rent.
    function isInDanger(state, tuning) {
        return !state.ended && !state.tutorial && state.cash <= currentRent(state, tuning) * tuning.dangerSeconds;
    }

    // Revenue is the score.
    function finalScore(state) {
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
        expandRequirement,
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

- [ ] **Step 3: `tuning.js` 전체 교체**

```js
// Every number the growth mode is balanced on. Tune here, then run `node tools/sim.js`.
(function (root) {
    'use strict';

    const Tuning = {
        startCash: 500,
        fruitOrder: ['apple', 'banana', 'grape', 'kiwi', 'orange', 'strawberry', 'cherry'],
        frameSize: 7,
        // expandCost is what it takes to leave this stage. The last stage is endless.
        stages: [
            { name: '천막', cols: 5, rows: 5, fruits: 4, price: 5, rent: 14, logistics: 0, expandCost: 1680 },
            { name: '좌판', cols: 6, rows: 5, fruits: 5, price: 21, rent: 50, logistics: 6, expandCost: 9480 },
            { name: '매대', cols: 6, rows: 6, fruits: 5, price: 62, rent: 150, logistics: 16, expandCost: 34800 },
            { name: '편의점', cols: 6, rows: 6, fruits: 6, price: 248, rent: 450, logistics: 21, expandCost: 50400 },
            { name: '대형마트', cols: 6, rows: 7, fruits: 6, price: 740, rent: 1660, logistics: 72, expandCost: 100800 },
            { name: '백화점', cols: 7, rows: 7, fruits: 7, price: 2700, rent: 6000, logistics: 180, expandCost: 1000000 },
            { name: '우주 최강 건물', cols: 7, rows: 7, fruits: 7, price: 8100, rent: 9000, logistics: 540, expandCost: null }
        ],
        // The one-time practice shop (tutorial). It replaces the first stage for that run only.
        tutorialStage: { name: '연습 천막', cols: 5, rows: 5, fruits: 3, price: 2, rent: 2, logistics: 0, expandCost: 200 },
        // Practice pacing: seconds bubble 2 shows before the rent tip, and the least time the rent tip stays up.
        practiceRentTipSeconds: 4,
        practiceStepMinSeconds: 3,
        inflationRate: 1.15,
        inflationInterval: 30,
        surchargeStage: 7,
        surchargeRate: 1.2,
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
```

- [ ] **Step 4: `tools/sim.js` 전체 교체**

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
```

- [ ] **Step 5: 확인**

Run: `node --test tests/*.test.js`
Expected: 전부 PASS (69개).

Run: `grep -nE "clear|overtime" economy.js tuning.js tools/sim.js tests/economy.test.js`
Expected: 출력 없음.

Run: `node tools/sim.js 20`
Expected (정확히 같아야 한다):

```
runs per player: 20
player      | stage 7 | median time | median stage | median score | stage reached at (median run)
설렁설렁 (3s)   |    0/20 |        5:44 |            2 |       37,288 | 2@108s
보통 (2s)     |    0/20 |        6:24 |            5 |    1,056,763 | 2@58s 3@98s 4@172s 5@272s
잘함 (1.3s)   |   20/20 |        6:37 |            7 |   20,178,890 | 2@26s 3@68s 4@100s 5@129s 6@164s 7@234s
고수 (1s)     |   20/20 |        6:25 |            7 |   31,374,813 | 2@23s 3@54s 4@90s 5@98s 6@108s 7@123s
초고수 (0.8s)  |   20/20 |        6:30 |            7 |   46,897,932 | 2@13s 3@30s 4@57s 5@70s 6@77s 7@104s
```

`js_file.js`는 아직 옛 API(`stayOvertime`, `finalScore(run, rules)`의 두 번째 인자, `run.ended === 'clear'`)를 쓴다. 두 번째 인자는 무시되고 나머지는 Task 2에서 고친다. 이 태스크에서는 `js_file.js`를 건드리지 않는다.

- [ ] **Step 6: Commit**

```bash
git add economy.js tuning.js tools/sim.js tests/economy.test.js
git commit -m "feat: endless last stage instead of a clear ending, no overtime" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: 화면 — 저절로 뜨는 닫을 수 없는 확장 창, 진행 표시판, 클리어 흔적 제거

**Files:**
- Modify: `index.html` (확장 버튼 → 표시판, 확인 창 안내·취소 버튼 삭제, 게임 방법 문구)
- Modify: `css_file.css` (표시판, `.sheet-note`·`.coach-bubble.point-expand` 삭제)
- Modify: `js_file.js`

**Interfaces:**
- Consumes: Task 1의 `Economy` (`stayOvertime` 없음, `finalScore(run)`, 끝없는 7단계)
- Produces: `offerExpansion()`(단계와 상관없이 확장 가능하면 창을 연다), 닫을 수 없는 확장 창

- [ ] **Step 1: `index.html`**

1. 확장 버튼 네 줄을 `<div>` 표시판으로 바꾼다.

```html
            <div class="expand-btn" id="expandBtn">
                <span class="expand-title" id="expandTitle"></span>
                <span class="expand-hint" id="expandHint"></span>
            </div>
```

(원래: `<button class="expand-btn" id="expandBtn" onclick="openExpandSheet()" disabled>` … `</button>`)

2. 확인 창에서 `<p class="sheet-note" id="sheetNote">…</p>` 줄과 `<button class="tutorial-btn sheet-cancel" id="sheetCancel" …>…</button>` 줄을 지운다.

3. 게임 방법 팝업의 "🚀 우주 최강 건물" 설명(`rule-text`)을 바꾼다.

```html
                    <div class="rule-text">백화점에서 돈이 모이면 우주 최강 건물로! 여기서부터는 끝없는 영업이에요. 버틸수록 임대료가 계속 오르니, 최대한 오래 버티며 매출을 올리세요.</div>
```

- [ ] **Step 2: `css_file.css`**

1. `.expand-btn` 규칙 안에 `cursor: pointer;` 줄이 있으면 지운다.
2. `.expand-btn:disabled { ... }` 규칙을 아래로 바꾼다.

```css
.expand-btn:not(.ready) {
    opacity: 0.65;
}
```

3. `.expand-btn:not(:disabled):active { ... }` 규칙을 지운다.
4. `.sheet-note { ... }` 규칙을 지운다.
5. `/* 확장 버튼 바로 아래에서 버튼을 가리킨다 */` 주석과 `.coach-bubble.point-expand { ... }`, `.coach-bubble.point-expand::before { ... }` 규칙을 지운다.

- [ ] **Step 3: `js_file.js` — 상수와 상태**

1. `STAGE_TIPS`의 여섯 번째 문구를 바꾸고 일곱 번째를 더한다.

```js
    '넓어진 진열대로 크게 벌 때예요',
    '마지막 과일까지 입고! 다음은 끝없는 우주 영업이에요',
    '끝없는 우주 영업! 버틸수록 임대료가 계속 올라요'
];
```

2. `let offeredStage = 0; // the stage whose expansion offer already popped up` 줄을 지운다. `actuallyStartGame()`과 `restartGame()`의 `offeredStage = 0;` 줄도 지운다.

3. `PRACTICE_LINES`에서 `4: '돈이 모였어요. 가게를 키워 보세요!'` 줄을 지우고, 그 앞 줄(`3: …`) 끝의 쉼표를 지운다.

- [ ] **Step 4: `js_file.js` — 표시판과 확장 창**

1. `updateExpandButton()` 함수 전체를 바꾼다.

```js
// A sign showing how far the next expansion is. The shop grows by itself once it is reached.
function updateExpandButton() {
    const sign = document.getElementById('expandBtn');
    const cost = Economy.nextExpandCost(run, rules);
    if (cost === null) {
        sign.hidden = true;
        return;
    }
    sign.hidden = false;

    const nextName = stageInfo(run.stage + 1).name;
    document.getElementById('expandTitle').textContent = `${withRo(nextName)} 확장 · ${formatMoney(cost)}`;

    const ready = gameRunning && Economy.canExpand(run, rules);
    const shortfall = formatMoney(Economy.expandRequirement(run, rules) - Math.max(0, run.cash));
    document.getElementById('expandHint').textContent = ready ? '곧 확장해요!' : `준비금 포함 ${shortfall} 더 필요`;
    sign.classList.toggle('ready', ready);
}
```

2. `openExpandSheet()` 함수 전체를 바꾼다.

```js
// The shop is about to grow: shows what changes, with a single button to go on.
function openExpandSheet() {
    if (!canAcceptInput() || !Economy.canExpand(run, rules)) return;
    sheetOpen = true;

    const cost = Economy.nextExpandCost(run, rules);
    const nextStage = run.stage + 1;
    const current = stageInfo(run.stage);
    const next = stageInfo(nextStage);
    const cashAfter = run.cash - cost;
    const nextRent = Economy.projectedRent(run, rules, nextStage);

    document.getElementById('sheetTitle').textContent = `${withRo(next.name)} 확장!`;
    document.getElementById('sheetCost').textContent = '−' + formatMoney(cost);
    document.getElementById('sheetSummary').textContent = `수익 ${formatMoney(run.cash)} → ${formatMoney(cashAfter)} · 새 임대료 ${Math.floor(cashAfter / nextRent)}초분 확보`;

    renderBuilding(document.getElementById('sheetFrom'), run.stage);
    renderBuilding(document.getElementById('sheetTo'), nextStage);

    const newFruit = rules.fruitOrder[next.fruits - 1];
    const hasNewFruit = next.fruits > current.fruits;
    const changes = [
        ['임대료', `${formatMoney(Economy.currentRent(run, rules))} → ${formatMoney(nextRent)} /초`],
        ['진열대', `${current.cols}×${current.rows} → ${next.cols}×${next.rows}`],
        ['과일', hasNewFruit ? `${FRUIT_NAMES[newFruit]} 입고 (${next.fruits}종)` : `그대로 (${next.fruits}종)`, hasNewFruit ? fruitSrc(newFruit, '001') : null]
    ];
    const list = document.getElementById('sheetChanges');
    list.innerHTML = '';
    changes.forEach(([label, value, image]) => {
        const item = document.createElement('div');
        item.className = 'sheet-change';
        const labelElement = document.createElement('div');
        labelElement.className = 'sheet-change-label';
        labelElement.textContent = label;
        const valueElement = document.createElement('div');
        valueElement.className = 'sheet-change-value';
        valueElement.textContent = value;
        if (image) {
            const fruitImage = document.createElement('img');
            fruitImage.className = 'sheet-change-fruit';
            fruitImage.src = image;
            fruitImage.alt = '';
            valueElement.prepend(fruitImage);
        }
        item.append(labelElement, valueElement);
        list.appendChild(item);
    });

    document.getElementById('sheetConfirm').textContent = '확장하기';
    document.getElementById('expandSheet').classList.add('show');
}
```

3. `offerExpansion()`을 바꾸고 `declineExpansion()` 함수(위 주석 `// Closing the sheet without expanding …` 포함)를 지운다.

```js
// The shop grows as soon as it can afford to: the sheet opens by itself when nothing else is on
// screen. In the practice shop it waits until the rent lesson has been shown (step 4).
function offerExpansion() {
    if (!canAcceptInput() || !Economy.canExpand(run, rules)) return;
    if (run.tutorial && practiceStep !== 4) return;
    openExpandSheet();
}
```

4. `confirmExpand()`에서 클리어 블록을 지운다.

```js
    if (run.ended === 'clear') {
        await wait(600);
        if (session !== gameSession) return;
        isAnimating = false;
        expanding = false;
        endRun();
        return;
    }

```

5. 파일 뒤쪽 바깥 클릭 리스너에서 `const expandSheet = document.getElementById('expandSheet');` 줄과 `if (e.target === expandSheet) { declineExpansion(); }` 블록을 지운다. Escape 리스너에서 `if (sheetOpen) { declineExpansion(); }` 블록을 지운다. (확장 창은 "확장하기"로만 닫힌다.)

- [ ] **Step 5: `js_file.js` — 결과·판 정보·튜토리얼**

1. `endRun()`의 두 줄을 바꾼다.

```js
    run = Economy.bankrupt(run);
    score = Economy.finalScore(run);
```

2. `showResult()`에서 `const cleared = run.ended === 'clear';` 줄을 지우고, 제목·부제 두 줄을 바꾼다.

```js
    document.getElementById('resultTitle').textContent = '파산 — 영업 종료';
    document.getElementById('resultSubtitle').textContent = `${played} 버팀 · 임대료에 무릎`;
```

3. `updateBoardInfo()`의 `` ` · 백화점 할증 +${surchargePercent}%` ``를 `` ` · 할증 +${surchargePercent}%` ``로 바꾼다.

4. `setPracticeStep()`에서 아래 세 줄을

```js
    bubble.classList.toggle('point-expand', step === 4);
    document.getElementById('coachText').textContent = PRACTICE_LINES[step];
    bubble.hidden = false;
```

아래로 바꾼다(4단계에는 말풍선이 없고, 확장 창이 저절로 뜬다).

```js
    const line = PRACTICE_LINES[step];
    document.getElementById('coachText').textContent = line || '';
    bubble.hidden = !line;
```

- [ ] **Step 6: 남은 흔적과 테스트**

Run: `grep -nE "offeredStage|declineExpansion|stayOvertime|overtime|isFinal|clearCashMultiplier|'clear'|point-expand|sheetNote|sheetCancel|백화점 할증|openExpandSheet\(\)\"" js_file.js css_file.css index.html`
Expected: 출력 없음.

Run: `node --check js_file.js && node --test tests/*.test.js`
Expected: 오류 없음, 69개 PASS.

- [ ] **Step 7: 브라우저 확인**

튜토리얼 건너뛰기 설정 후 음소거, `startGame()`, 단계 안내 카드는 `closeStageCard()`.

- 오른쪽 아래 표시판이 "좌판으로 확장 · $1,680 / 준비금 포함 $… 더 필요"로 흐리게 보이고, 눌러도 아무 일이 없다.
- `run = { ...run, cash: Economy.expandRequirement(run, rules) + 50 }; updateDashboard();` → 0.1초 안에 "좌판으로 확장!" 창이 저절로 뜬다. 버튼은 "확장하기" 하나. 바깥 탭·Escape로 닫히지 않는다. 떠 있는 동안 `run.time`이 멈춘다.
- "확장하기" → 확장 연출 → 2단계 안내 카드. 카드를 닫고 다시 요건만큼 돈을 넣으면 또 저절로 뜬다(단계마다 몇 번이든).
- 매치 연출 중 요건을 넘으면 연출이 끝난 뒤 뜬다.
- 백화점으로 가서(`run = { ...run, stage: 6, cash: 1e8 }; newBoard(6); updateStage(); updateDashboard();`) 창 제목이 "우주 최강 건물로 확장!"(받침 ㄹ 뒤라 "로") → 확장 → 7단계 안내 카드(팁 7번). 7단계에서 표시판이 사라진다. 20초 뒤 판 아래 줄에 "할증 +20%".
- 7단계에서 `run = { ...run, cash: 1 }; updateDashboard();` → 파산 → "파산 — 영업 종료", 도달 등급 "7단계 우주 최강 건물", 점수는 매출만.
- 튜토리얼(`localStorage.removeItem('fruitMarketTutorialDone')` 후 새로고침, 개업): 말풍선 1 → 2 → 3, 3번이 최소 시간 보인 뒤 돈이 모이면 말풍선이 사라지고 창이 저절로 뜬다. "확장하기" → 튜토리얼 끝 카드.
- 게임 방법 팝업의 우주 최강 건물 설명이 새 문구다.
- 스크린샷: 저절로 뜬 확장 창, 7단계 화면.

- [ ] **Step 8: Commit**

```bash
git add index.html css_file.css js_file.js
git commit -m "feat: grow the shop the moment it can, endless last stage on screen" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```
