# 가게 뒤 흐르는 그래프 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 가게 영역 하늘에 최근 30초의 매출·수익 그래프를 배경처럼 흐르게 그린다.

**Architecture:** 기록과 눈금 계산은 DOM 없는 새 모듈 `history.js`에 두고 Node 테스트로 검증한다. 컨트롤러는 0.5초마다 기록하고 `<canvas>`에 그린다. 규칙과 레이아웃은 바꾸지 않는다.

**Tech Stack:** 빌드 도구 없는 HTML/CSS/JavaScript, Canvas 2D, Node `node:test`

**Spec:** `docs/superpowers/specs/2026-09-19-growth-mode-phase1b-design.md` §13

## Global Constraints

- npm 패키지·빌드 도구를 추가하지 않는다. 경제 규칙(`economy.js`, `tuning.js`, `scoring.js`)과 밸런스는 건드리지 않는다. `node tools/sim.js 20`의 출력이 바뀌면 안 된다.
- `history.js`는 기존 규칙 모듈과 같은 형식이다: IIFE, 일반 `<script>`로 로드, 브라우저에서는 `window.History`, Node에서는 `module.exports`. DOM에 접근하지 않는다. 로드 순서는 `crowd.js` 다음, `js_file.js` 앞.
- 테스트는 테스트 파일 안의 고정 수치를 쓴다.
- 컨트롤러는 튜닝 값을 `rules`로 읽는다. `js_file.js`는 4칸 들여쓰기, 세미콜론. 색은 `:root` 변수만 쓴다(캔버스는 CSS 변수를 읽을 수 없으므로, 그릴 색은 `getComputedStyle(document.documentElement).getPropertyValue('--gold')`처럼 `:root`에서 읽어 쓴다).
- 그래프는 건물·손님보다 뒤에 그린다. 확장 버튼·단계 뱃지·소리 버튼을 가리지 않는다.
- **브라우저 확인은 음소거로**: `GameAudio.init(); GameAudio.setMuted(true); updateSoundButtons();`. 끝나면 서버를 멈추고 탭을 닫고, 저장소에 남은 임시 파일(예: `.playwright-mcp/`)을 지운다.
- 브라우저 확인: 미리보기 도구의 `fruit-market`(포트 8766) 또는 `python3 -m http.server 8799`, 375×812. 옛 JS가 보이면 `await Promise.all(['js_file.js','history.js','css_file.css','index.html'].map(f => fetch(f, {cache: 'reload'}))); location.reload();`. 창이 숨겨져 자동 일시정지되면 `resumeGame()`. 튜토리얼 건너뛰기: `localStorage.setItem('fruitMarketTutorialDone', 'true')`. 단계 안내 카드는 `closeStageCard()`.
- 커밋 메시지 끝에 정확히 이 줄(자기 모델 이름을 쓰지 않는다):
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  ```

---

### Task 1: 기록 모듈

**Files:**
- Create: `history.js`
- Test: `tests/history.test.js`
- Modify: `index.html` (스크립트 한 줄)

**Interfaces:**
- Produces (`window.History` / `require('../history.js')`):
  - `History.createHistory() → { samples: [] }`
  - `History.recordSample(history, time, revenue, cash, windowSeconds) → history` (새 객체. 창 밖 기록은 버린다. 같은 `time`이 다시 들어오면 마지막 기록을 덮어쓴다)
  - `History.samplesIn(history, time, windowSeconds) → { time, revenue, cash }[]`
  - `History.revenueRange(samples) → { min, max }` (기록이 없으면 `{ min: 0, max: 0 }`, 모두 같으면 `max = min + 1`로 벌려 0으로 나누는 일을 막는다)

- [ ] **Step 1: 테스트 작성 — `tests/history.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const History = require('../history.js');

test('recordSample keeps only what is inside the window and does not touch its input', () => {
    const first = History.recordSample(History.createHistory(), 0, 100, 500, 30);
    const second = History.recordSample(first, 10, 300, 400, 30);
    const later = History.recordSample(second, 40, 900, 200, 30);

    assert.deepEqual(first.samples, [{ time: 0, revenue: 100, cash: 500 }]);
    assert.deepEqual(second.samples.map(sample => sample.time), [0, 10]);
    assert.deepEqual(later.samples.map(sample => sample.time), [10, 40]);
});

