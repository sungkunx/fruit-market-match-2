# 확장 제안 팝업과 `$` 표시 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 확장할 수 있게 되면 확인 창이 저절로 떠서 "확장 / 좀 더 하기(연장전: 아이템 없이 점수만)"를 고르게 하고, 모든 돈 숫자 앞에 `$`를 붙인다.

**Architecture:** 연장전은 경제 모듈의 플래그(`run.overtime`)로 두고 테스트한다. 컨트롤러는 단계마다 한 번 확인 창을 저절로 열고, 창을 확장 없이 닫으면 연장전으로 바꾼다. `$`는 `formatMoney()` 한 곳에서 붙인다.

**Tech Stack:** 빌드 도구 없는 HTML/CSS/JavaScript, Node `node:test`

**Spec:** `docs/superpowers/specs/2026-09-19-growth-mode-phase1b-design.md` §10

## Global Constraints

- npm 패키지·빌드 도구를 추가하지 않는다.
- 규칙 모듈은 DOM 없는 순수 함수, 입력을 바꾸지 않는다. 테스트는 테스트 파일 안의 고정 수치(`T`)를 쓴다.
- 컨트롤러는 튜닝 값을 `rules`로 읽는다. 튜토리얼 판(`run.tutorial`)에는 확장 제안·연장전을 적용하지 않는다.
- `js_file.js`는 4칸 들여쓰기, 세미콜론. 색은 `:root` 변수만.
- **브라우저 확인은 음소거로**: `GameAudio.init(); GameAudio.setMuted(true); updateSoundButtons();`. 끝나면 서버를 멈추고 탭을 닫는다. 실제 랭킹 등록 버튼은 누르지 않는다.
- 브라우저 확인: 미리보기 도구의 `fruit-market`(포트 8766) 또는 `python3 -m http.server 8796`, 375×812. 옛 JS가 보이면 `await Promise.all(['js_file.js','economy.js','css_file.css','index.html'].map(f => fetch(f, {cache: 'reload'}))); location.reload();`. 창이 숨겨져 자동 일시정지되면 `resumeGame()`. 튜토리얼 건너뛰기: `localStorage.setItem('fruitMarketTutorialDone', 'true')`.
- 커밋 메시지 끝에 정확히 이 줄(자기 모델 이름을 쓰지 않는다):
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  ```

---

### Task 1: 확장 제안 팝업과 연장전

**Files:**
- Modify: `economy.js` (`createRun`, `expand`, 새 `stayOvertime`, 내보내기)
- Test: `tests/economy.test.js`
- Modify: `index.html` (확인 창 안내 문구, 취소 버튼)
- Modify: `css_file.css` (안내 문구 스타일)
- Modify: `js_file.js` (`offeredStage`, `offerExpansion`, `declineExpansion`, `onTick`, `openExpandSheet`, `updateExpandButton`, `actuallyStartGame`, `restartGame`, 바깥 클릭·Escape)

**Interfaces:**
- Produces: `run.overtime: boolean`, `Economy.stayOvertime(run) → run`; `Economy.expand`가 `overtime`을 `false`로 되돌린다. 컨트롤러 `offerExpansion()`, `declineExpansion()`.

- [ ] **Step 1: 실패하는 테스트 추가 — `tests/economy.test.js` 맨 끝**

```js
test('a run starts outside overtime, can choose overtime, and leaves it by expanding', () => {
    const run = Economy.createRun(T);
    assert.equal(run.overtime, false);
    const staying = Economy.stayOvertime({ ...run, cash: 1500 });
    assert.equal(staying.overtime, true);
    assert.equal(run.overtime, false);
    assert.equal(Economy.expand(staying, T).overtime, false);
});

test('an ended run cannot go into overtime', () => {
    const run = { ...Economy.createRun(T), ended: 'bankrupt' };
    assert.equal(Economy.stayOvertime(run), run);
});
```

Run: `node --test tests/economy.test.js`
Expected: 새 테스트 2개 FAIL.

- [ ] **Step 2: `economy.js` 수정**

1. `createRun`의 반환 객체에서 `tutorial: Boolean(options.tutorial),` 다음 줄에 추가한다.

```js
            // Chose to keep playing past an expansion offer: score only, no board items at this stage.
            overtime: false,
