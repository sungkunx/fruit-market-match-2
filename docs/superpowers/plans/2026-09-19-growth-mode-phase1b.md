# 성장형 1.5단계 (난이도·튜토리얼·손님·단계 안내·로고) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 초반 난이도를 올리고, 처음 한 번만 하는 튜토리얼, 벌이에 따라 몰려드는 손님, 단계 안내 카드, 새 로고를 더한다.

**Architecture:** 수치는 `tuning.js`, 규칙은 DOM 없는 모듈(`economy.js`에 튜토리얼 판 플래그, 새 `crowd.js`에 벌이 속도·손님 수)로 두고 Node 테스트로 검증한다. 화면은 `js_file.js` 컨트롤러가 맡는다. 튜토리얼 판은 첫 단계만 연습 천막으로 바꾼 튜닝 복사본(`rules`)으로 돌린다.

**Tech Stack:** 빌드 도구 없는 HTML/CSS/JavaScript, Node 내장 `node:test` (v24.7.0), macOS `sips`(로고 변환)

**Spec:** `docs/superpowers/specs/2026-09-19-growth-mode-phase1b-design.md` (선행: `2026-09-19-growth-mode-phase1-design.md`)

## Global Constraints

- npm 패키지·빌드 도구를 추가하지 않는다. `package.json`도 만들지 않는다.
- 규칙 모듈(`tuning.js`, `scoring.js`, `board.js`, `economy.js`, `crowd.js`)은 기존 형식을 따른다: IIFE, 일반 `<script>`로 로드, 브라우저에서는 `window.X`, Node에서는 `module.exports`. DOM에 접근하지 않는다.
- 브라우저 로드 순서: `firebase-config.js`(module) → `audio.js` → `board.js` → `scoring.js` → `tuning.js` → `economy.js` → `crowd.js` → `js_file.js`.
- 모든 수치는 `tuning.js`에만 둔다(애니메이션 시간·레이아웃 픽셀은 예외).
- 테스트는 `tuning.js`를 쓰지 않고 테스트 파일 안의 고정 수치를 쓴다.
- 게임 화면 문구는 한국어. 금액은 `formatMoney()`(`toLocaleString('ko-KR')`), 빼는 금액은 유니코드 마이너스 `−`.
- `js_file.js`는 4칸 들여쓰기, 세미콜론. 기존 한국어 주석은 그대로 둔다.
- 색은 `css_file.css` 맨 위 `:root` 변수만 쓴다. 새 색이 필요하면 `:root`에 추가한다. (기존 오버레이의 `rgba(90, 51, 16, …)` 패턴은 예외로 같은 방식을 써도 된다.)
- 이름 주의: 기존 `showTutorial()`/`closeTutorial()`/`#tutorialPopup`은 **게임 방법 팝업**이다. 새 튜토리얼 판의 컨트롤러 코드는 `practice`라는 이름을 쓴다(`practiceStep`, `endPracticeAndOpenShop()` 등). 경제 모듈의 플래그만 스펙대로 `tutorial`이다. 저장 키는 `fruitMarketTutorialDone`.
- `sw.js`, 앱 아이콘, 랭킹 이름 XSS는 건드리지 않는다. 기존 저장 키와 Firebase 컬렉션도 그대로다.
- **브라우저 확인은 항상 음소거로 한다.** 게임을 시작하기 전에 `GameAudio.init(); GameAudio.setMuted(true); updateSoundButtons();`. 확인이 끝나면 서버를 멈추고 열었던 탭을 닫는다. 실제 랭킹 등록 버튼은 누르지 않는다.
- 모든 커밋 메시지 끝에 정확히 이 줄을 넣는다(자기 모델 이름을 쓰지 않는다):
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  ```

## 파일 구조

| 파일 | 작업 | 태스크 |
|---|---|---|
| `tuning.js` | 새 단계 표, 물가·준비금·위기 기준, `tutorialStage`, 손님 수치 | 1 |
| `economy.js`, `tests/economy.test.js` | 튜토리얼 판 플래그 | 1 |
| `crowd.js` (신규), `tests/crowd.test.js` (신규) | 벌이 속도, 목표 손님 수 | 2 |
| `img/Fruit-Market-2-title.png` (신규), `index.html`, `manifest.json` | 새 로고와 이름 | 3 |
| `index.html`, `css_file.css`, `js_file.js` | 손님 연출 | 4 |
| `index.html`, `css_file.css`, `js_file.js` | 단계 안내 카드, 확인 창 과일 그림 | 5 |
| `index.html`, `css_file.css`, `js_file.js` | 튜토리얼 판 | 6 |

## 브라우저 확인 방법 (3~6번 태스크 공통)

- 미리보기 도구가 있으면 `.claude/launch.json`의 `fruit-market`(포트 8766)을 띄운다. 없으면 `python3 -m http.server 8794`.
- 브라우저가 옛 JS를 캐시할 수 있다. 페이지를 연 뒤 콘솔에서 `typeof Crowd`(4번 이후) 같은 새 전역이 보이지 않으면 `await Promise.all(['js_file.js','economy.js','tuning.js','crowd.js','index.html','css_file.css'].map(f => fetch(f, {cache: 'reload'}))); location.reload();`로 새로 받는다.
- 모바일 크기(375×812)로 맞춘다. 음소거를 먼저 건다.
- 튜토리얼을 다시 보려면 `localStorage.removeItem('fruitMarketTutorialDone')`. 건너뛰려면 `localStorage.setItem('fruitMarketTutorialDone', 'true')`.
- 브라우저 창이 숨겨져 있으면 게임이 자동 일시정지된다("잠시 쉬는 중"). 콘솔에서 `resumeGame()`으로 풀고 확인한다.
- 콘솔 조작 예: `run = { ...run, cash: 50000 }; updateDashboard();`
- `sw.js` 관련 오류, `img/building_N.png`·`img/customer_N.png` 404는 이미지가 아직 없어서 나는 것이므로 무시한다.

---

### Task 1: 새 단계 표와 튜토리얼 판 규칙

**Files:**
- Modify: `tuning.js` (전체 교체)
- Modify: `economy.js` (`createRun`, `tick`, `chargeSwap`, `isBankrupt`, `isInDanger`)
- Test: `tests/economy.test.js`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `Tuning.tutorialStage = { name, cols, rows, fruits, price, rent, logistics, expandCost }`
  - `Tuning.crowdWindowSeconds`, `Tuning.crowdPerRentPace`, `Tuning.crowdMax`
  - `Economy.createRun(tuning, options = {})` — `options.tutorial`이 참이면 `run.tutorial === true`. 이 판은 `tick`·`chargeSwap` 뒤 수익이 0 아래로 내려가지 않고, `isBankrupt`·`isInDanger`가 항상 `false`.

- [ ] **Step 1: 실패하는 테스트 추가**

`tests/economy.test.js` 맨 끝에 추가한다.

```js
test('a tutorial run never drops below zero cash, never goes bankrupt, and never shows danger', () => {
    const run = Economy.createRun(T, { tutorial: true });
    assert.equal(run.tutorial, true);
    const drained = Economy.tick({ ...run, cash: 3 }, T, 1);
    assert.equal(drained.cash, 0);
    assert.equal(Economy.chargeSwap(drained, T).cash, 0);
    assert.equal(Economy.isBankrupt(drained), false);
    assert.equal(Economy.isInDanger(drained, T), false);
});