test('recording the same moment twice replaces the last sample', () => {
    const history = History.recordSample(History.recordSample(History.createHistory(), 5, 100, 400, 30), 5, 180, 380, 30);
    assert.deepEqual(history.samples, [{ time: 5, revenue: 180, cash: 380 }]);
});

test('samplesIn returns the samples inside the window, oldest first', () => {
    let history = History.createHistory();
    [[0, 100, 500], [10, 300, 400], [40, 900, 200]].forEach(([time, revenue, cash]) => {
        history = History.recordSample(history, time, revenue, cash, 100);
    });
    assert.deepEqual(History.samplesIn(history, 45, 30).map(sample => sample.time), [40]);
    assert.deepEqual(History.samplesIn(history, 45, 100).map(sample => sample.time), [0, 10, 40]);
});

test('revenueRange spans the samples and never has zero height', () => {
    assert.deepEqual(History.revenueRange([]), { min: 0, max: 0 });
    assert.deepEqual(History.revenueRange([{ time: 0, revenue: 100, cash: 0 }, { time: 1, revenue: 400, cash: 0 }]), { min: 100, max: 400 });
    assert.deepEqual(History.revenueRange([{ time: 0, revenue: 250, cash: 0 }, { time: 1, revenue: 250, cash: 0 }]), { min: 250, max: 251 });
});
```

Run: `node --test tests/history.test.js`
Expected: FAIL — `Cannot find module '../history.js'`.

- [ ] **Step 2: `history.js` 작성**

```js
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
```

- [ ] **Step 3: `index.html`에 스크립트 추가**

`<script src="crowd.js"></script>` 바로 다음 줄에 추가한다.

```html
    <script src="history.js"></script>
```

- [ ] **Step 4: 확인**

Run: `node --test tests/*.test.js`
Expected: 전부 PASS (76개).

- [ ] **Step 5: Commit**

```bash
git add history.js tests/history.test.js index.html
git commit -m "feat: remember the last stretch of revenue and cash" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: 가게 뒤에 그리기

**Files:**
- Modify: `index.html` (가게 영역에 캔버스)
- Modify: `css_file.css` (캔버스 자리)
- Modify: `js_file.js` (기록·그리기, 판 시작·종료 처리)

**Interfaces:**
- Consumes: `History.*` (Task 1), `run`, `Economy.expandRequirement`, `Economy.isInDanger`, `rules`
- Produces: `drawShopGraph()`, 상태 `history`, `graphClock`

- [ ] **Step 1: `index.html` — 캔버스**

`<div class="shop-area">` 안, `<div class="stage-badge">` 바로 앞에 추가한다(건물·손님보다 먼저 와야 뒤에 그려진다).

```html
            <canvas class="shop-graph" id="shopGraph" aria-hidden="true"></canvas>
```

- [ ] **Step 2: `css_file.css`**

`.building-slot { … }` 규칙 바로 위에 추가한다.

```css
/* 가게 뒤에 흐르는 매출·수익 그래프 (건물과 손님보다 뒤) */
.shop-graph {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 26px;
    z-index: 1;
    width: 100%;
    pointer-events: none;
}
```

- [ ] **Step 3: `js_file.js` — 상태**

`let crowdClock = 0;` 바로 다음에 추가한다.

```js
let history = History.createHistory();
let graphClock = 0;
const GRAPH_WINDOW_SECONDS = 30;
const GRAPH_SAMPLE_SECONDS = 0.5;
```

- [ ] **Step 4: `js_file.js` — 그리기**

`function updateCrowd() { … }` 함수 바로 다음에 추가한다.

```js
// Reads a colour straight from the theme: canvas cannot resolve CSS variables itself.
function themeColor(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// The last 30 seconds behind the shop: revenue as a filled slope, cash as a line.
function drawShopGraph() {
    const canvas = document.getElementById('shopGraph');
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const heightPx = canvas.clientHeight;
    if (width === 0 || heightPx === 0) return;
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(heightPx * ratio)) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(heightPx * ratio);
    }

    const context = canvas.getContext('2d');
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, heightPx);

    const samples = History.samplesIn(history, run.time, GRAPH_WINDOW_SECONDS);
    if (samples.length < 2) return;

    const start = run.time - GRAPH_WINDOW_SECONDS;
    const x = sample => ((sample.time - start) / GRAPH_WINDOW_SECONDS) * width;
    const top = heightPx * 0.12;
    const bottom = heightPx * 0.96;

    const range = History.revenueRange(samples);
    const revenueY = sample => bottom - ((sample.revenue - range.min) / (range.max - range.min)) * (bottom - top);

    context.beginPath();
    context.moveTo(x(samples[0]), revenueY(samples[0]));
    samples.forEach(sample => context.lineTo(x(sample), revenueY(sample)));
    context.lineTo(x(samples[samples.length - 1]), heightPx);
    context.lineTo(x(samples[0]), heightPx);
    context.closePath();
    context.globalAlpha = 0.22;
    context.fillStyle = themeColor('--gold');
    context.fill();

    context.globalAlpha = 0.55;
    context.lineWidth = 2;
    context.strokeStyle = themeColor('--gold');
    context.beginPath();
    samples.forEach((sample, index) => {
        const method = index === 0 ? 'moveTo' : 'lineTo';
        context[method](x(sample), revenueY(sample));
    });
    context.stroke();

    const requirement = Economy.expandRequirement(run, rules);
    const cashTop = requirement || Math.max(1, ...samples.map(sample => sample.cash));
    const cashY = sample => bottom - Math.min(1, Math.max(0, sample.cash) / cashTop) * (bottom - top);

    context.globalAlpha = 0.75;
    context.lineWidth = 3;
    context.strokeStyle = themeColor(Economy.isInDanger(run, rules) ? '--awning-red' : '--leaf');
    context.beginPath();
    samples.forEach((sample, index) => {
        const method = index === 0 ? 'moveTo' : 'lineTo';
        context[method](x(sample), cashY(sample));
    });
    context.stroke();
    context.globalAlpha = 1;
}

