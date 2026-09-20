# 판 정리 아이템 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 연쇄와 큰 매치로 얻어 바로 쓰는 판 정리 아이템 3종을 넣고, 4단계 난이도 급상승을 고친다.

**Architecture:** 드롭 판정과 슬롯은 DOM 없는 새 모듈 `items.js`, 칸을 지우고 연쇄까지 계산하는 것은 `board.js`의 `resolveClear`. 결과 모양이 `resolveMove`와 같아서 점수(`Scoring`/`Economy`)와 화면 코드가 그대로 재사용된다. 컨트롤러는 슬롯 UI와 대상 고르기만 맡는다.

**Tech Stack:** 바닐라 JS(IIFE 이중 export), `node:test`, `tools/sim.js`.

## Global Constraints

- 스펙: `docs/superpowers/specs/2026-09-19-growth-mode-phase1b-design.md` §16 (이 계획의 요구사항은 모두 여기서 나온다).
- 새 순수 모듈은 `window.X` / `module.exports` 이중 export를 따른다.
- 테스트는 `tuning.js`를 읽지 않고 고정 값을 쓴다.
- 새 애니메이션은 `@media (prefers-reduced-motion: reduce)`에서 꺼진다.
- 주석과 화면 문구는 한국어, 코드 주석은 기존 파일의 말투(영어 서술)를 따른다.
- 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

---

### Task 1: 과일 일정과 4단계 확장비

**Files:** Modify `tuning.js`

- [ ] 4단계(편의점) `fruits: 6` → `fruits: 5`. 과일 수가 `4, 5, 5, 5, 6, 7, 7`이 된다.
- [ ] `node tools/sim.js 30`으로 단계별 체류 시간을 재고, 4단계 확장비를 올려 보통(2초) 기준 4단계 체류가 다시 65~75초가 되게 맞춘다(시작점 $50,400 → 약 $63,000, 이분법으로 조정).
- [ ] 5단계 체류도 70~85초를 벗어나면 5단계 확장비로 맞춘다.
- [ ] `node --test tests/*.test.js` 통과 확인 후 커밋.

### Task 2: board.js — 칸 지우기

**Files:** Modify `board.js`, `tests/board.test.js`

- [ ] 실패하는 테스트부터 쓴다: `cellsOfFruit`가 그 과일의 모든 칸을 주는지, `cellsAround`가 판 밖을 넘지 않는 3×3을 주는지, `resolveClear`가 첫 단계는 `kind: 'item'`·`chain: 1`이고 이어지는 연쇄는 `chain: 2`부터인지, 지울 칸이 없으면 `{ valid: false }`인지.
- [ ] 구현:

```js
    function cellsOfFruit(board, fruit) {
        const cells = [];
        board.forEach((line, row) => line.forEach((value, col) => {
            if (value === fruit) cells.push({ row, col });
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
    // after it pays the chain bonus from 2 up, exactly like a cascade after a swap.
    function resolveClear(board, cells, rng, fruits) {
        const seen = new Set();
        const cleared = cells.filter(cell => {
            const key = `${cell.row},${cell.col}`;
            if (!inBounds(board, cell) || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        if (cleared.length === 0) return { valid: false };

        const groups = [];
        cleared.forEach(cell => {
            const fruit = board[cell.row][cell.col];
            const group = groups.find(entry => entry.fruit === fruit);
            if (group) group.cells.push(cell);
            else groups.push({ fruit, cells: [cell] });
        });

        const collapsed = clearAndCollapse(board, cleared, rng, fruits);
        const first = { kind: 'item', chain: 1, groups, cleared, falls: collapsed.falls, spawns: collapsed.spawns, board: collapsed.board };
        const after = cascade(collapsed.board, rng, fruits, 2);
        return { valid: true, steps: [first, ...after.steps], finalBoard: after.finalBoard };
    }
```

- [ ] `Board` export에 셋 다 더한다. 테스트 통과 후 커밋.

### Task 3: items.js — 드롭과 슬롯

**Files:** Create `items.js`, `tests/items.test.js`; Modify `tuning.js`, `index.html`

- [ ] `tuning.js`에 추가:

```js
        items: {
            slots: 2,
            crateRadius: 1,
            // 위에서부터 먼저 맞는 조건 하나만 준다.
            drops: [
                { item: 'stock', minChain: 4, minGroup: 6 },
                { item: 'crate', minChain: Infinity, minGroup: 5 },
                { item: 'reshelf', minChain: 3, minGroup: Infinity }
            ]
        },
```

