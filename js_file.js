const SWIPE_THRESHOLD = 0.3; // fraction of a cell the finger must travel to count as a swipe
const TICK_MS = 100;
const TICK_SECONDS = TICK_MS / 1000;
// Rules for the run in progress: the real tuning, or a copy that opens in the practice shop.
const PRACTICE_RULES = { ...Tuning, stages: [Tuning.tutorialStage, ...Tuning.stages.slice(1)] };
let rules = Tuning;
const FRUIT_NAMES = {
    apple: '사과',
    banana: '바나나',
    grape: '포도',
    kiwi: '키위',
    orange: '오렌지',
    strawberry: '딸기',
    cherry: '체리'
};

const STAGE_TIPS = [
    '과일 4종 — 연쇄를 노려 보세요',
    '과일이 5종이라 연쇄가 줄어요. 한 수 한 수 신중하게',
    '진열대가 넓어졌어요. 숨 돌릴 틈이에요',
    '과일 6종 — 같은 과일 연속 매치로 배율을 지키세요',
    '넓어진 진열대로 크게 벌 때예요',
    '마지막 과일까지 입고! 백화점 임대료는 머무를수록 치솟아요'
];

let run = null;
let board = [];
let activeFruits = [];
let cellElements = [];
let gameRunning = false;
let isAnimating = false;
let sheetOpen = false;
let hiddenPause = false;
let expanding = false;
let stageCardOpen = false;
let offeredStage = 0; // the stage whose expansion offer already popped up
const TUTORIAL_KEY = 'fruitMarketTutorialDone';
const PRACTICE_LINES = {
    1: '과일을 밀어 같은 과일 3개를 한 줄로 맞춰 보세요',
    2: '판 돈은 매출(점수)과 수익에 함께 쌓여요',
    3: '수익은 임대료로 계속 줄어요. 0이 되면 파산이에요!',
    4: '돈이 모였어요. 가게를 키워 보세요!'
};
let practiceStep = 0; // 0 = not a practice run
let practiceStepAt = 0;
let practiceDoneOpen = false;
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
const CUSTOMER_COLORS = ['var(--awning-red)', 'var(--leaf)', 'var(--store-blue)', 'var(--violet)', 'var(--gold)', 'var(--sunset)'];
const CUSTOMER_EDGE_X = 220; // px from the door where customers enter and leave
const CUSTOMER_WALK_MS = 600;
let crowd = Crowd.createCrowd();
let customers = []; // oldest first: { element, x, timer }
let crowdClock = 0;

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
    return '$' + Math.floor(value).toLocaleString('ko-KR');
}

function stageInfo(stage) {
    return rules.stages[stage - 1];
}

