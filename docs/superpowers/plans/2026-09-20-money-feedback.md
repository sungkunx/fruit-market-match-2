# 돈이 움직이는 게 보이게 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 비용 표시를 둘로 줄이고, 수익 바를 굵게(금액은 바 안, 8등분 눈금, 빨간 잔상) 바꾸고, 빠져나가는 돈과 매치로 버는 돈을 모두 숫자로 띄운다.

**Architecture:** 규칙은 바꾸지 않는다. 묶음별 금액만 `scoring.js`에서 계산해 돌려주고(화면 코드가 돈 계산을 하지 않도록), 나머지는 `index.html`·`css_file.css`·`js_file.js`의 표시 코드다.

**Tech Stack:** 빌드 도구 없는 HTML/CSS/JavaScript, Node `node:test`

**Spec:** `docs/superpowers/specs/2026-09-19-growth-mode-phase1b-design.md` §12

## Global Constraints

- npm 패키지·빌드 도구를 추가하지 않는다. 경제 규칙(`economy.js`, `tuning.js`)과 밸런스는 건드리지 않는다. `node tools/sim.js 20`의 출력이 바뀌면 안 된다.
- `scoring.js`는 DOM 없는 순수 함수다. 테스트는 테스트 파일 안의 고정 수치를 쓴다.
- 컨트롤러는 튜닝 값을 `rules`로 읽는다. 돈은 `formatMoney()`(`$` 포함)로 표시한다.
- `js_file.js`는 4칸 들여쓰기, 세미콜론. 색은 `:root` 변수만 쓴다.
- 움직임 줄이기 설정(`prefers-reduced-motion`)에서는 새 애니메이션도 꺼지거나 즉시 끝나야 한다.
- **브라우저 확인은 음소거로**: `GameAudio.init(); GameAudio.setMuted(true); updateSoundButtons();`. 끝나면 서버를 멈추고 탭을 닫는다. 실제 랭킹 등록 버튼은 누르지 않는다.
- 브라우저 확인: 미리보기 도구의 `fruit-market`(포트 8766) 또는 `python3 -m http.server 8798`, 375×812. 옛 JS가 보이면 `await Promise.all(['js_file.js','scoring.js','css_file.css','index.html'].map(f => fetch(f, {cache: 'reload'}))); location.reload();`. 창이 숨겨져 자동 일시정지되면 `resumeGame()`. 튜토리얼 건너뛰기: `localStorage.setItem('fruitMarketTutorialDone', 'true')`. 단계 안내 카드는 `closeStageCard()`.
- 커밋 메시지 끝에 정확히 이 줄(자기 모델 이름을 쓰지 않는다):
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  ```

---

### Task 1: 묶음별 금액 계산

**Files:**
- Modify: `scoring.js` (`matchGroupRevenues` 추가, `matchStepRevenue` 정리, `scoreMove`가 `groupScores`를 돌려줌)
- Test: `tests/scoring.test.js`

**Interfaces:**
- Produces: `Scoring.matchGroupRevenues(step, price, multiplier) → number[]` — 묶음별 금액. 합은 항상 `matchStepRevenue(step, price, multiplier)`와 같다(마지막 묶음이 나머지를 가져간다). `Scoring.scoreMove(...)`의 결과에 `groupScores: number[][]`(단계별 × 묶음별)가 더해진다. 유효하지 않은 수는 `groupScores: []`.
- 경제 값(`stepScores`, `total`)은 그대로다. 시뮬레이터 결과가 바뀌면 안 된다.

- [ ] **Step 1: 실패하는 테스트 추가 — `tests/scoring.test.js` 맨 끝**

```js
test('matchGroupRevenues splits a step over its groups and always adds up to the step total', () => {
    const twoGroups = step(2, [group('a', 3), group('b', 4)]);
    assert.deepEqual(Scoring.matchGroupRevenues(twoGroups, 10, 1.5), [90, 120]);
    assert.equal(Scoring.matchGroupRevenues(twoGroups, 10, 1.5).reduce((sum, value) => sum + value, 0), Scoring.matchStepRevenue(twoGroups, 10, 1.5));

    // Rounding leftovers go to the last group so the parts never add up to less than the total.
    const rounded = step(1, [group('a', 3), group('b', 3)]);
    assert.equal(Scoring.matchStepRevenue(rounded, 1, 1.333), 7);
    assert.deepEqual(Scoring.matchGroupRevenues(rounded, 1, 1.333), [3, 4]);
});