test('a normal run is not a tutorial run and still goes bankrupt', () => {
    const run = Economy.createRun(T);
    assert.equal(run.tutorial, false);
    assert.equal(Economy.isBankrupt(Economy.tick({ ...run, cash: 3 }, T, 1)), true);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/economy.test.js`
Expected: 새 테스트 2개 FAIL (`run.tutorial`이 `undefined`, 수익이 음수).

- [ ] **Step 3: `economy.js` 수정**

1. `createRun`의 시그니처와 반환 객체를 바꾼다(`ended: null,` 다음에 `tutorial` 줄 추가).

```js
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
```

2. `createRun` 바로 아래에 추가한다.

```js
    function keepTutorialCash(state, cash) {
        return state.tutorial ? Math.max(0, cash) : cash;
    }
```

3. `tick`의 반환 객체에서 `cash,` 줄을 `cash: keepTutorialCash(state, cash),`로 바꾼다.

4. `chargeSwap`의 반환 줄을 바꾼다.

```js
        return { ...state, cash: keepTutorialCash(state, state.cash - tuning.laborPerSwap * state.modifiers.labor), swaps: state.swaps + 1 };
```

5. `isBankrupt`와 `isInDanger`의 조건 앞에 `!state.tutorial &&`를 넣는다.

```js
    function isBankrupt(state) {
        return !state.ended && !state.tutorial && state.cash <= 0;
    }
```

```js
    function isInDanger(state, tuning) {
        return !state.ended && !state.tutorial && state.cash <= currentRent(state, tuning) * tuning.dangerSeconds;
    }
```

- [ ] **Step 4: `tuning.js` 전체 교체**

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
        crowdMax: 14
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Tuning;
    } else {
        root.Tuning = Tuning;
    }
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 5: 테스트와 시뮬레이터 확인**

Run: `node --test tests/*.test.js`
Expected: 전부 PASS (64개).

Run: `node tools/sim.js 20`
Expected (정확히 같아야 한다):

```
runs per player: 20
player      | clears | median time | median stage | median score | stage reached at (median run)
설렁설렁 (3s)   |   0/20 |        5:49 |            2 |       41,695 | 2@78s 3@261s
보통 (2s)     |   0/20 |        5:43 |            5 |      897,758 | 2@38s 3@82s 4@194s 5@282s
잘함 (1.3s)   |   0/20 |        5:01 |            6 |    5,994,234 | 2@22s 3@59s 4@81s 5@107s 6@118s
고수 (1s)     |   0/20 |        5:21 |            6 |   10,172,476 | 2@6s 3@30s 4@53s 5@59s 6@71s
초고수 (0.8s)  |   4/20 |        5:40 |            6 |   14,054,085 | 2@9s 3@23s 4@43s 5@58s 6@72s
```

다르면 `tuning.js`가 위 코드와 다른 것이다. 튜닝 값을 억지로 바꾸지 말고 차이를 찾는다.

- [ ] **Step 6: Commit**

```bash
git add tuning.js economy.js tests/economy.test.js
git commit -m "feat: harder early stages and a tutorial-run flag in the economy" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: 손님 수 계산 모듈

**Files:**
- Create: `crowd.js`
- Test: `tests/crowd.test.js`
- Modify: `index.html` (스크립트 한 줄)

**Interfaces:**
- Consumes: 튜닝 객체의 `crowdPerRentPace`, `crowdMax` (Task 1)
- Produces (`window.Crowd` / `require('../crowd.js')`):
  - `Crowd.createCrowd() → { earnings: [] }`
  - `Crowd.recordEarning(crowd, amount, time, windowSeconds) → crowd` (새 객체. 창 밖 기록은 버린다)
  - `Crowd.earningPace(crowd, time, windowSeconds) → number` (창 안 합계 ÷ 창 길이, 초당)
  - `Crowd.targetCrowdSize(pace, rent, tuning) → integer` (`round(pace ÷ rent × crowdPerRentPace)`, 0~`crowdMax`. 임대료가 0 이하면 벌이가 있을 때 `crowdMax`, 없으면 0)

- [ ] **Step 1: 테스트 작성 — `tests/crowd.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const Crowd = require('../crowd.js');

const T = { crowdPerRentPace: 3, crowdMax: 14 };

test('earningPace adds up only the earnings inside the window', () => {
    let crowd = Crowd.createCrowd();
    crowd = Crowd.recordEarning(crowd, 80, 0, 8);
    crowd = Crowd.recordEarning(crowd, 40, 5, 8);
    assert.equal(Crowd.earningPace(crowd, 6, 8), 15);
    assert.equal(Crowd.earningPace(crowd, 9, 8), 5);
    assert.equal(Crowd.earningPace(crowd, 20, 8), 0);
});

test('recordEarning drops earnings that left the window and keeps its input as is', () => {
    const first = Crowd.recordEarning(Crowd.createCrowd(), 80, 0, 8);
    const second = Crowd.recordEarning(first, 40, 10, 8);
    assert.deepEqual(second.earnings, [{ amount: 40, time: 10 }]);
    assert.deepEqual(first.earnings, [{ amount: 80, time: 0 }]);
});

test('targetCrowdSize is three customers per rent paid, rounded', () => {
    assert.equal(Crowd.targetCrowdSize(10, 10, T), 3);
    assert.equal(Crowd.targetCrowdSize(30, 10, T), 9);
    assert.equal(Crowd.targetCrowdSize(5, 10, T), 2);
    assert.equal(Crowd.targetCrowdSize(1, 10, T), 0);
});

test('targetCrowdSize stays between zero and the maximum', () => {
    assert.equal(Crowd.targetCrowdSize(0, 10, T), 0);
    assert.equal(Crowd.targetCrowdSize(1000, 10, T), 14);
});

test('targetCrowdSize handles a shop with no rent', () => {
    assert.equal(Crowd.targetCrowdSize(5, 0, T), 14);
    assert.equal(Crowd.targetCrowdSize(0, 0, T), 0);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/crowd.test.js`
Expected: FAIL — `Cannot find module '../crowd.js'`.

- [ ] **Step 3: `crowd.js` 작성**

```js
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

    // Customers the shop should draw: a few per rent's worth of earning pace.
    function targetCrowdSize(pace, rent, tuning) {
        if (rent <= 0) return pace > 0 ? tuning.crowdMax : 0;
        const size = Math.round(pace / rent * tuning.crowdPerRentPace);
        return Math.max(0, Math.min(tuning.crowdMax, size));
    }

    const Crowd = { createCrowd, recordEarning, earningPace, targetCrowdSize };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Crowd;
    } else {
        root.Crowd = Crowd;
    }
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 4: `index.html`에 스크립트 추가**

`<script src="economy.js"></script>` 바로 다음 줄에 추가한다.

```html
    <script src="crowd.js"></script>
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `node --test tests/*.test.js`
Expected: 전부 PASS (69개).

- [ ] **Step 6: Commit**

```bash
git add crowd.js tests/crowd.test.js index.html
git commit -m "feat: measure earning pace to size the crowd of customers" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: 새 로고 "Fruit 2 Market"

**Files:**
- Create: `img/Fruit-Market-2-title.png`
- Modify: `index.html` (`<title>`, `apple-mobile-web-app-title`, 로고 `<img>`)
- Modify: `manifest.json` (`name`, `short_name`)

**Interfaces:** 없음

- [ ] **Step 1: 로고 변환**

원본은 `/private/tmp/claude-501/-Users-chisunglee-fruit-market-match-v2/776ff863-96ac-4ab7-96fe-3d295f6843bc/images/1.webp` (1577×997, WebP)이다.

```bash
sips -s format png --resampleWidth 800 "/private/tmp/claude-501/-Users-chisunglee-fruit-market-match-v2/776ff863-96ac-4ab7-96fe-3d295f6843bc/images/1.webp" --out img/Fruit-Market-2-title.png
sips -g pixelWidth -g pixelHeight -g hasAlpha -g format img/Fruit-Market-2-title.png
```

Expected: `pixelWidth: 800`, `pixelHeight: 506` 안팎, `hasAlpha: yes`, `format: png`. `hasAlpha`가 `no`이면 멈추고 NEEDS_CONTEXT로 보고한다(투명 배경이 사라진 것).

옛 `img/Fruit-Market-title.png`는 지우지 않는다.

- [ ] **Step 2: `index.html` 수정**

- `<title>Fruit Market</title>` → `<title>Fruit 2 Market</title>`
- `<meta name="apple-mobile-web-app-title" content="FruitMarket">` → `content="Fruit2Market"`
- `<img src="img/Fruit-Market-title.png" class="main-title-image" alt="Fruit Market">` → `<img src="img/Fruit-Market-2-title.png" class="main-title-image" alt="Fruit 2 Market">`

- [ ] **Step 3: `manifest.json` 수정**

- `"name": "Fruit Market"` → `"name": "Fruit 2 Market"`
- `"short_name": "FruitMarket"` → `"short_name": "Fruit2Market"`

Run: `python3 -c "import json; print(json.load(open('manifest.json'))['name'])"`
Expected: `Fruit 2 Market`

- [ ] **Step 4: 브라우저 확인**

시작 화면에 새 로고가 보이고, 배경이 투명하며(로고 주변에 흰 사각형이 없음), 배치가 예전과 같다(로고가 과일 장식·점수 칸과 겹치지 않음). 탭 제목이 "Fruit 2 Market". 스크린샷.

- [ ] **Step 5: Commit**

```bash
git add img/Fruit-Market-2-title.png index.html manifest.json
git commit -m "feat: new Fruit 2 Market logo and app name" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: 가게 앞 손님 연출

**Files:**
- Modify: `index.html` (손님 층 한 줄)
- Modify: `css_file.css` (`:root` 피부색 변수, 손님 규칙, 움직임 줄이기)
- Modify: `js_file.js` (상수·상태, 손님 함수, `playSteps`, `onTick`, `actuallyStartGame`, `restartGame`, `endRun`)

**Interfaces:**
- Consumes: `Crowd.*` (Task 2), `Tuning.crowdWindowSeconds/crowdPerRentPace/crowdMax` (Task 1), 기존 `run`, `Economy.currentRent`, `TICK_SECONDS`
- Produces: `addCustomer()`, `removeOldestCustomer()`, `sendCustomersHome()`, `clearCustomers()`, `updateCrowd()`; 상태 `crowd`, `customers`, `crowdClock`

- [ ] **Step 1: `index.html` — 손님 층**

`<div class="building-slot" id="buildingSlot"></div>` 바로 다음 줄에 추가한다.

```html
            <div class="crowd" id="crowd" aria-hidden="true"></div>
```

- [ ] **Step 2: `css_file.css`**

1. `:root`의 `--neon: #7FE3F5;` 다음 줄에 추가한다.

```css
    --skin-light: #F6D2B0;
    --skin-tan: #D9A077;
```

2. `@media (prefers-reduced-motion: reduce)` 블록 바로 위에 추가한다.

```css
/* ---------- 손님 ---------- */

.crowd {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 6px;
    height: 34px;
    z-index: 2;
    pointer-events: none;
}

.customer {
    position: absolute;
    left: 50%;
    bottom: 0;
    width: 18px;
    height: 28px;
    margin-left: -9px;
    transform-origin: bottom center;
    transition: transform 0.6s ease-out, opacity 0.6s ease-out;
}

.customer-art {
    position: absolute;
    inset: 0;
}

/* 몸통 */
.customer-art::before {
    content: '';
    position: absolute;
    left: 1px;
    bottom: 0;
    width: 16px;
    height: 17px;
    background: var(--shirt);
    border: 2px solid var(--wood-dark);
    border-radius: 8px 8px 4px 4px;
}

/* 머리 */
.customer-art::after {
    content: '';
    position: absolute;
    left: 3px;
    top: 0;
    width: 12px;
    height: 12px;
    background: var(--skin);
    border: 2px solid var(--wood-dark);
    border-radius: 50%;
}

.customer img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: bottom;
    display: none;
}

.customer.has-image img {
    display: block;
}

.customer.has-image .customer-art {
    display: none;
}

.customer.walking .customer-art,
.customer.walking img {
    animation: customerBob 0.2s ease-in-out infinite alternate;
}

.customer.hop .customer-art,
.customer.hop img {
    animation: customerHop 0.4s ease-out;
}

@keyframes customerBob {
    from { transform: translateY(0); }
    to { transform: translateY(-3px); }
}

@keyframes customerHop {
    0%, 100% { transform: translateY(0); }
    40% { transform: translateY(-8px); }
}
```

3. `@media (prefers-reduced-motion: reduce)` 블록 안, 마지막 `}` 앞에 추가한다.

```css
    .customer {
        transition: none !important;
    }

    .customer-art,
    .customer img {
        animation: none !important;
    }
