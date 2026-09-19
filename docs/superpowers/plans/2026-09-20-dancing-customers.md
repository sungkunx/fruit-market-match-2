# 단색 CSS 손님: 뛰어오고 춤추기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 손님을 단색 CSS 캐릭터(머리 + 몸 두 덩어리, 점 눈)로 바꾸고, 뛰어와서 춤추고 뛰어나가게 한다.

**Architecture:** `js_file.js`의 손님 DOM 생성·입장·퇴장 함수와 `css_file.css`의 손님 규칙만 바꾼다. 손님 수 계산(`crowd.js`)과 줄 배치 흐름은 그대로 둔다. 이미지 슬롯과 무작위 폴짝 뛰기는 없앤다(춤이 대신한다).

**Tech Stack:** 빌드 도구 없는 HTML/CSS/JavaScript

**Spec:** `docs/superpowers/specs/2026-09-19-growth-mode-phase1b-design.md` §5.2 (2026-09-20 개정)

## Global Constraints

- npm 패키지·빌드 도구를 추가하지 않는다.
- 색은 `css_file.css` 맨 위 `:root` 변수만 쓴다. 이번에 안 쓰게 되는 `--skin-light`, `--skin-tan`은 지운다.
- `js_file.js`는 4칸 들여쓰기, 세미콜론. 컨트롤러의 튜닝 값은 `rules`로 읽는다(`Tuning`을 직접 쓰지 않는다).
- **브라우저 확인은 항상 음소거로 한다**: `GameAudio.init(); GameAudio.setMuted(true); updateSoundButtons();`. 끝나면 서버를 멈추고 탭을 닫는다. 실제 랭킹 등록 버튼은 누르지 않는다.
- 커밋 메시지 끝에 정확히 이 줄(자기 모델 이름을 쓰지 않는다):
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  ```

---

### Task 1: 단색 손님과 달리기·춤 동작

**Files:**
- Modify: `css_file.css` (`:root` 두 줄 삭제, "손님" 구역 교체, 움직임 줄이기 블록의 손님 규칙 교체)
- Modify: `js_file.js` (손님 상수, `customerSpot`, `createCustomerElement`, `addCustomer`, `removeOldestCustomer`, `clearCustomers`, `updateCrowd`; `hopRandomCustomer` 삭제)

**Interfaces:**
- Consumes: 기존 `rules.crowdMax`, `run.combo.multiplier`, `pickRandom`, `layoutCustomers`, `#crowd` 요소
- Produces: 같은 함수 이름(`addCustomer`, `removeOldestCustomer`, `sendCustomersHome`, `clearCustomers`, `updateCrowd`) — 호출하는 쪽은 바뀌지 않는다

- [ ] **Step 1: `css_file.css` — 피부색 변수 삭제**

`:root`에서 아래 두 줄을 지운다.

```css
    --skin-light: #F6D2B0;
    --skin-tan: #D9A077;
```

- [ ] **Step 2: `css_file.css` — 손님 구역 교체**

`/* ---------- 손님 ---------- */` 주석부터 `@keyframes customerHop { ... }` 블록 끝까지(다음 구역 `/* ---------- 단계 안내 카드 ---------- */` 바로 앞까지)를 아래로 교체한다.

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

/* 줄 위치와 크기(transform)는 JS가 정하고, 걸어가는 이동은 transition이 그린다 */
.customer {
    position: absolute;
    left: 50%;
    bottom: 0;
    width: 22px;
    height: 30px;
    margin-left: -11px;
    transform-origin: bottom center;
    transition: transform 0.6s ease-out, opacity 0.6s ease-out;
}

/* 바라보는 방향(좌우 반전) */
.customer-flip {
    position: absolute;
    inset: 0;
}

/* 달리기·춤 동작. 눈도 이 안에 있어서 함께 움직인다 */
.customer-body {
    position: absolute;
    inset: 0;
    transform-origin: bottom center;
}

/* 머리 */
.customer-body::before {
    content: '';
    position: absolute;
    left: 4px;
    top: 0;
    z-index: 1;
    width: 14px;
    height: 14px;
    background: var(--c);
    border: 3px solid var(--wood-dark);
    border-radius: 50%;
}

/* 몸 */
.customer-body::after {
    content: '';
    position: absolute;
    left: 1px;
    bottom: 0;
    width: 20px;
    height: 16px;
    background: var(--c);
    border: 3px solid var(--wood-dark);
    border-radius: 10px 10px 5px 5px;
}