test('scoreMove reports the money each group made', () => {
    const result = validResult([step(1, [group('apple', 4), group('kiwi', 3)]), step(2, [group('kiwi', 3)])]);
    const scored = Scoring.scoreMove(result, state(1.5, 0, null), 'apple', 'kiwi', 10, RULES);
    assert.deepEqual(scored.groupScores, [[60, 45], [90]]);
    scored.groupScores.forEach((groups, index) => {
        assert.equal(groups.reduce((sum, value) => sum + value, 0), scored.stepScores[index]);
    });
});

test('an invalid swap reports no group money', () => {
    assert.deepEqual(Scoring.scoreMove({ valid: false }, state(2, 1, 'apple'), 'apple', 'kiwi', 10, RULES).groupScores, []);
});
```

Run: `node --test tests/scoring.test.js`
Expected: FAIL — `Scoring.matchGroupRevenues is not a function`.

- [ ] **Step 2: `scoring.js` 수정**

1. `matchStepRevenue` 함수 바로 위에 추가한다.

```js
    // What each popped group in one cascade step is worth. The parts always add up to the step
    // total: rounding leftovers go to the last group.
    function matchGroupRevenues(step, price, multiplier) {
        const shares = step.groups.map(group => Math.floor(group.cells.length * price * step.chain * multiplier));
        const spent = shares.reduce((sum, value) => sum + value, 0);
        if (shares.length > 0) {
            shares[shares.length - 1] += matchStepRevenue(step, price, multiplier) - spent;
        }
        return shares;
    }
```

2. `scoreMove` 안에서 `const stepScores = ...` 줄 다음에 추가한다.

```js
        const groupScores = result.steps.map(step => matchGroupRevenues(step, price, state.multiplier));
```

3. `scoreMove`의 유효하지 않은 수 반환에 `groupScores: []`를 더한다.

```js
            return { total: 0, stepScores: [], groupScores: [], isCombo: false, state };
```

4. `scoreMove`의 정상 반환에서 `stepScores,` 다음 줄에 `groupScores,`를 더한다.

5. 내보내기 객체에 `matchGroupRevenues`를 더한다.

```js
    const Scoring = { createScoreState, matchStepRevenue, matchGroupRevenues, scoreMove, decayMultiplier };
```

- [ ] **Step 3: 확인**

Run: `node --test tests/*.test.js`
Expected: 전부 PASS (72개).

Run: `node tools/sim.js 20 | tail -5`
Expected: 아래와 정확히 같아야 한다(경제가 바뀌지 않았다는 확인).

```
설렁설렁 (3s)   |    0/20 |        5:44 |            2 |       37,288 | 2@108s
보통 (2s)     |    0/20 |        6:24 |            5 |    1,056,763 | 2@58s 3@98s 4@172s 5@272s
잘함 (1.3s)   |   20/20 |        6:37 |            7 |   20,178,890 | 2@26s 3@68s 4@100s 5@129s 6@164s 7@234s
고수 (1s)     |   20/20 |        6:25 |            7 |   31,374,813 | 2@23s 3@54s 4@90s 5@98s 6@108s 7@123s
초고수 (0.8s)  |   20/20 |        6:30 |            7 |   46,897,932 | 2@13s 3@30s 4@57s 5@70s 6@77s 7@104s
```

- [ ] **Step 4: Commit**

```bash
git add scoring.js tests/scoring.test.js
git commit -m "feat: report what each popped group sold for" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: 계기판 — 비용 칩 둘, 굵은 수익 바, 빠져나가는 돈 숫자

**Files:**
- Modify: `index.html` (수익 줄 마크업)
- Modify: `css_file.css` (수익 바, 비용 칩, 비용 숫자, 움직임 줄이기)
- Modify: `js_file.js` (`updateCostLine`, 수익 바 갱신, `showCostFloat`, `onTick`, `handleSwap`, 상태 초기화, 단계 안내 카드 내역)

**Interfaces:**
- Consumes: `Economy.currentRent`, `Economy.currentLogistics`, `rules.logisticsInterval`, `rules.laborPerSwap`, `run.modifiers`
- Produces: `showCostFloat(amount)`

- [ ] **Step 1: `index.html` — 수익 줄**

`<div class="cash-row" id="cashRow"> … </div>` 세 줄을 아래로 교체한다.

```html
            <div class="cash-row" id="cashRow">
                <span class="dash-label">수익</span>
                <div class="cash-bar-track">
                    <div class="cash-bar-ghost" id="cashBarGhost"></div>
                    <div class="cash-bar" id="cashBar"></div>
                    <div class="cash-ticks" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
                    <span class="cash-value" id="cash">0</span>
                </div>
            </div>
```

- [ ] **Step 2: `css_file.css` — 수익 바와 비용 칩**

`.cash-row { … }`부터 `.cost-line.cost-bump { … }` 앞까지의 규칙들(`.cash-bar-track`, `.cash-bar`, `.cash-value`, `.cash-row.danger …`, `@keyframes dangerBlink`, `.cost-line`)을 아래로 교체한다.

```css
.cash-row {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
}

.cash-bar-track {
    position: relative;
    flex: 1;
    height: 28px;
    background: var(--awning-cream);
    border: 3px solid var(--wood-dark);
    border-radius: 10px;
    overflow: hidden;
}

/* 줄어든 만큼 잠깐 남았다가 따라 내려오는 빨간 잔상 */
.cash-bar-ghost {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 0;
    background: var(--awning-red);
    transition: width 0.55s ease-out 0.12s;
}