```

- [ ] **Step 3: `js_file.js` — 상수와 상태**

`const missingBuildingImages = new Set();` 바로 다음에 추가한다.

```js
const missingCustomerImages = new Set();
const CUSTOMER_SKINS = ['var(--skin-light)', 'var(--skin-tan)'];
const CUSTOMER_SHIRTS = ['var(--awning-red)', 'var(--leaf)', 'var(--store-blue)', 'var(--violet)', 'var(--gold)', 'var(--sunset)'];
const CUSTOMER_IMAGE_COUNT = 4;
const CUSTOMER_EDGE_X = 220; // px from the door where customers enter and leave
const CUSTOMER_WALK_MS = 600;
const CROWD_UPDATE_SECONDS = 0.5;
let crowd = Crowd.createCrowd();
let customers = []; // oldest first: { element, x }
let crowdClock = 0;
```

- [ ] **Step 4: `js_file.js` — 손님 함수**

`function showEarning(amount) {` 함수 바로 다음(그 닫는 `}` 뒤)에 추가한다.

```js
function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

// Queue spot for the customer at `index`: alternating left and right of the door.
function customerSpot(index) {
    const side = index % 2 === 0 ? -1 : 1;
    const rank = Math.floor(index / 2) + 1;
    return { x: side * (4 + rank * 18), scale: 1 - rank * 0.03, layer: 20 - rank };
}