```

2. `expand`의 반환 객체에서 `stageTime: 0,` 다음 줄에 `overtime: false,`를 추가한다.

3. `expand` 함수 바로 다음에 추가한다.

```js
    function stayOvertime(state) {
        return state.ended ? state : { ...state, overtime: true };
    }
```

4. `Economy` 내보내기 객체에서 `expand,` 다음 줄에 `stayOvertime,`을 추가한다.

Run: `node --test tests/*.test.js`
Expected: 전부 PASS (71개).

- [ ] **Step 3: `index.html` — 확인 창**

`<div class="sheet-changes" id="sheetChanges"></div>` 바로 다음 줄에 추가한다.

```html
            <p class="sheet-note" id="sheetNote">더 하면 이 단계에서는 아이템이 나오지 않아요. 점수만 올릴 수 있어요.</p>
```

취소 버튼 줄을 아래로 바꾼다.

```html
            <button class="tutorial-btn sheet-cancel" id="sheetCancel" onclick="declineExpansion()">좀 더 할게요 · 점수만</button>
```

- [ ] **Step 4: `css_file.css`**

`.sheet-summary { ... }` 규칙 바로 다음에 추가한다.

```css
.sheet-note {
    font-size: 12px;
    font-weight: 700;
    color: var(--awning-red);
    text-align: center;
}
```

- [ ] **Step 5: `js_file.js` — 상태와 함수**

1. `let stageCardOpen = false;` 바로 다음 줄에 추가한다.

```js
let offeredStage = 0; // the stage whose expansion offer already popped up
```

2. `function closeExpandSheet() {` 함수 바로 다음(닫는 `}` 뒤)에 추가한다.

```js
// Opens the expand sheet by itself the first time the shop can grow at this stage.
function offerExpansion() {
    if (run.tutorial || offeredStage === run.stage) return;
    if (!canAcceptInput() || !Economy.canExpand(run, rules)) return;
    offeredStage = run.stage;
    openExpandSheet();
}

// Closing the sheet without expanding means playing on: overtime at this stage.
function declineExpansion() {
    if (!sheetOpen) return;
    closeExpandSheet();
    if (gameRunning && !run.tutorial) {
        run = Economy.stayOvertime(run);
        updateDashboard();
    }
}
```

3. `onTick()`의 마지막(파산 판정 `if` 블록 다음)에 추가한다.

```js
    offerExpansion();
```

4. `openExpandSheet()`에서 `document.getElementById('sheetConfirm').textContent = ...` 줄 바로 다음에 추가한다.

```js
    document.getElementById('sheetNote').hidden = run.tutorial;
    document.getElementById('sheetCancel').textContent = run.tutorial ? '조금 더 벌고 올게요' : '좀 더 할게요 · 점수만';
```

5. `updateExpandButton()`에서 `if (ready) {` 블록을 아래로 바꾼다.

```js
    if (ready) {
        hint = isFinal ? '영업을 마치고 정산할 수 있어요' : '지금 확장할 수 있어요';
        if (run.overtime) {
            hint = '연장전 · 아이템 없이 점수만';
        }
    }
```

6. `actuallyStartGame()`과 `restartGame()` 각각에서 `stageCardOpen = false;` 바로 다음 줄에 `offeredStage = 0;`을 추가한다.

7. 파일 뒤쪽 바깥 클릭 리스너의 `if (e.target === expandSheet) { closeExpandSheet(); }` 안의 `closeExpandSheet();`를 `declineExpansion();`으로, Escape 리스너의 `if (sheetOpen) { closeExpandSheet(); }` 안의 `closeExpandSheet();`를 `declineExpansion();`으로 바꾼다. (`confirmExpand`와 `leavePractice` 안의 `closeExpandSheet()`는 그대로 둔다.)

- [ ] **Step 6: 문법 검사와 테스트**

Run: `node --check js_file.js && node --test tests/*.test.js`
Expected: 오류 없음, 71개 PASS.

- [ ] **Step 7: 브라우저 확인**

튜토리얼 건너뛰기 설정 후 음소거, `startGame()`, 단계 안내 카드는 `closeStageCard()`.

- `run = { ...run, cash: Economy.expandRequirement(run, rules) + 50 }; updateDashboard();` → 0.1초 안에 확인 창이 저절로 뜬다. 안내 문구(빨강)와 "좀 더 할게요 · 점수만" 버튼이 보인다. 창이 떠 있는 동안 `run.time`이 멈춘다.
- "좀 더 할게요 · 점수만" → 창이 닫히고 `run.overtime === true`, 확장 버튼 안내가 "연장전 · 아이템 없이 점수만". 몇 초 더 기다려도 창이 다시 저절로 뜨지 않는다.
- 확장 버튼을 누르면 창이 열리고 "확장한다" → 2단계, `run.overtime === false`. 단계 안내 카드를 닫은 뒤 2단계 요건만큼 돈을 넣으면 다시 한 번 저절로 뜬다.
- 저절로 뜬 창을 바깥 탭이나 Escape로 닫아도 연장전이 된다.
- 매치 연출 중에 요건을 넘으면(`run.cash`를 큰 값으로 두고 바로 스와이프) 연출이 끝난 뒤에 창이 뜬다.
- 튜토리얼(`localStorage.removeItem('fruitMarketTutorialDone')` 후 새로 고침, 개업): 돈이 모여도 창이 저절로 뜨지 않고, 4번 말풍선 뒤 버튼으로 연 창에는 빨간 안내가 없고 취소 버튼이 "조금 더 벌고 올게요"다.
- 스크린샷: 저절로 뜬 확인 창.

- [ ] **Step 8: Commit**

```bash
git add economy.js tests/economy.test.js index.html css_file.css js_file.js
git commit -m "feat: offer the expansion the moment it is affordable, with a score-only overtime" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: 모든 돈에 `$`

**Files:**
- Modify: `js_file.js` (`formatMoney`, 단계 안내 카드 단가 문구, 랭킹 목록·내 점수)

**Interfaces:**
- Consumes: 기존 `formatMoney(value)` 호출부 전체
- Produces: `formatMoney(value) → '$' + 천 단위 쉼표 정수` (예: `$1,400`)

- [ ] **Step 1: `formatMoney` 수정**

```js
function formatMoney(value) {
    return '$' + Math.floor(value).toLocaleString('ko-KR');
}
```

- [ ] **Step 2: 단계 안내 카드 단가 문구**

`openStageCard()`의 `` `과일 1개 ${formatMoney(Economy.currentPrice(run, rules))}원` ``에서 끝의 `원`을 지운다.

```js
        `과일 1개 ${formatMoney(Economy.currentPrice(run, rules))}`,
```

- [ ] **Step 3: 랭킹 점수**

`displayRankings()`의 `${player.score.toLocaleString()}`을 `${formatMoney(player.score)}`로, `updateUserRank()`의 `userScore.toLocaleString()`을 `formatMoney(userScore)`로 바꾼다.

- [ ] **Step 4: 남은 형식 확인**

Run: `grep -n "toLocaleString" js_file.js`
Expected: `formatMoney` 안의 한 줄만 나온다.

Run: `grep -n "원\`" js_file.js`
Expected: 출력 없음.

Run: `node --check js_file.js && node --test tests/*.test.js`
Expected: 오류 없음, 71개 PASS.

- [ ] **Step 5: 브라우저 확인**

음소거 후 확인한다.

- 시작 화면: 최근·최고 점수가 `$1,234` 형식.
- 게임: 매출·수익 `$`, 매치 때 `+$…`, 비용 줄 `임대료 −$14/초 · 인건비 −$2/스왑 · 물류비 −$0/5초`, 확장 버튼 `좌판으로 확장 · $1,400`과 `준비금 포함 $… 더 필요`.
- 확인 창: `−$1,400`, `수익 $… → $…`, 임대료 칸 `$14 → $50 /초`.
- 단계 안내 카드: `과일 1개 $5`, `임대료 $14/초 · 물가 +0%`.
- 결과 화면: 점수 카운트업이 `$`로 끝난다. 이번 달 랭킹 팝업의 목록과 "나" 점수에 `$`.
- 스크린샷: 게임 화면, 결과 화면.

- [ ] **Step 6: Commit**

```bash
git add js_file.js
git commit -m "feat: show every money amount with a dollar sign" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```