.customer-eyes {
    position: absolute;
    left: 0;
    right: 0;
    top: 5px;
    z-index: 2;
    height: 4px;
}

.customer-eyes::before,
.customer-eyes::after {
    content: '';
    position: absolute;
    top: 0;
    width: 3px;
    height: 4px;
    background: var(--cream);
    border-radius: 50%;
}

.customer-eyes::before {
    left: 7px;
}

.customer-eyes::after {
    right: 7px;
}

.customer.running .customer-body {
    animation: customerRun 0.26s ease-in-out infinite alternate;
}

.customer.dancing .customer-body {
    animation: customerDance 0.9s ease-in-out infinite;
}

/* 배율 x2 이상: 모두 신나게 */
.crowd.party .customer.dancing .customer-body {
    animation-duration: 0.6s;
}

@keyframes customerRun {
    from { transform: translateY(0) rotate(12deg) scaleY(0.94); }
    to { transform: translateY(-7px) rotate(12deg) scaleY(1.04); }
}

@keyframes customerDance {
    0% { transform: rotate(-12deg); }
    25% { transform: translateY(-8px) scaleY(1.08); }
    50% { transform: rotate(12deg); }
    75% { transform: scaleX(1.15) scaleY(0.85); }
    100% { transform: rotate(-12deg); }
}

```

- [ ] **Step 3: `css_file.css` — 움직임 줄이기**

`@media (prefers-reduced-motion: reduce)` 블록 안의 손님 규칙 두 개를 아래로 교체한다(`.customer { transition: none !important; }`는 그대로, `.customer-art, .customer img { ... }`를 바꾼다).

```css
    .customer {
        transition: none !important;
    }

    .customer-body {
        animation: none !important;
    }
```

- [ ] **Step 4: `js_file.js` — 상수**

아래 네 줄을 지운다.

```js
const missingCustomerImages = new Set();
const CUSTOMER_SKINS = ['var(--skin-light)', 'var(--skin-tan)'];
const CUSTOMER_SHIRTS = ['var(--awning-red)', 'var(--leaf)', 'var(--store-blue)', 'var(--violet)', 'var(--gold)', 'var(--sunset)'];
const CUSTOMER_IMAGE_COUNT = 4;
```

그 자리(`const CUSTOMER_EDGE_X = 220;` 바로 위)에 추가한다.

```js
const CUSTOMER_COLORS = ['var(--awning-red)', 'var(--leaf)', 'var(--store-blue)', 'var(--violet)', 'var(--gold)', 'var(--sunset)'];
```

`let customers = []; // oldest first: { element, x }` 줄의 주석을 `// oldest first: { element, x, timer }`로 바꾼다.

- [ ] **Step 5: `js_file.js` — 손님 함수 교체**

`// Queue spot for the customer at \`index\`` 주석으로 시작하는 `customerSpot`부터 `updateCrowd()` 함수 끝까지(그 사이의 `layoutCustomers`, `createCustomerElement`, `addCustomer`, `removeOldestCustomer`, `sendCustomersHome`, `clearCustomers`, `hopRandomCustomer`, `updateCrowd` 전부)를 아래로 교체한다. `pickRandom`은 그 위에 그대로 둔다.