function layoutCustomers() {
    customers.forEach((customer, index) => {
        const spot = customerSpot(index);
        customer.x = spot.x;
        customer.element.style.transform = `translateX(${spot.x}px) scale(${spot.scale})`;
        customer.element.style.zIndex = String(spot.layer);
    });
}

// A CSS-drawn customer. Uses img/customer_N.png when it exists.
function createCustomerElement() {
    const element = document.createElement('div');
    element.className = 'customer walking';

    const art = document.createElement('div');
    art.className = 'customer-art';
    art.style.setProperty('--skin', pickRandom(CUSTOMER_SKINS));
    art.style.setProperty('--shirt', pickRandom(CUSTOMER_SHIRTS));
    element.appendChild(art);

    const imageNumber = 1 + Math.floor(Math.random() * CUSTOMER_IMAGE_COUNT);
    if (!missingCustomerImages.has(imageNumber)) {
        const img = document.createElement('img');
        img.alt = '';
        img.draggable = false;
        img.addEventListener('load', () => element.classList.add('has-image'));
        img.addEventListener('error', () => {
            missingCustomerImages.add(imageNumber);
            img.remove();
        });
        img.src = `img/customer_${imageNumber}.png`;
        element.appendChild(img);
    }
    return element;
}

// A customer walks in from the nearer edge and joins the queue.
function addCustomer() {
    if (customers.length >= Tuning.crowdMax) return;
    const element = createCustomerElement();
    const entryX = customerSpot(customers.length).x < 0 ? -CUSTOMER_EDGE_X : CUSTOMER_EDGE_X;
    element.style.transform = `translateX(${entryX}px)`;
    document.getElementById('crowd').appendChild(element);
    customers.push({ element, x: entryX });
    void element.offsetWidth; // start the walk from the edge
    layoutCustomers();
    setTimeout(() => element.classList.remove('walking'), CUSTOMER_WALK_MS);
}

// The customer who has waited longest walks off; the rest step closer to the door.
function removeOldestCustomer() {
    const customer = customers.shift();
    if (!customer) return;
    const exitX = customer.x < 0 ? -CUSTOMER_EDGE_X : CUSTOMER_EDGE_X;
    customer.element.classList.add('walking');
    customer.element.style.transform = `translateX(${exitX}px)`;
    customer.element.style.opacity = '0';
    setTimeout(() => customer.element.remove(), CUSTOMER_WALK_MS);
    layoutCustomers();
}

function sendCustomersHome() {
    while (customers.length > 0) {
        removeOldestCustomer();
    }
}

function clearCustomers() {
    customers = [];
    document.getElementById('crowd').innerHTML = '';
}

function hopRandomCustomer() {
    const chance = run.combo.multiplier >= 2 ? 0.5 : 0.2;
    if (customers.length === 0 || Math.random() >= chance) return;
    const element = pickRandom(customers).element;
    if (element.classList.contains('walking')) return;
    element.classList.remove('hop');
    void element.offsetWidth; // restart the CSS animation
    element.classList.add('hop');
}

// Walks customers in or out toward the size the recent earning pace calls for.
function updateCrowd() {
    const pace = Crowd.earningPace(crowd, run.time, Tuning.crowdWindowSeconds);
    const target = Crowd.targetCrowdSize(pace, Economy.currentRent(run, Tuning), Tuning);
    if (customers.length > target) {
        removeOldestCustomer();
    } else {
        while (customers.length < target) {
            addCustomer();
        }
    }
    hopRandomCustomer();
}
```

- [ ] **Step 5: `js_file.js` — 기존 함수에 연결**

1. `playSteps` 안, `run = Economy.addEarnings(run, stepScores[i]);` 바로 다음 줄에 추가한다.

```js
        crowd = Crowd.recordEarning(crowd, stepScores[i], run.time, Tuning.crowdWindowSeconds);
        addCustomer();
```

2. `onTick` 안, `updateDashboard();` 바로 다음 줄(파산 판정 `if` 앞)에 추가한다.

```js
    crowdClock += TICK_SECONDS;
    if (crowdClock >= CROWD_UPDATE_SECONDS - 1e-9) {
        crowdClock = 0;
        updateCrowd();
    }
```

3. `actuallyStartGame` 안, `dangerShown = false;` 바로 다음 줄에 추가한다.

```js
    crowd = Crowd.createCrowd();
    crowdClock = 0;
    clearCustomers();