.cash-bar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 0;
    background: var(--leaf);
    transition: width 0.12s linear, background 0.3s ease;
}

.cash-bar.gain {
    animation: cashGain 0.35s ease-out;
}

@keyframes cashGain {
    from { filter: brightness(1.7); }
    to { filter: brightness(1); }
}

.cash-ticks {
    position: absolute;
    inset: 0;
    display: flex;
    pointer-events: none;
}

.cash-ticks span {
    flex: 1;
    border-right: 1px solid rgba(90, 51, 16, 0.25);
}

.cash-ticks span:last-child {
    border-right: 0;
}

.cash-value {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 700;
    color: var(--wood-dark);
    font-variant-numeric: tabular-nums;
    text-shadow: 0 1px 0 var(--awning-cream);
}

.cash-row.danger .cash-bar {
    background: var(--awning-red);
}

.cash-row.danger .cash-value {
    color: var(--cream);
    text-shadow: 1px 1px 0 var(--wood-dark);
}

.cash-row.danger {
    animation: dangerBlink 0.6s ease-in-out infinite;
}

@keyframes dangerBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.45; }
}

/* 빠져나가는 돈: 작으면 작고 연하게, 크면 크고 진하게 */
.cost-float {
    position: absolute;
    bottom: 100%;
    transform: translateX(-50%);
    font-weight: 700;
    color: var(--awning-red);
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    animation: costFloat 0.9s ease-out forwards;
}

@keyframes costFloat {
    0% { opacity: 0; transform: translate(-50%, 6px); }
    25% { opacity: var(--a, 1); }
    100% { opacity: 0; transform: translate(-50%, -22px); }
}

.cost-line {
    margin-top: 6px;
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    font-size: 13px;
    color: var(--wood);
}

.cost-chip {
    padding: 2px 8px;
    font-weight: 700;
    background: var(--awning-cream);
    border: 2px solid var(--wood-light);
    border-radius: 10px;
}
```

그리고 `@media (prefers-reduced-motion: reduce)`의 애니메이션 끄는 선택자 목록에서 `    .siren-active,` 줄 바로 아래에 두 줄을 추가한다.

```css
    .cash-bar.gain,
    .cost-float,
```

- [ ] **Step 3: `js_file.js` — 상태**

`let shownRent = 0;` 바로 다음에 추가한다.

```js
let shownCash = 0;
let rentFloatPending = 0; // rent adds up for a second before it pops as one number
let rentFloatClock = 0;
const COST_FLOAT_MS = 900;
```

- [ ] **Step 4: `js_file.js` — 비용 칩과 비용 숫자**

`updateCostLine()` 함수 전체를 아래로 교체하고, 그 아래에 `showCostFloat`을 더한다.

```js
// Two chips instead of three costs: everything that drains per second, and what one move costs.
function updateCostLine() {
    const upkeep = Math.round(upkeepPerSecond());
    const labor = rules.laborPerSwap * run.modifiers.labor;
    const line = document.getElementById('costLine');
    line.innerHTML = '';
    [`유지비 −${formatMoney(upkeep)}/초`, `한 수 −${formatMoney(labor)}`].forEach(text => {
        const chip = document.createElement('span');
        chip.className = 'cost-chip';
        chip.textContent = text;
        line.appendChild(chip);
    });

    if (shownRent > 0 && upkeep > shownRent) {
        line.classList.remove('cost-bump');
        void line.offsetWidth; // restart the CSS animation
        line.classList.add('cost-bump');
    }
    shownRent = upkeep;
}