function clearShopGraph() {
    history = History.createHistory();
    graphClock = 0;
    const canvas = document.getElementById('shopGraph');
    const context = canvas.getContext('2d');
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
}
```

- [ ] **Step 5: `js_file.js` — 언제 기록하고 그리나**

1. `onTick()`에서 손님 갱신 블록(`crowdClock += TICK_SECONDS; … }`) 바로 다음에 추가한다.

```js
    graphClock += TICK_SECONDS;
    if (graphClock >= GRAPH_SAMPLE_SECONDS - 1e-9) {
        graphClock = 0;
        history = History.recordSample(history, run.time, run.revenue, run.cash, GRAPH_WINDOW_SECONDS);
        drawShopGraph();
    }
```

2. `actuallyStartGame()`에서 `clearCustomers();` 바로 다음 줄에 `clearShopGraph();`를 추가한다.

3. `restartGame()`에서 `clearCustomers();` 바로 다음 줄에 `clearShopGraph();`를 추가한다.

- [ ] **Step 6: 문법 검사와 테스트**

Run: `node --check js_file.js && node --test tests/*.test.js`
Expected: 오류 없음, 76개 PASS.

Run: `node tools/sim.js 20 | tail -1`
Expected: `초고수 (0.8s)  |   20/20 |        6:30 |            7 |   46,897,932 | 2@13s 3@30s 4@57s 5@70s 6@77s 7@104s`

- [ ] **Step 7: 브라우저 확인**

음소거 후 `startGame()`, 카드는 `closeStageCard()`.

- 매치를 몇 번 하면 가게 뒤 하늘에 금색 면(매출)과 초록 선(수익)이 나타나 왼쪽으로 흐른다.
- 선이 **건물과 손님 뒤**에 있다. 단계 뱃지, 소리 버튼, 확장 표시판을 가리지 않는다.
- 돈을 쓰면 초록 선이 내려가고, 매치하면 올라간다. 금색 면은 계속 오른다.
- 위기(`run = { ...run, cash: 30 }; updateDashboard();`)에서 초록 선이 빨간 선으로 바뀐다.
- 30초가 지나면 왼쪽 끝이 잘려 나가며 흐른다(옛 기록이 남지 않는다).
- 확장 창이나 단계 안내 카드가 떠 있는 동안에는 선이 멈춰 있다.
- 🏠 → 다시 개업하면 그래프가 빈 상태에서 시작한다.
- 화면이 선명하다(글씨처럼 뭉개지지 않는다).
- 스크린샷: 그래프가 그려진 가게 영역.

- [ ] **Step 8: Commit**

```bash
git add index.html css_file.css js_file.js
git commit -m "feat: draw the last 30 seconds of money behind the shop" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```