```

4. `restartGame` 안, `setComboEffects(0);` 바로 다음 줄에 `clearCustomers();`를 추가한다.

5. `endRun` 안, `updateDashboard();` 바로 다음 줄에 `sendCustomersHome();`를 추가한다.

- [ ] **Step 6: 문법 검사와 테스트**

Run: `node --check js_file.js && node --test tests/*.test.js`
Expected: 오류 없음, 69개 PASS.

- [ ] **Step 7: 브라우저 확인**

튜토리얼은 아직 없다(6번 태스크). 음소거 후 `startGame()`, 카운트다운 뒤 확인한다.

- 매치할 때마다 손님이 화면 왼쪽이나 오른쪽 끝에서 걸어 들어와 천막 문 양옆에 번갈아 선다(`customers.length`가 는다). 연쇄가 나면 여러 명이 온다.
- 손을 놓으면 0.5초마다 한 명씩 끝 쪽으로 걸어 나가며 사라지고, 남은 손님은 문 쪽으로 당겨 선다. 8초쯤 지나면 모두 떠난다.
- `run = { ...run, cash: 50000 }; updateDashboard();` 후 빠르게 여러 번 매치하면 줄이 길어진다. 14명을 넘지 않는다(`customers.length <= 14`).
- 손님이 확장 버튼과 단계 뱃지를 가리지 않고, 확장 버튼은 여전히 눌린다.
- 확장해도 손님이 남아 있고, 파산하면 모두 걸어 나간다. 🏠로 나갔다 다시 개업하면 손님이 0명에서 시작한다.
- 스크린샷: 손님이 여럿 선 화면.

- [ ] **Step 8: Commit**

```bash
git add index.html css_file.css js_file.js
git commit -m "feat: customers crowd the shop as sales come in" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: 단계 안내 카드와 확인 창 과일 그림

**Files:**
- Modify: `index.html` (단계 안내 카드)
- Modify: `css_file.css` (카드 규칙, 확인 창 과일 그림, 움직임 줄이기)
- Modify: `js_file.js` (`STAGE_TIPS`, `stageCardOpen`, `isPaused`, `openStageCard`, `closeStageCard`, `openExpandSheet`, `confirmExpand`, `actuallyStartGame`, `restartGame`, 바깥 클릭·Escape 처리)

**Interfaces:**
- Consumes: `run`, `stageInfo`, `renderBuilding`, `fruitSrc`, `formatMoney`, `FRUIT_NAMES`, `Economy.inflation/currentPrice/currentRent`, `Tuning.fruitOrder`
- Produces: `openStageCard()`, `closeStageCard()`, 상태 `stageCardOpen` (Task 6이 `isPaused`와 시작 흐름에서 쓴다)

- [ ] **Step 1: `index.html` — 카드**

`<div class="sheet-overlay" id="expandSheet">` 블록(닫는 `</div>`까지) 바로 다음에 추가한다.

```html
    <div class="stage-card-overlay" id="stageCard">
        <div class="stage-card">
            <div class="mini-building" id="stageCardBuilding"></div>
            <h2 id="stageCardTitle"></h2>
            <div class="stage-card-fruit" id="stageCardFruit" hidden>
                <img id="stageCardFruitImage" alt="">
                <span id="stageCardFruitText"></span>
            </div>
            <ul class="stage-card-facts" id="stageCardFacts"></ul>
            <p class="stage-card-tip" id="stageCardTip"></p>
            <button class="start-btn" onclick="closeStageCard()">장사 시작</button>
        </div>
    </div>
```

- [ ] **Step 2: `css_file.css`**

`@media (prefers-reduced-motion: reduce)` 블록 바로 위에 추가한다.

```css
/* ---------- 단계 안내 카드 ---------- */

.stage-card-overlay {
    position: fixed;
    inset: 0;
    z-index: 1060;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(90, 51, 16, 0.6);
}

.stage-card-overlay.show {
    display: flex;
}

.stage-card {
    width: 100%;
    max-width: 340px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 20px 18px 22px;
    text-align: center;
    background: var(--cream);
    border: 5px solid var(--wood-dark);
    border-radius: 22px;
    box-shadow: 0 8px 0 var(--wood-dark);
    animation: stageCardIn 0.35s ease-out;
}