function upkeepPerSecond() {
    return Economy.currentRent(run, rules) + Economy.currentLogistics(run, rules) / rules.logisticsInterval;
}

// Money leaving the shop pops above the cash bar. Small amounts stay small and faint.
function showCostFloat(amount) {
    if (amount <= 0) return;
    const upkeep = upkeepPerSecond();
    const ratio = upkeep > 0 ? amount / upkeep : 10;
    const [size, alpha] = ratio < 1.5 ? [11, 0.45] : ratio < 4 ? [15, 0.7] : ratio < 10 ? [20, 0.9] : [26, 1];

    const label = document.createElement('div');
    label.className = 'cost-float';
    label.textContent = '−' + formatMoney(amount);
    label.style.fontSize = size + 'px';
    label.style.setProperty('--a', alpha);
    label.style.left = (50 + Math.random() * 40).toFixed(0) + '%';
    document.getElementById('cashRow').appendChild(label);
    setTimeout(() => label.remove(), COST_FLOAT_MS);
}
```

- [ ] **Step 5: `js_file.js` — 수익 바 갱신**

`updateDashboard()` 안에서 수익 바를 그리는 세 줄

```js
    const requirement = Economy.expandRequirement(run, rules);
    const ratio = requirement ? Math.min(1, Math.max(0, run.cash) / requirement) : 1;
    document.getElementById('cashBar').style.width = (ratio * 100).toFixed(1) + '%';
```

을 아래로 바꾼다.

```js
    const requirement = Economy.expandRequirement(run, rules);
    const ratio = requirement ? Math.min(1, Math.max(0, run.cash) / requirement) : 1;
    const width = (ratio * 100).toFixed(1) + '%';
    const bar = document.getElementById('cashBar');
    if (run.cash > shownCash) {
        bar.classList.remove('gain');
        void bar.offsetWidth; // restart the CSS animation
        bar.classList.add('gain');
    }
    shownCash = run.cash;
    bar.style.width = width;
    document.getElementById('cashBarGhost').style.width = width;
```

- [ ] **Step 6: `js_file.js` — 언제 숫자를 띄우나**

1. `onTick()`의 앞부분

```js
    run = Economy.tick(run, rules, TICK_SECONDS);
```

을 아래로 바꾼다.

```js
    const logisticsTimerBefore = run.logisticsTimer;
    rentFloatPending += Economy.currentRent(run, rules) * TICK_SECONDS;
    run = Economy.tick(run, rules, TICK_SECONDS);
    if (run.logisticsTimer < logisticsTimerBefore) {
        showCostFloat(Economy.currentLogistics(run, rules));
    }
    rentFloatClock += TICK_SECONDS;
    if (rentFloatClock >= 1 - 1e-9) {
        showCostFloat(rentFloatPending);
        rentFloatPending = 0;
        rentFloatClock = 0;
    }
```

2. `handleSwap()`에서 `run = Economy.chargeSwap(run, rules);` 바로 다음 줄에 추가한다.

```js
    showCostFloat(rules.laborPerSwap * run.modifiers.labor);
```

3. `actuallyStartGame()`과 `restartGame()`에서 각각 `shownRent = 0;` 줄 바로 다음에 추가한다(`restartGame()`에 `shownRent = 0;`이 없으면 `dangerShown = false;` 다음에 넣는다).

```js
    shownCash = 0;
    rentFloatPending = 0;
    rentFloatClock = 0;
```

- [ ] **Step 7: `js_file.js` — 단계 안내 카드에 내역**

`openStageCard()`의 `facts` 배열에서 임대료 줄을 아래 두 줄로 바꾼다(유지비를 합쳐 보여 주는 계기판과 달리, 카드에는 내역을 그대로 적는다).

```js
        `임대료 ${formatMoney(Economy.currentRent(run, rules))}/초 + 물류비 ${formatMoney(Economy.currentLogistics(run, rules))}/${rules.logisticsInterval}초`,
        `물가 +${inflationPercent}%`