- [ ] 실패하는 테스트부터: 연쇄 4단이면 `stock`, 한 번에 6개면 `stock`, 5개면 `crate`, 연쇄 3단이면 `reshelf`, 아무것도 아니면 `null`, 슬롯이 꽉 차면 `addItem`이 그대로 돌려주기, `useItem`이 그 자리만 빼기(원본 불변).
- [ ] 구현(요지): `dropFor(result, rules)`는 `result.steps`에서 최대 연쇄(`steps.length`)와 최대 묶음 크기를 구해 `rules.drops`를 위에서부터 훑는다. `kind: 'item'` 단계로 시작한 결과(아이템이 만든 연쇄)도 같은 규칙을 탄다.
- [ ] `index.html` 스크립트 순서: `history.js` 다음, `js_file.js` 앞에 `items.js`.
- [ ] 테스트 통과 후 커밋.

### Task 4: 슬롯 UI와 아이템 쓰기

**Files:** Modify `index.html`, `css_file.css`, `js_file.js`

- [ ] 게임판 위에 슬롯 두 칸(`#itemSlots`). 빈 칸은 옅은 나무 틀, 들어오면 아이콘(재고 정리 🧺 / 상자 📦 / 진열 다시 🔄)과 이름.
- [ ] 한 수가 끝날 때(`finishMove` 뒤) `Items.dropFor`로 드롭을 판정한다. 연습 판(`run.tutorial`)에서는 건너뛴다. 들어오면 슬롯이 튀고 "입고!" 플로트와 팝 소리.
- [ ] 슬롯을 탭하면:
  - `reshelf`: 바로 `Board.shuffle`로 판을 다시 깔고 슬롯에서 뺀다(매출·배율 변화 없음).
  - `stock`/`crate`: 조준 상태로 들어간다(`armedItem`). 슬롯이 금색으로 빛나고, 판을 미는 입력은 막힌다. 슬롯을 다시 탭하면 취소.
- [ ] 조준 상태에서 칸을 탭하면 대상 칸을 정하고 `Board.cellsOfFruit` / `Board.cellsAround`로 지울 칸을 구해 `Board.resolveClear`를 돌린다. 결과는 지금 한 수를 처리하는 경로(애니메이션 → `Economy.scoreMove` → 묶음별 수익 플로트 → `finishMove`)를 그대로 태운다. **인건비(`chargeSwap`)는 부르지 않는다.**
- [ ] 배율용 "민 과일": `stock`은 지운 과일, `crate`는 첫 단계에서 가장 많이 지워진 과일.
- [ ] 아이템으로 생긴 결과도 드롭 판정을 탄다(연쇄가 크게 터지면 아이템이 또 나온다).
- [ ] 판이 끝나거나 새 판을 시작하면 슬롯을 비우고 조준을 푼다.
- [ ] 반응 확인: `node --check js_file.js`, 브라우저에서 드롭 → 사용 → 매출 반영까지.

### Task 5: 봇도 아이템을 쓰게 하고 밸런스 맞추기

**Files:** Modify `tools/sim.js`, `tuning.js`

- [ ] 봇 정책: 슬롯이 꽉 차면 그때 쓴다. `stock`은 판에서 가장 흔한 과일에, `crate`는 가장 많이 지울 수 있는 3×3에, `reshelf`는 움직일 수가 없을 때.
- [ ] `node tools/sim.js 30`으로 다시 재고, 단계별 체류 시간이 목표(보통 기준 1~3단계 40~100초, 4~6단계 60~85초)에 들어오도록 확장비를 조정한다.
- [ ] 클리어 비율이 예전과 비슷한지 본다(잘함 이상만 7단계 도달).

### Task 6: 검증

- [ ] `node --test tests/*.test.js` 전부 통과.
- [ ] 브라우저(소리 끔)에서: 아이템 드롭 → 재고 정리로 한 종류 판매(수익 플로트·배율 확인) → 상자 3×3 → 진열 다시 → 슬롯이 꽉 찼을 때 드롭이 멈추는지 → 연습 판에서 안 나오는지.
- [ ] 움직임 줄이기 설정에서 새 애니메이션이 꺼지는지.
- [ ] 스크린샷과 함께 보고하고 푸시.