@keyframes stageCardIn {
    from { transform: scale(0.8); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}

.stage-card h2 {
    font-size: 24px;
    color: var(--awning-red);
}

.stage-card-fruit {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    font-size: 17px;
    font-weight: 700;
    background: var(--gold);
    border: 3px solid var(--wood-dark);
    border-radius: 14px;
}

.stage-card-fruit img {
    width: 48px;
    height: 48px;
    object-fit: contain;
}

.stage-card-facts {
    width: 100%;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 14px;
    font-weight: 700;
}

.stage-card-facts li {
    padding: 6px 10px;
    background: var(--awning-cream);
    border: 2px solid var(--wood-light);
    border-radius: 10px;
}

.stage-card-tip {
    font-size: 13px;
    color: var(--wood);
}

.stage-card .start-btn {
    width: 100%;
    min-width: 0;
}

.sheet-change-fruit {
    width: 24px;
    height: 24px;
    margin-right: 4px;
    object-fit: contain;
    vertical-align: middle;
}
```

그리고 `@media (prefers-reduced-motion: reduce)`의 애니메이션 끄는 선택자 목록에서 `    .siren-active,` 줄 바로 아래에 `    .stage-card,`를 추가한다.

- [ ] **Step 3: `js_file.js` — 상태와 문구**

`let expanding = false;` 바로 다음 줄에 추가한다.

```js
let stageCardOpen = false;
```

`const FRUIT_NAMES = { ... };` 블록 바로 다음에 추가한다.

```js
const STAGE_TIPS = [
    '과일 4종 — 연쇄를 노려 보세요',
    '과일이 5종이라 연쇄가 줄어요. 한 수 한 수 신중하게',
    '진열대가 넓어졌어요. 숨 돌릴 틈이에요',
    '과일 6종 — 같은 과일 연속 매치로 배율을 지키세요',
    '넓어진 진열대로 크게 벌 때예요',
    '마지막 과일까지 입고! 백화점 임대료는 머무를수록 치솟아요'
];
```

`isPaused()`를 바꾼다.

```js
function isPaused() {
    return sheetOpen || hiddenPause || expanding || stageCardOpen;
}
```

- [ ] **Step 4: `js_file.js` — 카드 함수**

`function closeExpandSheet() {` 함수 바로 위에 추가한다.

```js
// Tells the player what the stage that just opened changes. Game time waits while it shows.
function openStageCard() {
    const stage = run.stage;
    const info = stageInfo(stage);
    const previous = stage > 1 ? stageInfo(stage - 1) : null;
    const newFruit = previous && info.fruits > previous.fruits ? Tuning.fruitOrder[info.fruits - 1] : null;
    const inflationPercent = Math.round((Economy.inflation(run, Tuning) - 1) * 100);

    renderBuilding(document.getElementById('stageCardBuilding'), stage);
    document.getElementById('stageCardTitle').textContent = stage === 1 ? `${info.name} 개업!` : `${stage}단계 ${info.name} 개업!`;

    document.getElementById('stageCardFruit').hidden = !newFruit;
    if (newFruit) {
        document.getElementById('stageCardFruitImage').src = fruitSrc(newFruit, '002');
        document.getElementById('stageCardFruitText').textContent = `${FRUIT_NAMES[newFruit]} 입고! 이제 과일 ${info.fruits}종`;
    }

    const facts = [
        `진열대 ${info.cols}×${info.rows}`,
        `과일 1개 ${formatMoney(Economy.currentPrice(run, Tuning))}원`,
        `임대료 ${formatMoney(Economy.currentRent(run, Tuning))}/초 · 물가 +${inflationPercent}%`
    ];
    if (!newFruit) {
        facts.splice(1, 0, `과일 ${info.fruits}종`);
    }
    const list = document.getElementById('stageCardFacts');
    list.innerHTML = '';
    facts.forEach(text => {
        const item = document.createElement('li');
        item.textContent = text;
        list.appendChild(item);
    });

    document.getElementById('stageCardTip').textContent = STAGE_TIPS[stage - 1];
    stageCardOpen = true;
    document.getElementById('stageCard').classList.add('show');
}

function closeStageCard() {
    stageCardOpen = false;
    document.getElementById('stageCard').classList.remove('show');
}
```

- [ ] **Step 5: `js_file.js` — 확인 창 과일 그림**

`openExpandSheet()` 안에서:

1. `changes`의 `'과일'` 항목에 세 번째 값(그림 경로)을 추가한다.

```js
            ['과일', next.fruits > current.fruits ? `${FRUIT_NAMES[newFruit]} 입고 (${next.fruits}종)` : `그대로 (${next.fruits}종)`, next.fruits > current.fruits ? fruitSrc(newFruit, '001') : null]
```

2. `changes.forEach(([label, value]) => {`를 `changes.forEach(([label, value, image]) => {`로 바꾸고, `valueElement.textContent = value;` 바로 다음에 추가한다.

```js
        if (image) {
            const fruitImage = document.createElement('img');
            fruitImage.className = 'sheet-change-fruit';
            fruitImage.src = image;
            fruitImage.alt = '';
            valueElement.prepend(fruitImage);
        }
```

- [ ] **Step 6: `js_file.js` — 카드를 여는 곳과 닫는 곳**

1. `confirmExpand()`의 끝부분에서, 두 번째 `expanding = false;`(클리어가 아닌 경로, `입고!` 문구 다음) 바로 다음 줄에 추가한다.

```js
    if (gameRunning) {
        openStageCard();
    }
```

2. `actuallyStartGame()`에서 `startLoop();` 바로 다음 줄(`if (document.hidden) pauseForHidden();` 앞)에 `openStageCard();`를 추가한다.

3. `restartGame()`에서 `expanding = false;` 바로 다음 줄에 `stageCardOpen = false;`를, `document.getElementById('expandSheet').classList.remove('show');` 바로 다음 줄에 `document.getElementById('stageCard').classList.remove('show');`를 추가한다.

4. 파일 뒤쪽 "Close popup when clicking outside" 리스너 안, `if (e.target === expandSheet) { ... }` 다음에 추가한다.

```js
    if (e.target === document.getElementById('stageCard')) {
        closeStageCard();
    }
```

5. Escape 리스너 안, `if (sheetOpen) { closeExpandSheet(); }` 다음에 추가한다.

```js
        if (stageCardOpen) {
            closeStageCard();
        }
```

- [ ] **Step 7: 문법 검사와 테스트**

Run: `node --check js_file.js && node --test tests/*.test.js`
Expected: 오류 없음, 69개 PASS.

- [ ] **Step 8: 브라우저 확인**

음소거 후 `startGame()`.

- 카운트다운 직후 카드가 뜬다: 천막 그림, "천막 개업!", 목록 "진열대 5×5 / 과일 4종 / 과일 1개 5원 / 임대료 14/초 · 물가 +0%", 팁 "과일 4종 — 연쇄를 노려 보세요". 새 과일 칸은 없다.
- 카드가 떠 있는 동안 `run.time`이 늘지 않고 보드를 밀 수 없다. "장사 시작", 카드 바깥 탭, Escape 모두 닫힌다.
- `run = { ...run, cash: 5000 }; updateDashboard();` → 확장 버튼 → 확인 창의 과일 칸에 오렌지 그림과 "오렌지 입고 (5종)". "확장한다" → 연출과 "오렌지 입고!" 문구 뒤 카드: "2단계 좌판 개업!", 노란 칸에 오렌지 그림과 "오렌지 입고! 이제 과일 5종", 목록에 진열대 6×5·과일 1개 21원·임대료(물가 반영), 팁 2번.
- 백화점으로 가서(`run = { ...run, stage: 5, cash: 10000000 }; newBoard(5); updateStage(); updateDashboard();` 후 확장) 6단계 카드에 체리와 팁 6번. 클리어 확장(6단계에서 확장)에는 카드가 뜨지 않고 결과 화면이 나온다.
- 스크린샷: 2단계 카드.

- [ ] **Step 9: Commit**

```bash
git add index.html css_file.css js_file.js
git commit -m "feat: stage intro cards and new-fruit pictures in the expand sheet" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: 처음 한 번만 하는 튜토리얼 판

**Files:**
- Modify: `index.html` (건너뛰기 버튼, 말풍선, 튜토리얼 끝 카드, 게임 방법 팝업의 다시 하기 버튼)
- Modify: `css_file.css` (말풍선, 건너뛰기, 힌트 칸, 다시 하기 버튼)
- Modify: `js_file.js` (`Tuning` → `rules` 이름 바꾸기, 튜토리얼 상태·함수, `isPaused`, `playSteps`, `updateDashboard`, `confirmExpand`, `startGame`, `actuallyStartGame`, `restartGame`)

**Interfaces:**
- Consumes: `Economy.createRun(tuning, { tutorial })`, `run.tutorial` (Task 1), `Tuning.tutorialStage` (Task 1), `openStageCard()`, `stageCardOpen` (Task 5), `clearCustomers()` (Task 4), `Board.findBestMove`
- Produces: `rules`(현재 판의 규칙: `Tuning` 또는 `PRACTICE_RULES`), `startPracticeFromHelp()`, `endPracticeAndOpenShop()`

- [ ] **Step 1: `js_file.js` — `Tuning`을 `rules`로**

현재 판의 규칙을 바꿔 끼우기 위해 컨트롤러가 `Tuning`을 직접 읽지 않게 한다.

```bash
perl -pi -e 's/\bTuning\b/rules/g' js_file.js
grep -c "\bTuning\b" js_file.js
```

Expected: 두 번째 명령이 `0`.

그다음 `const TICK_SECONDS = TICK_MS / 1000;` 바로 다음 줄에 추가한다(이 줄들은 `Tuning`을 그대로 쓴다).

```js
// Rules for the run in progress: the real tuning, or a copy that opens in the practice shop.
const PRACTICE_RULES = { ...Tuning, stages: [Tuning.tutorialStage, ...Tuning.stages.slice(1)] };
let rules = Tuning;
```

- [ ] **Step 2: `js_file.js` — 튜토리얼 상태와 문구**

`let stageCardOpen = false;` 바로 다음에 추가한다.

```js
const TUTORIAL_KEY = 'fruitMarketTutorialDone';
const PRACTICE_LINES = {
    1: '과일을 밀어 같은 과일 3개를 한 줄로 맞춰 보세요',
    2: '판 돈은 매출(점수)과 수익에 함께 쌓여요',
    3: '수익은 임대료로 계속 줄어요. 0이 되면 파산이에요!',
    4: '돈이 모였어요. 가게를 키워 보세요!'
};
const PRACTICE_RENT_TIP_SECONDS = 4;
let practiceStep = 0; // 0 = not a practice run
let practiceStepAt = 0;
let practiceDoneOpen = false;
```

`isPaused()`를 바꾼다.

```js
function isPaused() {
    return sheetOpen || hiddenPause || expanding || stageCardOpen || practiceDoneOpen;
}
```

- [ ] **Step 3: `js_file.js` — 튜토리얼 함수**

`function pauseForHidden() {` 함수 바로 위에 추가한다.

```js
function isTutorialDone() {
    return localStorage.getItem(TUTORIAL_KEY) === 'true';
}

function showHint() {
    const move = Board.findBestMove(board);
    if (!move) return;
    [move.a, move.b].forEach(cell => cellElements[cell.row][cell.col].classList.add('hint'));
}

function clearHint() {
    document.querySelectorAll('.cell.hint').forEach(cell => cell.classList.remove('hint'));
}

function setPracticeStep(step) {
    practiceStep = step;
    practiceStepAt = run.time;
    clearHint();
    const bubble = document.getElementById('coachBubble');
    bubble.classList.toggle('point-expand', step === 4);
    document.getElementById('coachText').textContent = PRACTICE_LINES[step];
    bubble.hidden = false;
    if (step === 1) {
        showHint();
    }
}

// Moves the practice lesson on when its condition is met. Called whenever the dashboard updates.
function updatePractice() {
    if (!practiceStep || !gameRunning) return;
    if ((practiceStep === 2 || practiceStep === 3) && Economy.canExpand(run, rules)) {
        setPracticeStep(4);
    } else if (practiceStep === 2 && run.time - practiceStepAt >= PRACTICE_RENT_TIP_SECONDS) {
        setPracticeStep(3);
    }
}

function showPracticeDone() {
    document.getElementById('coachBubble').hidden = true;
    practiceDoneOpen = true;
    document.getElementById('practiceDoneCard').classList.add('show');
    GameAudio.playSuccess(3);
}

// Stops the practice run without a result screen or a saved score.
function leavePractice() {
    gameRunning = false;
    gameSession++;
    clearInterval(loopInterval);
    isAnimating = false;
    expanding = false;
    practiceDoneOpen = false;
    closeExpandSheet();
    practiceStep = 0;
    clearHint();
    document.getElementById('coachBubble').hidden = true;
    document.getElementById('practiceSkipBtn').hidden = true;
    document.getElementById('practiceDoneCard').classList.remove('show');
    clearCustomers();
    GameAudio.stopMusic();
    GameAudio.setHurry(false);
}

// "건너뛰기" and the practice-done card both land here.
function endPracticeAndOpenShop() {
    localStorage.setItem(TUTORIAL_KEY, 'true');
    leavePractice();
    showCountdown();
}

// "튜토리얼 다시 하기" in the how-to-play popup.
function startPracticeFromHelp() {
    closeTutorial();
    GameAudio.init();
    document.getElementById('startScreen').style.display = 'none';
    document.body.classList.remove('on-start');
    actuallyStartGame(true);
}
```

- [ ] **Step 4: `js_file.js` — 기존 함수 수정**

1. `playSteps` 안, Task 4가 넣은 `addCustomer();` 바로 다음 줄에 추가한다.

```js
        if (practiceStep === 1) {
            setPracticeStep(2);
        }
```

2. `updateDashboard()`의 마지막 줄(`updateExpandButton();`) 다음에 `updatePractice();`를 추가한다.

3. `confirmExpand()`에서 `if (!canAcceptInput() || !Economy.canExpand(run, rules)) return;` 바로 다음 줄에 추가한다.

```js
    if (run.tutorial) {
        showPracticeDone();
        return;
    }
```

4. `startGame()`의 마지막 부분(`// Show countdown` 주석과 `showCountdown();`)을 아래로 바꾼다.

```js
    // First visit: the practice shop instead of the countdown
    if (isTutorialDone()) {
        showCountdown();
    } else {
        actuallyStartGame(true);
    }
```

5. `actuallyStartGame()`을 아래 전체로 교체한다(Task 4·5에서 넣은 줄이 모두 들어 있다).

```js
function actuallyStartGame(practiceMode = false) {
    gameSession++;
    rules = practiceMode ? PRACTICE_RULES : Tuning;
    run = Economy.createRun(rules, { tutorial: practiceMode });
    gameRunning = true;
    isAnimating = false;
    sheetOpen = false;
    hiddenPause = false;
    expanding = false;
    stageCardOpen = false;
    practiceDoneOpen = false;
    practiceStep = 0;
    pointerStart = null;
    comboLevel = -1; // forces the first update to set the effects
    shownRent = 0;
    dangerShown = false;
    crowd = Crowd.createCrowd();
    crowdClock = 0;
    clearCustomers();

    newBoard(run.stage);
    updateStage();
    updateDashboard();
    updateComboDisplay();
    GameAudio.setHurry(false);

    GameAudio.startMusic();
    startLoop();
    if (practiceMode) {
        document.getElementById('practiceSkipBtn').hidden = false;
        setPracticeStep(1);
    } else {
        openStageCard();
    }
    if (document.hidden) pauseForHidden();
}
```

6. `restartGame()`에서 `stageCardOpen = false;` 바로 다음 줄에 추가한다.

```js
    practiceDoneOpen = false;
    practiceStep = 0;
    clearHint();
    document.getElementById('coachBubble').hidden = true;
    document.getElementById('practiceSkipBtn').hidden = true;
    document.getElementById('practiceDoneCard').classList.remove('show');
```

- [ ] **Step 5: `index.html`**

1. `<div class="shop-buttons">` 안, 첫 줄(소리 버튼) 앞에 추가한다.

```html
                <button class="practice-skip-btn" id="practiceSkipBtn" onclick="endPracticeAndOpenShop()" hidden>건너뛰기</button>
```

2. `<div class="combo-text" id="comboText"></div>` 바로 다음 줄에 추가한다.

```html
        <div class="coach-bubble" id="coachBubble" hidden><span id="coachText"></span></div>
```

3. Task 5의 `<div class="stage-card-overlay" id="stageCard">` 블록 바로 다음에 추가한다.

```html
    <div class="stage-card-overlay" id="practiceDoneCard">
        <div class="stage-card">
            <h2>좋아요! 이제 진짜 개업이에요</h2>
            <p class="stage-card-tip">진짜 가게는 과일이 더 많고 임대료도 훨씬 비싸요. 손님을 모아 보세요!</p>
            <button class="start-btn" onclick="endPracticeAndOpenShop()">개업하기</button>
        </div>
    </div>
```

4. 게임 방법 팝업(`id="tutorialPopup"`)의 `<div class="popup-body">` 안, 마지막 `rule-section` 다음에 추가한다.

```html
                <button class="start-btn replay-practice-btn" onclick="startPracticeFromHelp()">🎓 튜토리얼 다시 하기</button>
```

- [ ] **Step 6: `css_file.css`**

`@media (prefers-reduced-motion: reduce)` 블록 바로 위에 추가한다.

```css
/* ---------- 튜토리얼 ---------- */

.practice-skip-btn {
    height: 40px;
    padding: 0 12px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 700;
    color: var(--wood-dark);
    background: var(--cream);
    border: 3px solid var(--wood-dark);
    border-radius: 20px;
    box-shadow: 0 4px 0 var(--wood-dark);
    cursor: pointer;
}

.coach-bubble {
    position: absolute;
    left: 50%;
    bottom: 10px;
    z-index: 50;
    width: min(320px, calc(100vw - 32px));
    padding: 12px 16px;
    transform: translateX(-50%);
    font-size: 16px;
    font-weight: 700;
    text-align: center;
    color: var(--wood-dark);
    background: var(--cream);
    border: 4px solid var(--wood-dark);
    border-radius: 18px;
    box-shadow: 0 5px 0 var(--wood-dark);
    pointer-events: none;
    animation: coachIn 0.3s ease-out;
}

/* 확장 버튼 바로 아래에서 버튼을 가리킨다 */
.coach-bubble.point-expand {
    bottom: auto;
    top: calc(clamp(170px, 27vh, 240px) + 10px);
}

.coach-bubble.point-expand::before {
    content: '';
    position: absolute;
    right: 40px;
    top: -16px;
    border: 12px solid transparent;
    border-top: 0;
    border-bottom: 14px solid var(--wood-dark);
}

@keyframes coachIn {
    from { opacity: 0; transform: translateX(-50%) translateY(10px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.cell.hint {
    box-shadow: inset 0 0 0 4px var(--gold);
    animation: hintPulse 0.8s ease-in-out infinite;
}

@keyframes hintPulse {
    0%, 100% { box-shadow: inset 0 0 0 1px var(--gold); }
    50% { box-shadow: inset 0 0 0 5px var(--gold); }
}

.replay-practice-btn {
    width: 100%;
    min-width: 0;
    margin-top: 8px;
    font-size: 17px;
}
```

그리고 `@media (prefers-reduced-motion: reduce)`의 애니메이션 끄는 선택자 목록에서 `    .siren-active,` 줄 바로 아래에 두 줄을 추가한다.

```css
    .coach-bubble,
    .cell.hint,
```

- [ ] **Step 7: 문법 검사와 테스트**

Run: `node --check js_file.js && node --test tests/*.test.js && grep -c "\bTuning\b" js_file.js`
Expected: 오류 없음, 69개 PASS, 마지막 숫자는 `3`(`PRACTICE_RULES`와 `rules` 선언 두 줄, `actuallyStartGame`의 한 곳).

- [ ] **Step 8: 브라우저 확인**

`localStorage.removeItem('fruitMarketTutorialDone')` 후 새로고침하고 음소거한다.

- "개업하기" → 카운트다운 없이 바로 연습 천막(뱃지 "1단계 연습 천막", 과일 3종). 오른쪽 위에 "건너뛰기". 아래쪽 말풍선 1번과 반짝이는 두 칸. 그 두 칸을 밀면 매치된다.
- 첫 매치 뒤 말풍선 2번, 약 4초 뒤 3번. 확장 버튼이 켜지면(연습 천막 200 + 좌판 임대료 8초분) 말풍선이 확장 버튼 아래로 옮겨 가 버튼을 가리키는 4번으로 바뀐다(이미 켜져 있었다면 2번 다음 바로 4번).
- 수익을 0으로 만들어도(`run = { ...run, cash: 0 }; updateDashboard();`) 파산하지 않고 사이렌도 없다. 손님은 똑같이 온다. 단계 안내 카드는 뜨지 않는다.
- 확장 → 확인 창 "좌판으로 확장할까요?" → "확장한다" → "좋아요! 이제 진짜 개업이에요" 카드. 그동안 `run.time`이 멈춘다. "개업하기" → 카운트다운 → 본 게임 천막(과일 4종)과 "천막 개업!" 카드. `localStorage.getItem('fruitMarketTutorialDone') === 'true'`. 최근 점수는 바뀌지 않았다.
- 🏠로 나가 다시 "개업하기" → 이번엔 카운트다운부터(튜토리얼 없음).
- 기록을 지우고 튜토리얼 중 "건너뛰기" → 기록이 남고 카운트다운 → 본 게임.
- 기록을 지우고 튜토리얼 중 🏠 → 기록 없음(다음 개업 때 다시 튜토리얼).
- 게임 방법 팝업 맨 아래 "🎓 튜토리얼 다시 하기" → 팝업이 닫히고 연습 천막이 열린다.
- 본 게임 파산·확장·클리어가 전처럼 동작한다(Task 5의 확인 항목 한 번 더).
- 스크린샷: 말풍선 1번과 힌트 칸, 4번(버튼 가리킴), 튜토리얼 끝 카드.

- [ ] **Step 9: Commit**

```bash
git add index.html css_file.css js_file.js
git commit -m "feat: one-time practice shop that teaches the basics" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```