```

- [ ] **Step 8: 문법 검사와 테스트**

Run: `node --check js_file.js && node --test tests/*.test.js`
Expected: 오류 없음, 72개 PASS.

- [ ] **Step 9: 브라우저 확인**

음소거 후 `startGame()`, 카드는 `closeStageCard()`.

- 수익 바가 굵어지고, 금액이 바 안 가운데에 있으며, 얇은 세로선이 8칸으로 나눈다. 오른쪽에 따로 있던 숫자는 없다.
- 가만히 두면 1초에 한 번 `−$14`가 바 위에 작고 연하게 떴다 사라진다. 스왑하면 `−$2`가 뜬다. 5초마다 물류비가 뜬다(2단계 이상에서 확인: `run = { ...run, stage: 2 }; newBoard(2); updateStage(); updateDashboard();`).
- 큰 단계에서는 숫자가 크고 진해진다(`run = { ...run, stage: 5, cash: 1e7 }; newBoard(5); updateStage(); updateDashboard();` 후 관찰).
- 돈이 줄면 초록 바가 즉시 줄고 빨간 띠가 잠깐 남았다 따라 내려온다. 매치로 돈이 들면 초록 바가 늘며 한 번 밝아진다.
- 비용 줄이 칩 두 개(`유지비 −$14/초`, `한 수 −$2`)로 보이고 글씨가 커졌다.
- 단계 안내 카드에 "임대료 $14/초 + 물류비 $0/5초"와 "물가 +0%"가 따로 보인다.
- 위기(`run = { ...run, cash: 30 }; updateDashboard();`)에서 바가 빨갛게 깜빡이고 바 안 숫자가 크림색으로 읽힌다.
- 스크린샷: 숫자가 떠 있는 계기판.

- [ ] **Step 10: Commit**

```bash
git add index.html css_file.css js_file.js
git commit -m "feat: fatter cash bar with every cost popping above it" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: 보드 위 수입 숫자와 매출 카운트업

**Files:**
- Modify: `css_file.css` (`.earning-float`, 매출 튀기기)
- Modify: `js_file.js` (`playSteps`, `showEarning` → `showGroupEarnings`, 매출 표시)

**Interfaces:**
- Consumes: Task 1의 `scored.groupScores`, 기존 `cellElements`, `Economy.currentPrice`

- [ ] **Step 1: `css_file.css`**

1. `.earning-float { … }` 규칙에서 자리를 정하는 세 줄(`left: 50%;`, `top: 40%;`, `font-size: 26px;`)을 지운다. JS가 자리를 잡고 크기를 정한다. 나머지(`position: absolute; z-index; color; text-shadow; pointer-events; white-space; animation`)는 그대로 둔다.

2. `@keyframes earningFloat` 아래에 추가한다.

```css
.revenue-value.revenue-pop {
    animation: revenuePop 0.3s ease-out;
}

@keyframes revenuePop {
    0% { transform: scale(1); }
    40% { transform: scale(1.12); }
    100% { transform: scale(1); }
}
```

3. `@media (prefers-reduced-motion: reduce)`의 애니메이션 끄는 선택자 목록에서 `    .siren-active,` 줄 바로 아래에 `    .revenue-value.revenue-pop,`를 추가한다.

- [ ] **Step 2: `js_file.js` — 묶음마다 숫자**

`showEarning(amount)` 함수 전체를 아래로 교체한다.

```js
// Each popped group shows what it sold for, right where it popped. Bigger money, bigger number.
function showGroupEarnings(step, amounts) {
    const frame = document.getElementById('boardFrame');
    const frameBox = frame.getBoundingClientRect();
    const basic = Economy.currentPrice(run, rules) * 3; // a plain three-fruit match

    step.groups.forEach((group, index) => {
        const amount = amounts[index];
        if (amount <= 0) return;
        const cell = group.cells[Math.floor(group.cells.length / 2)];
        const cellBox = cellElements[cell.row][cell.col].getBoundingClientRect();

        const label = document.createElement('div');
        label.className = 'earning-float';
        label.textContent = '+' + formatMoney(amount) + (step.chain >= 2 ? ` ×${step.chain}` : '');
        const size = basic > 0 ? 16 + Math.log2(Math.max(1, amount / basic)) * 6 : 16;
        label.style.fontSize = Math.round(Math.min(34, size)) + 'px';
        label.style.left = (cellBox.left - frameBox.left + cellBox.width / 2) + 'px';
        label.style.top = (cellBox.top - frameBox.top) + 'px';
        frame.appendChild(label);
        setTimeout(() => label.remove(), 900);
    });
}
```

- [ ] **Step 3: `js_file.js` — `playSteps`가 묶음 금액을 받게**

1. `handleSwap()`에서 `const completed = await playSteps(result.steps, scored.stepScores, session);`를 아래로 바꾼다.

```js
    const completed = await playSteps(result.steps, scored, session);
```

2. `playSteps` 함수의 머리와 본문 두 곳을 바꾼다.

```js
async function playSteps(steps, scored, session) {
```

그리고 본문의 `showEarning(stepScores[i]);` 줄을 지우고, `run = Economy.addEarnings(run, stepScores[i]);`와 그다음 두 줄에서 `stepScores[i]`를 `scored.stepScores[i]`로 바꾼 뒤, `updateDashboard();` 앞에 묶음 숫자를 띄운다. 결과는 이렇게 된다.

```js
        run = Economy.addEarnings(run, scored.stepScores[i]);
        crowd = Crowd.recordEarning(crowd, scored.stepScores[i], run.time, rules.crowdWindowSeconds);
        addCustomer();
        if (practiceStep === 1) {
            setPracticeStep(2);
        }
        showGroupEarnings(step, scored.groupScores[i]);
        updateDashboard();
```

- [ ] **Step 4: `js_file.js` — 매출 카운트업**

1. `let shownCash = 0;` 바로 다음에 추가한다.

```js
let shownRevenue = 0;
```

2. `updateDashboard()`의 첫 줄

```js
    document.getElementById('revenue').textContent = formatMoney(run.revenue);
```

을 `animateRevenue(run.revenue);`로 바꾸고, `updateDashboard()` 함수 바로 위에 추가한다.

```js
// The revenue number rolls up instead of jumping, and gives a little pop when it grows.
function animateRevenue(target) {
    const element = document.getElementById('revenue');
    if (target === shownRevenue) return;
    const from = shownRevenue;
    shownRevenue = target;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        element.textContent = formatMoney(target);
        return;
    }

    element.classList.remove('revenue-pop');
    void element.offsetWidth; // restart the CSS animation
    element.classList.add('revenue-pop');

    const session = gameSession;
    const start = performance.now();
    function frame(now) {
        if (session !== gameSession) return;
        const progress = Math.min(1, (now - start) / 300);
        element.textContent = formatMoney(from + (target - from) * (1 - Math.pow(1 - progress, 3)));
        if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}
```

3. `actuallyStartGame()`과 `restartGame()`의 `shownCash = 0;` 줄 다음에 `shownRevenue = 0;`을 추가한다.

- [ ] **Step 5: 문법 검사와 테스트**

Run: `node --check js_file.js && node --test tests/*.test.js && grep -n "showEarning" js_file.js`
Expected: 오류 없음, 72개 PASS, `grep`은 출력 없음.

- [ ] **Step 6: 브라우저 확인**

음소거 후 `startGame()`, 카드는 `closeStageCard()`.

- 매치하면 터진 자리마다 `+$36`이 뜬다. 한 수로 두 줄이 동시에 터지면 두 자리에 따로 뜬다.
- 연쇄 2단 이상에서는 `+$120 ×2`처럼 단수가 붙는다.
- 큰 단계에서 숫자가 눈에 띄게 커진다(`run = { ...run, stage: 5, cash: 1e7 }; newBoard(5); updateStage(); updateDashboard();` 후 매치).
- 계기판 매출 숫자가 뚝 뛰지 않고 짧게 굴러 올라가며 살짝 커졌다 돌아온다.
- 판을 다시 시작하면 매출이 `$0`에서 시작한다(카운트업이 옛 값에서 이어지지 않는다).
- 스크린샷: 숫자가 여러 개 뜬 보드.

- [ ] **Step 7: Commit**

```bash
git add css_file.css js_file.js
git commit -m "feat: show what every match sold for, right on the board" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```