function fruitsForStage(stage) {
    return rules.fruitOrder.slice(0, stageInfo(stage).fruits);
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
    return sheetOpen || hiddenPause || expanding || stageCardOpen || practiceDoneOpen;
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
    run = Economy.chargeSwap(run, rules);
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

    const scored = Economy.scoreMove(run, rules, result, movedFruit, displacedFruit);
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
        crowd = Crowd.recordEarning(crowd, stepScores[i], run.time, rules.crowdWindowSeconds);
        addCustomer();
        if (practiceStep === 1) {
            setPracticeStep(2);
        }
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

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

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

// "좌판으로", "매대로": 로 after a vowel or ㄹ, 으로 after any other final consonant.
function withRo(word) {
    const code = word.charCodeAt(word.length - 1) - 0xAC00;
    const finalConsonant = code >= 0 && code < 11172 ? code % 28 : 0;
    return word + (finalConsonant === 0 || finalConsonant === 8 ? '로' : '으로');
}

function updateExpandButton() {
    const button = document.getElementById('expandBtn');
    const cost = Economy.nextExpandCost(run, rules);
    if (cost === null) {
        button.hidden = true;
        return;
    }
    button.hidden = false;

    const isFinal = run.stage === rules.stages.length - 1;
    const nextName = stageInfo(run.stage + 1).name;
    document.getElementById('expandTitle').textContent = isFinal
        ? `${nextName} 세우기 · ${formatMoney(cost)}`
        : `${withRo(nextName)} 확장 · ${formatMoney(cost)}`;

    const ready = gameRunning && Economy.canExpand(run, rules) && (!run.tutorial || practiceStep === 4);
    const shortfall = formatMoney(Economy.expandRequirement(run, rules) - Math.max(0, run.cash));
    let hint = isFinal ? `수익 ${shortfall} 더 필요` : `준비금 포함 ${shortfall} 더 필요`;
    if (ready) {
        hint = isFinal ? '영업을 마치고 정산할 수 있어요' : '지금 확장할 수 있어요';
        if (run.overtime) {
            hint = '연장전 · 아이템 없이 점수만';
        }
    }
    document.getElementById('expandHint').textContent = hint;
    button.disabled = !ready;
    button.classList.toggle('ready', ready);
}

function openExpandSheet() {
    if (!canAcceptInput() || !Economy.canExpand(run, rules) || (run.tutorial && practiceStep !== 4)) return;
    sheetOpen = true;

    const cost = Economy.nextExpandCost(run, rules);
    const nextStage = run.stage + 1;
    const current = stageInfo(run.stage);
    const next = stageInfo(nextStage);
    const isFinal = nextStage === rules.stages.length;
    const cashAfter = run.cash - cost;
    const nextRent = Economy.projectedRent(run, rules, nextStage);

    document.getElementById('sheetTitle').textContent = isFinal
        ? `${next.name}을 세울까요?`
        : `${withRo(next.name)} 확장할까요?`;
    document.getElementById('sheetCost').textContent = '−' + formatMoney(cost);
    document.getElementById('sheetSummary').textContent = isFinal
        ? `영업을 마치고 정산합니다. 점수 = 매출 + 건물 가치 ${formatMoney(cost)} + 남은 수익 × ${rules.clearCashMultiplier}`
        : `수익 ${formatMoney(run.cash)} → ${formatMoney(cashAfter)} · 새 임대료 ${Math.floor(cashAfter / nextRent)}초분 확보`;

    renderBuilding(document.getElementById('sheetFrom'), run.stage);
    renderBuilding(document.getElementById('sheetTo'), nextStage);

    const newFruit = rules.fruitOrder[next.fruits - 1];
    const changes = isFinal
        ? [['예상 점수', formatMoney(run.revenue + cost + cashAfter * rules.clearCashMultiplier)]]
        : [
            ['임대료', `${formatMoney(Economy.currentRent(run, rules))} → ${formatMoney(nextRent)} /초`],
            ['진열대', `${current.cols}×${current.rows} → ${next.cols}×${next.rows}`],
            ['과일', next.fruits > current.fruits ? `${FRUIT_NAMES[newFruit]} 입고 (${next.fruits}종)` : `그대로 (${next.fruits}종)`, next.fruits > current.fruits ? fruitSrc(newFruit, '001') : null]
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

    document.getElementById('sheetConfirm').textContent = isFinal ? '세우고 영업 마치기' : '확장한다';
    document.getElementById('sheetNote').hidden = run.tutorial;
    document.getElementById('sheetCancel').textContent = run.tutorial ? '조금 더 벌고 올게요' : '좀 더 할게요 · 점수만';
    document.getElementById('expandSheet').classList.add('show');
}

// Tells the player what the stage that just opened changes. Game time waits while it shows.
function openStageCard() {
    const stage = run.stage;
    const info = stageInfo(stage);
    const previous = stage > 1 ? stageInfo(stage - 1) : null;
    const newFruit = previous && info.fruits > previous.fruits ? rules.fruitOrder[info.fruits - 1] : null;
    const inflationPercent = Math.round((Economy.inflation(run, rules) - 1) * 100);

    renderBuilding(document.getElementById('stageCardBuilding'), stage);
    document.getElementById('stageCardTitle').textContent = stage === 1 ? `${info.name} 개업!` : `${stage}단계 ${info.name} 개업!`;

    document.getElementById('stageCardFruit').hidden = !newFruit;
    if (newFruit) {
        document.getElementById('stageCardFruitImage').src = fruitSrc(newFruit, '002');
        document.getElementById('stageCardFruitText').textContent = `${FRUIT_NAMES[newFruit]} 입고! 이제 과일 ${info.fruits}종`;
    }

    const facts = [
        `진열대 ${info.cols}×${info.rows}`,
        `과일 1개 ${formatMoney(Economy.currentPrice(run, rules))}`,
        `임대료 ${formatMoney(Economy.currentRent(run, rules))}/초 · 물가 +${inflationPercent}%`
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

function closeExpandSheet() {
    sheetOpen = false;
    document.getElementById('expandSheet').classList.remove('show');
}

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

async function confirmExpand() {
    if (!sheetOpen) return;
    closeExpandSheet();
    if (!canAcceptInput() || !Economy.canExpand(run, rules)) return;
    if (run.tutorial) {
        showPracticeDone();
        return;
    }

    const session = gameSession;
    const previousFruits = activeFruits;
    isAnimating = true;
    expanding = true;
    run = Economy.expand(run, rules);
    GameAudio.playSuccess(3);
    updateDashboard();

    await showNewBuilding();
    if (session !== gameSession) return;

    if (run.ended === 'clear') {
        await wait(600);
        if (session !== gameSession) return;
        isAnimating = false;
        expanding = false;
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
    expanding = false;
    if (gameRunning) {
        openStageCard();
    }
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

function updateDashboard() {
    if (!run) return;
    document.getElementById('revenue').textContent = formatMoney(run.revenue);
    document.getElementById('cash').textContent = formatMoney(Math.max(0, run.cash));

    const requirement = Economy.expandRequirement(run, rules);
    const ratio = requirement ? Math.min(1, Math.max(0, run.cash) / requirement) : 1;
    document.getElementById('cashBar').style.width = (ratio * 100).toFixed(1) + '%';

    updateCostLine();
    updateMultiplier();
    updateDanger();
    updateBoardInfo();
    updateExpandButton();
    updatePractice();
}

function updateCostLine() {
    const rent = Math.round(Economy.currentRent(run, rules));
    const labor = rules.laborPerSwap * run.modifiers.labor;
    const logistics = Math.round(Economy.currentLogistics(run, rules));
    const line = document.getElementById('costLine');
    line.textContent = `임대료 −${formatMoney(rent)}/초 · 인건비 −${formatMoney(labor)}/스왑 · 물류비 −${formatMoney(logistics)}/${rules.logisticsInterval}초`;

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
    const danger = gameRunning && Economy.isInDanger(run, rules);
    document.getElementById('cashRow').classList.toggle('danger', danger);
    if (danger === dangerShown) return;
    dangerShown = danger;
    document.getElementById('sirenWarning').classList.toggle('siren-active', danger);
    GameAudio.setHurry(danger);
}

function updateBoardInfo() {
    const info = stageInfo(run.stage);
    const inflationPercent = Math.round((Economy.inflation(run, rules) - 1) * 100);
    let text = `진열대 ${info.cols}×${info.rows} · 과일 ${info.fruits}종 · 물가 +${inflationPercent}%`;
    const surchargePercent = Math.round((Economy.surcharge(run, rules) - 1) * 100);
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
    run = Economy.tick(run, rules, TICK_SECONDS);
    updateDashboard();
    crowdClock += TICK_SECONDS;
    if (crowdClock >= rules.crowdUpdateSeconds - 1e-9) {
        crowdClock = 0;
        updateCrowd();
    }
    if (!isAnimating && Economy.isBankrupt(run)) {
        endRun();
    }
    offerExpansion();
}

function startLoop() {
    clearInterval(loopInterval);
    loopInterval = setInterval(onTick, TICK_MS);
}

function endRun() {
    if (!gameRunning) return;
    gameRunning = false;
    clearInterval(loopInterval);
    resumeGame();
    closeStageCard();
    run = Economy.bankrupt(run); // keeps a clear as a clear
    score = Economy.finalScore(run, rules);
    updateDashboard();
    sendCustomersHome();
    GameAudio.stopMusic();

    showResult();

    lastScore = score;
    if (score > highestScore) {
        highestScore = score;
    }
    saveGameData();
    updateStartScreenStats();
}

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

    const canSubmit = isNewPersonalBest && score >= rules.leaderboardMinScore;
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
    const shownFor = run.time - practiceStepAt;
    if (practiceStep === 2 && shownFor >= rules.practiceRentTipSeconds) {
        setPracticeStep(3);
    } else if (practiceStep === 3 && shownFor >= rules.practiceStepMinSeconds && Economy.canExpand(run, rules)) {
        setPracticeStep(4);
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
    comboLevel = 0;
    setComboEffects(0);
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
        alert('이름을 입력해 주세요!');
        return;
    }

    // Show loading state
    const submitBtn = document.querySelector('.submit-score-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="btn-icon">⏳</span>등록 중...';
    submitBtn.disabled = true;

    try {
        const success = await submitScoreToFirebase(playerName, score);

        if (success) {
            alert('랭킹에 등록했어요! 🎉');
        } else {
            alert('등록에 실패했어요. 다시 시도해 주세요.');
        }
    } catch (error) {
        alert('등록 중 오류가 났어요.');
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

    // First visit: the practice shop instead of the countdown
    if (isTutorialDone()) {
        showCountdown();
    } else {
        actuallyStartGame(true);
    }
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
    offeredStage = 0;
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

function restartGame() {
    // Stop current game session; any running move animation sees the new session and stops
    gameRunning = false;
    gameSession++;
    isAnimating = false;
    sheetOpen = false;
    hiddenPause = false;
    expanding = false;
    stageCardOpen = false;
    offeredStage = 0;
    practiceDoneOpen = false;
    practiceStep = 0;
    clearHint();
    document.getElementById('coachBubble').hidden = true;
    document.getElementById('practiceSkipBtn').hidden = true;
    document.getElementById('practiceDoneCard').classList.remove('show');
    pointerStart = null;
    clearInterval(loopInterval);

    GameAudio.stopMusic();
    GameAudio.setHurry(false);
    dangerShown = false;

    comboLevel = 0;
    setComboEffects(0);
    clearCustomers();

    // Hide game over screen and show start screen
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('pauseOverlay').classList.remove('show');
    document.getElementById('expandSheet').classList.remove('show');
    document.getElementById('stageCard').classList.remove('show');
    document.getElementById('startScreen').style.display = 'flex';
    document.body.classList.add('on-start');

    // Reset siren warning
    document.getElementById('sirenWarning').classList.remove('siren-active');
}

// Service Worker 등록
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js')
      .then(function(registration) {
        console.log('ServiceWorker registration successful');
      })
      .catch(function(err) {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}

// Save and load game data
function saveGameData() {
    const gameData = {
        lastScore: lastScore,
        highestScore: highestScore
    };
    localStorage.setItem('fruitMarketGrowthData', JSON.stringify(gameData));
}

function loadGameData() {
    const savedData = localStorage.getItem('fruitMarketGrowthData');
    if (savedData) {
        const gameData = JSON.parse(savedData);
        lastScore = gameData.lastScore || 0;
        highestScore = gameData.highestScore || 0;
    }
    updateStartScreenStats();
}

function updateStartScreenStats() {
    document.getElementById('lastScore').textContent = formatMoney(lastScore);
    document.getElementById('highestScore').textContent = formatMoney(highestScore);
}

// Initialize title fruit animations
function initializeTitleAnimations() {
    // 장식 과일 애니메이션 시작
    startDecorationAnimations();
}

// Start decoration fruit animations
function startDecorationAnimations() {
    const decorationFruits = document.querySelectorAll('.decoration-fruit');
    
    decorationFruits.forEach((fruit, index) => {
        // 각 과일마다 다른 간격으로 표정 변경 (2-5초 사이)
        const interval = 2000 + (index * 500) + Math.random() * 1000;
        
        setInterval(() => {
            changeDecorationExpression(fruit);
        }, interval);
    });
}

// Change decoration fruit expression randomly
function changeDecorationExpression(fruitElement) {
    const fruitType = fruitElement.dataset.fruit;
    
    // 랜덤하게 표정 선택 (1-4번 프레임 중)
    const expressions = ['001', '002', '003', '004'];
    const randomExpression = expressions[Math.floor(Math.random() * expressions.length)];
    
    // 표정 변경
    fruitElement.src = `img/fruit_${fruitType}_${randomExpression}.png`;
    
    // 약간의 스케일 효과 추가
    fruitElement.style.transform = 'scale(1.1)';
    
    // 1초 후 원래 크기로 복원하고 기본 표정으로 돌아가기
    setTimeout(() => {
        fruitElement.style.transform = 'scale(1)';
        // 50% 확률로 기본 표정으로 돌아가기
        if (Math.random() < 0.5) {
            fruitElement.src = `img/fruit_${fruitType}_001.png`;
        }
    }, 1000);
}

// Handle decoration fruit click
function onDecorationFruitClick(fruitElement) {
    const fruitType = fruitElement.dataset.fruit;
    
    // 현재 표정 확인
    const currentSrc = fruitElement.src;
    const currentFrame = currentSrc.substring(currentSrc.lastIndexOf('_') + 1, currentSrc.lastIndexOf('.'));
    
    // 현재 표정과 다른 표정들 중에서 랜덤 선택
    const allExpressions = ['001', '002', '003', '004'];
    const otherExpressions = allExpressions.filter(exp => exp !== currentFrame);
    const randomExpression = otherExpressions[Math.floor(Math.random() * otherExpressions.length)];
    
    // 클릭 효과음 재생 (항상 재생)
    GameAudio.init();
    GameAudio.playPop();
    
    // 표정 변경
    fruitElement.src = `img/fruit_${fruitType}_${randomExpression}.png`;
    
    // 클릭 애니메이션 효과
    fruitElement.style.transform = 'scale(1.2)';
    
    setTimeout(() => {
        fruitElement.style.transform = 'scale(1)';
    }, 200);
}

// Popup Functions
function showTutorial() {
    const popup = document.getElementById('tutorialPopup');
    popup.classList.add('show');
    // Prevent body scroll when popup is open
    document.body.style.overflow = 'hidden';
}

function closeTutorial() {
    const popup = document.getElementById('tutorialPopup');
    popup.classList.remove('show');
    document.body.style.overflow = '';
}

function showRanking() {
    const popup = document.getElementById('rankingPopup');
    popup.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Update header with current month
    const now = new Date();
    const header = popup.querySelector('.popup-header h2');
    header.textContent = `🏆 이번 달 랭킹 - ${now.getFullYear()}년 ${now.getMonth() + 1}월`;

    // Generate and display ranking
    generateRanking();
}

function closeRanking() {
    const popup = document.getElementById('rankingPopup');
    popup.classList.remove('show');
    document.body.style.overflow = '';
}

// Get current month collection name (for monthly reset)
function getCurrentMonthCollection() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // 01-12
    return `growth_rankings_${year}_${month}`; // e.g., "growth_rankings_2026_09"
}

// Firebase ranking functions
async function submitScoreToFirebase(playerName, score) {
    if (!window.firebaseDB || !window.firebaseUtils) {
        console.log('Firebase not initialized, using local ranking');
        return false;
    }
    
    try {
        const { collection, addDoc, serverTimestamp } = window.firebaseUtils;
        
        // Use monthly collection for automatic reset
        const monthlyCollection = getCurrentMonthCollection();
        
        await addDoc(collection(window.firebaseDB, monthlyCollection), {
            name: playerName,
            score: score,
            timestamp: serverTimestamp()
        });
        
        console.log(`Score submitted to Firebase successfully (${monthlyCollection})`);
        return true;
    } catch (error) {
        console.error('Error submitting score to Firebase:', error);
        return false;
    }
}

async function loadRankingsFromFirebase() {
    if (!window.firebaseDB || !window.firebaseUtils) {
        console.log('Firebase not initialized, using fake ranking');
        generateFakeRanking();
        return;
    }
    
    try {
        const { collection, query, orderBy, limit, getDocs } = window.firebaseUtils;
        
        // Use current month's collection for rankings
        const monthlyCollection = getCurrentMonthCollection();
        
        // Query top 10 scores from current month
        const q = query(
            collection(window.firebaseDB, monthlyCollection),
            orderBy('score', 'desc'),
            limit(10)
        );
        
        const querySnapshot = await getDocs(q);
        const rankings = [];
        
        querySnapshot.forEach((doc) => {
            rankings.push(doc.data());
        });
        
        if (rankings.length === 0) {
            console.log(`No rankings found for ${monthlyCollection}, using fake data`);
            generateFakeRanking();
            return;
        }
        
        displayRankings(rankings);
        updateUserRank(rankings);
        
        console.log(`Rankings loaded from ${monthlyCollection}`);
        
    } catch (error) {
        console.error('Error loading rankings from Firebase:', error);
        generateFakeRanking();
    }
}

function displayRankings(rankings) {
    const rankingList = document.getElementById('rankingList');
    rankingList.innerHTML = '';
    
    rankings.forEach((player, index) => {
        const rankItem = document.createElement('div');
        rankItem.className = 'rank-item';
        rankItem.innerHTML = `
            <span class="rank-number">${index + 1}</span>
            <span class="rank-name">${player.name}</span>
            <span class="rank-score">${formatMoney(player.score)}</span>
        `;
        rankingList.appendChild(rankItem);
    });
}

function updateUserRank(rankings) {
    const userScore = highestScore;
    const userRankElement = document.getElementById('yourRankScore');
    userRankElement.textContent = formatMoney(userScore);
    
    // Calculate user position
    const userPosition = rankings.filter(player => player.score > userScore).length + 1;
    const rankNumberElement = document.querySelector('.your-rank .rank-number');
    
    if (userScore === 0) {
        rankNumberElement.textContent = '-';
    } else if (userPosition <= 10) {
        rankNumberElement.textContent = userPosition;
    } else {
        rankNumberElement.textContent = '10+';
    }
}

// Fallback function for fake ranking (when Firebase is not available)
function generateFakeRanking() {
    const names = [
        'FruitMaster', 'ComboKing', 'SwipeQueen', 'MatchLord', 'PuzzleGuru',
        'TouchWizard', 'ScoreHunter', 'GameChamp', 'FruitNinja', 'MatchMaker',
        'SwipeHero', 'PuzzlePro', 'ComboMaster', 'TouchLegend', 'ScoreBeast',
        'MatchGod', 'FruitExpert', 'SwipeMaster', 'PuzzleKing', 'TouchPro'
    ];
    
    // Generate 10 random scores between 1,000,000 and 5,000,000
    const rankings = [];
    for (let i = 0; i < 10; i++) {
        const score = Math.floor(Math.random() * 4000000) + 1000000;
        const name = names[Math.floor(Math.random() * names.length)];
        rankings.push({ name, score });
    }
    
    // Sort by score (highest first)
    rankings.sort((a, b) => b.score - a.score);
    
    displayRankings(rankings);
    updateUserRank(rankings);
}

// Initialize Firebase with dummy data (call once per month)
async function initializeMonthlyRankings() {
    if (!window.firebaseDB || !window.firebaseUtils) {
        console.log('Firebase not initialized');
        return false;
    }
    
    try {
        const { collection, addDoc, serverTimestamp } = window.firebaseUtils;
        const monthlyCollection = getCurrentMonthCollection();
        
        // Dummy ranking data with funny names
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
        
        console.log(`Initializing rankings for ${monthlyCollection}...`);
        
        // Add each dummy entry to Firebase
        for (const entry of dummyData) {
            await addDoc(collection(window.firebaseDB, monthlyCollection), {
                name: entry.name,
                score: entry.score,
                timestamp: serverTimestamp()
            });
        }
        
        console.log(`Successfully initialized ${dummyData.length} entries for ${monthlyCollection}`);
        return true;
        
    } catch (error) {
        console.error('Error initializing monthly rankings:', error);
        return false;
    }
}

// Updated generateRanking function to use Firebase
function generateRanking() {
    loadRankingsFromFirebase();
}

// Reset current month's rankings (delete all entries)
async function resetCurrentMonthRankings() {
    if (!window.firebaseDB || !window.firebaseUtils) {
        console.log('Firebase not initialized');
        return false;
    }
    
    try {
        const { collection, query, getDocs, deleteDoc } = window.firebaseUtils;
        const monthlyCollection = getCurrentMonthCollection();
        
        console.log(`Resetting rankings for ${monthlyCollection}...`);
        
        // Get all documents in current month's collection
        const q = query(collection(window.firebaseDB, monthlyCollection));
        const querySnapshot = await getDocs(q);
        
        let deletedCount = 0;
        
        // Delete each document
        for (const doc of querySnapshot.docs) {
            await deleteDoc(doc.ref);
            deletedCount++;
        }
        
        console.log(`Successfully deleted ${deletedCount} entries from ${monthlyCollection}`);
        return true;
        
    } catch (error) {
        console.error('Error resetting monthly rankings:', error);
        return false;
    }
}

// Convenience function to reset and reinitialize rankings
async function resetAndInitializeRankings() {
    console.log('🔄 Resetting and reinitializing rankings...');
    
    const resetSuccess = await resetCurrentMonthRankings();
    if (resetSuccess) {
        const initSuccess = await initializeMonthlyRankings();
        if (initSuccess) {
            console.log('✅ Rankings reset and reinitialized successfully!');
            return true;
        }
    }
    
    console.log('❌ Failed to reset and reinitialize rankings');
    return false;
}

// Make functions available globally for console access
window.initializeMonthlyRankings = initializeMonthlyRankings;
window.resetCurrentMonthRankings = resetCurrentMonthRankings;
window.resetAndInitializeRankings = resetAndInitializeRankings;

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
        declineExpansion();
    }
    if (e.target === document.getElementById('stageCard')) {
        closeStageCard();
    }
});

// Close popup with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeTutorial();
        closeRanking();
        if (sheetOpen) {
            declineExpansion();
        }
        if (stageCardOpen) {
            closeStageCard();
        }
    }
});

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