```js
// Queue spot for the customer at `index`: alternating left and right of the door.
function customerSpot(index) {
    const side = index % 2 === 0 ? -1 : 1;
    const rank = Math.floor(index / 2) + 1;
    return { x: side * (4 + rank * 20), scale: 1 - rank * 0.03, layer: 20 - rank };
}

function layoutCustomers() {
    customers.forEach((customer, index) => {
        const spot = customerSpot(index);
        customer.x = spot.x;
        customer.element.style.transform = `translateX(${spot.x}px) scale(${spot.scale})`;
        customer.element.style.zIndex = String(spot.layer);
    });
}

// Turns the customer to face the way they are running.
function faceCustomer(element, fromX, toX) {
    element.firstChild.style.transform = toX < fromX ? 'scaleX(-1)' : 'scaleX(1)';
}

// A single-colour customer drawn with CSS: round head and body, two eyes.
function createCustomerElement() {
    const element = document.createElement('div');
    element.className = 'customer running';

    const flip = document.createElement('div');
    flip.className = 'customer-flip';

    const body = document.createElement('div');
    body.className = 'customer-body';
    body.style.setProperty('--c', pickRandom(CUSTOMER_COLORS));
    body.style.animationDelay = `${(-Math.random()).toFixed(2)}s`; // everyone dances on their own beat

    const eyes = document.createElement('div');
    eyes.className = 'customer-eyes';

    body.appendChild(eyes);
    flip.appendChild(body);
    element.appendChild(flip);
    return element;
}

// A customer runs in from the nearer edge, joins the queue, and starts dancing.
function addCustomer() {
    if (customers.length >= rules.crowdMax) return;
    const element = createCustomerElement();
    const spotX = customerSpot(customers.length).x;
    const entryX = spotX < 0 ? -CUSTOMER_EDGE_X : CUSTOMER_EDGE_X;
    faceCustomer(element, entryX, spotX);
    element.style.transform = `translateX(${entryX}px)`;
    document.getElementById('crowd').appendChild(element);

    const customer = { element, x: entryX, timer: 0 };
    customers.push(customer);
    void element.offsetWidth; // start the run from the edge
    layoutCustomers();
    customer.timer = setTimeout(() => element.classList.replace('running', 'dancing'), CUSTOMER_WALK_MS);
}

// The customer who has waited longest runs off; the rest step closer to the door.
function removeOldestCustomer() {
    const customer = customers.shift();
    if (!customer) return;
    clearTimeout(customer.timer);
    const exitX = customer.x < 0 ? -CUSTOMER_EDGE_X : CUSTOMER_EDGE_X;
    customer.element.classList.remove('dancing');
    customer.element.classList.add('running');
    faceCustomer(customer.element, customer.x, exitX);
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
    customers.forEach(customer => clearTimeout(customer.timer));
    customers = [];
    document.getElementById('crowd').innerHTML = '';
}

// Walks customers in or out toward the size the recent earning pace calls for.
function updateCrowd() {
    const pace = Crowd.earningPace(crowd, run.time, rules.crowdWindowSeconds);
    const target = Crowd.targetCrowdSize(pace, Economy.currentRent(run, rules), rules);
    if (customers.length > target) {
        removeOldestCustomer();
    } else {
        while (customers.length < target) {
            addCustomer();
        }
    }
    document.getElementById('crowd').classList.toggle('party', run.combo.multiplier >= 2);
}
```

- [ ] **Step 6: 남은 흔적 확인과 테스트**

Run: `grep -nE "missingCustomerImages|CUSTOMER_SKINS|CUSTOMER_SHIRTS|CUSTOMER_IMAGE_COUNT|hopRandomCustomer|customer-art|customer_|skin-" js_file.js css_file.css`
Expected: 출력 없음.

Run: `node --check js_file.js && node --test tests/*.test.js`
Expected: 오류 없음, 69개 PASS.

- [ ] **Step 7: 브라우저 확인**

미리보기 도구가 있으면 `.claude/launch.json`의 `fruit-market`(포트 8766), 없으면 `python3 -m http.server 8795`. 375×812. 옛 JS가 보이면(`typeof faceCustomer`가 `undefined`) `await Promise.all(['js_file.js','css_file.css','index.html'].map(f => fetch(f, {cache: 'reload'}))); location.reload();`. 창이 숨겨져 자동 일시정지되면 `resumeGame()`. 튜토리얼을 건너뛰려면 `localStorage.setItem('fruitMarketTutorialDone', 'true')`. 음소거 후 `startGame()`, 단계 안내 카드는 `closeStageCard()`로 닫는다.

- 매치하면 한 가지 색 손님(머리 + 몸, 갈색 외곽선, 크림색 점 눈)이 가까운 쪽 끝에서 **몸을 앞으로 기울이고 통통 튀며** 뛰어오고, 가는 방향을 바라본다(왼쪽에서 온 손님은 오른쪽을 봄).
- 제자리에 서면 좌우로 기울고 폴짝 뛰고 찌부러지는 춤을 춘다. 손님마다 박자가 다르다. **눈이 몸과 함께 움직인다**(몸만 튀고 눈이 제자리에 남지 않는다).
- `run = { ...run, combo: { ...run.combo, multiplier: 2.5 } }; updateCrowd();` → `#crowd`에 `party` 클래스가 붙고 춤이 빨라진다.
- 손을 놓으면 한 명씩 나가는 쪽을 바라보고 달리기 동작으로 뛰어나가며 흐려진다.
- 🏠 → 다시 개업하면 손님 0명에서 시작하고, 콘솔 오류가 없다(`img/customer_*` 요청도 없다).
- 스크린샷: 여러 명이 춤추는 화면.

- [ ] **Step 8: Commit**

```bash
git add css_file.css js_file.js
git commit -m "feat: single-colour customers that run in, dance, and run off" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```
