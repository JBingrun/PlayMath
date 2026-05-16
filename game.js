/* ========== 狀態 ========== */
const state = {
  a: 0, b: 0, c: 0, sign: "+", ans: 0,
  correct: 0, wrong: 0, score: 0, streak: 0,
};

/* ========== 工具 ========== */
const $ = (id) => document.getElementById(id);
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[rand(0, arr.length - 1)];

// 找最近的格子（容忍 60px 內），讓孩子不用對得太準
function findNearestSlot(x, y, opts = {}) {
  const { numOnly = false, opOnly = false, maxDist = 60 } = opts;
  let best = null, bestDist = Infinity;
  document.querySelectorAll("#equation .slot").forEach((s) => {
    if (s.children.length) return;
    const isOp = s.classList.contains("op");
    if (numOnly && isOp) return;
    if (opOnly && !isOp) return;
    const r = s.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    // 在格子內距離為 0，外面則用到中心距離
    const dx = Math.max(r.left - x, 0, x - r.right);
    const dy = Math.max(r.top  - y, 0, y - r.bottom);
    const edgeDist = Math.hypot(dx, dy);
    const d = edgeDist === 0 ? 0 : edgeDist;
    if (d < bestDist && d <= maxDist) { bestDist = d; best = s; }
  });
  return best;
}

/* ========== 題目生成 ========== */
function makeProblem() {
  const a = rand(2, 9);
  const b = rand(2, 9);
  const product = a * b;
  const cMulti = Math.random() < 0.6;
  let c, sign, ans, text;

  if (Math.random() < 0.5) {
    sign = "+";
    c = cMulti ? rand(10, 40) : rand(2, 9);
    ans = product + c;
    text = pick([
      `🍩 烘焙坊一早做好 ${a} 盒甜甜圈，每盒裝 ${b} 個，老闆又從冰箱補了 ${c} 個剛炸好的。請問現在櫃台上總共有幾個甜甜圈？`,
      `📚 圖書館整理書架，總共 ${a} 層，每層放 ${b} 本書。下午志工又搬來 ${c} 本捐贈的新書，現在書架上一共有幾本書？`,
      `🍎 媽媽帶小美去果園，採了滿滿 ${a} 袋蘋果，每袋 ${b} 顆。回家路上小美又跟阿姨買了 ${c} 顆，她們一共帶了幾顆蘋果回家？`,
      `🚗 哥哥在停車場數車子，看到 ${a} 排各停了 ${b} 輛車。沒多久又開來 ${c} 輛要停，現在停車場一共有幾輛車？`,
      `🐠 早上水族館的 ${a} 個魚缸各放了 ${b} 條魚，到了下午館長又從外面帶回 ${c} 條新魚放進來。請問現在館內共有幾條魚？`,
      `🍪 中午點心時間，廚房端出 ${a} 盤餅乾，每盤 ${b} 片。下課時老師又從櫃子拿出 ${c} 片，請問全部一共有幾片餅乾？`,
    ]);
  } else {
    sign = "−";
    const maxC = Math.min(product - 1, cMulti ? 40 : 9);
    const minC = cMulti && maxC >= 10 ? 10 : 1;
    c = rand(Math.min(minC, maxC), maxC);
    ans = product - c;
    text = pick([
      `🍰 蛋糕店一早烤好 ${a} 盤蛋糕，每盤 ${b} 個。中午被客人買走了 ${c} 個，請問櫃子裡還剩下幾個蛋糕？`,
      `🎈 校慶布置準備了 ${a} 包氣球，每包 ${b} 顆，吹的時候不小心破掉 ${c} 顆。現在還剩下幾顆可以用？`,
      `🍊 小安和爺爺到水果店幫忙，他們把橘子分裝成 ${a} 籃，每籃放 ${b} 顆。中午一位老師來買禮盒帶走了 ${c} 顆，請問架上還剩下幾顆橘子？`,
      `🍪 阿嬤烤了 ${a} 盒餅乾，每盒裝 ${b} 片，弟弟拿了 ${c} 片去分給同學。請問餅乾盒裡還剩下幾片？`,
      `📦 早上倉庫裡有 ${a} 箱書，每箱 ${b} 本。下午工人搬走了 ${c} 本送去學校，請問倉庫裡現在還剩下幾本書？`,
      `🐟 清晨漁夫捕了 ${a} 簍魚，每簍 ${b} 條。中午到市場賣掉 ${c} 條，請問漁夫的船上還剩下幾條魚？`,
    ]);
  }
  return { a, b, c, sign, ans, text };
}

/* ========== 建立算式 ========== */
function buildEquation() {
  const eq = $("equation");
  eq.innerHTML = "";
  const product = state.a * state.b;

  // 步驟1：a × b = product
  const s1 = document.createElement("div");
  s1.className = "step";
  s1.innerHTML = `
    <div class="step-label">步驟1</div>
    <div class="eq-line">
      <div class="slot num" data-expected="${state.a}"></div>
      <div class="slot op" data-expected="×"></div>
      <div class="slot num" data-expected="${state.b}"></div>
    </div>
    <hr class="eq-divider">
    <div class="eq-line">
      <div class="eq-equal">=</div>
      <div class="slot num" data-expected="${product}"></div>
    </div>
  `;
  eq.appendChild(s1);

  // 步驟2：product sign c = ?
  const s2 = document.createElement("div");
  s2.className = "step";
  s2.innerHTML = `
    <div class="step-label">步驟2</div>
    <div class="eq-line">
      <div class="slot num" data-expected="${product}"></div>
      <div class="slot op" data-expected="${state.sign}"></div>
      <div class="slot num" data-expected="${state.c}"></div>
    </div>
    <hr class="eq-divider">
    <div class="eq-line">
      <div class="eq-equal">=</div>
      <input type="number" inputmode="numeric" class="answer-input" id="answer" placeholder="?" disabled />
    </div>
  `;
  eq.appendChild(s2);

  $("answer").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); $("answer").blur(); }
  });
}

/* ========== 數字 / 運算符 托盤 ========== */
function buildDigitTray() {
  const tray = $("digitTray");
  tray.innerHTML = "";
  for (let i = 0; i <= 9; i++) {
    const d = document.createElement("div");
    d.className = "piece digit";
    d.dataset.value = String(i);
    d.dataset.type = "digit";
    d.textContent = i;
    tray.appendChild(d);
    d.addEventListener("pointerdown", startPieceDrag);
  }
}

function buildOpTray() {
  const tray = $("opTray");
  tray.innerHTML = "";
  ["+", "−", "×", "÷"].forEach(op => {
    const p = document.createElement("div");
    p.className = "piece op";
    p.dataset.value = op;
    p.dataset.type = "op";
    p.textContent = op;
    tray.appendChild(p);
    p.addEventListener("pointerdown", startPieceDrag);
  });
}

/* ========== 通用拼塊拖拉（克隆飛行版） ========== */
function startPieceDrag(e) {
  if (eraserOn) { notifyEraserBlocking(); return; }
  e.preventDefault();
  const src = e.currentTarget;
  const value = src.dataset.value;
  const type = src.dataset.type; // "digit" or "op"
  const rect = src.getBoundingClientRect();
  const offX = e.clientX - rect.left;
  const offY = e.clientY - rect.top;

  const clone = src.cloneNode(true);
  clone.classList.add("clone");
  clone.style.width = rect.width + "px";
  clone.style.height = rect.height + "px";
  clone.style.left = (e.clientX - offX) + "px";
  clone.style.top = (e.clientY - offY) + "px";
  document.body.appendChild(clone);

  function clearHover() {
    document.querySelectorAll(".slot.hover, .combo-block.hover")
      .forEach(s => s.classList.remove("hover"));
  }
  function findTarget(x, y) {
    clone.style.visibility = "hidden";
    const el = document.elementFromPoint(x, y);
    clone.style.visibility = "";
    const combo = el?.closest(".combo-block");
    // 直接命中的格子優先；否則用就近抓取（依拼塊類型限定 num/op）
    let slot = el?.closest(".slot");
    if (!slot && !combo) {
      slot = findNearestSlot(x, y, type === "op" ? { opOnly: true } : { numOnly: true });
    }
    return { slot, combo };
  }

  function onMove(ev) {
    ev.preventDefault();
    clone.style.left = (ev.clientX - offX) + "px";
    clone.style.top = (ev.clientY - offY) + "px";
    clearHover();
    const { slot, combo } = findTarget(ev.clientX, ev.clientY);
    if (type === "digit" && combo) combo.classList.add("hover");
    else if (slot && !slot.children.length) {
      const slotKind = slot.classList.contains("op") ? "op" : "num";
      if (slotKind === (type === "op" ? "op" : "num")) slot.classList.add("hover");
    }
  }

  function onUp(ev) {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onUp);
    clearHover();
    const { slot, combo } = findTarget(ev.clientX, ev.clientY);

    // 數字 -> 組合方塊
    if (type === "digit" && combo && !combo.classList.contains("placed")) {
      addDigitToCombo(combo, value);
      clone.remove();
      return;
    }

    // 拖到格子（不檢驗對錯，送出時再判定）
    if (slot && !slot.children.length) {
      const slotKind = slot.classList.contains("op") ? "op" : "num";
      const pieceKind = type === "op" ? "op" : "num";
      if (slotKind === pieceKind) {
        clone.classList.remove("clone");
        clone.classList.add("placed");
        clone.style.position = "";
        clone.style.left = clone.style.top = "";
        clone.style.width = clone.style.height = "";
        clone.dataset.value = value;
        slot.appendChild(clone);
        slot.classList.add("filled");
        checkComplete();
        return;
      }
      // 種類不符（數字 vs 運算符）才提示，不算錯
      clone.remove();
      showFeedback(slotKind === "op" ? "這格要放運算符號喔" : "這格要放數字喔", "hint");
      return;
    }

    clone.remove();
  }

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
  document.addEventListener("pointercancel", onUp);
}

/* ========== 組合方塊 ========== */
function addDigitToCombo(combo, digit) {
  if (combo.classList.contains("placed")) return;
  const cur = combo.dataset.digits;
  if (cur.length >= 3) { showFeedback("組合方塊最多放 3 個數字", "hint"); return; }
  if (cur.length === 0 && digit === "0") { showFeedback("第一個數字不能是 0 喔", "hint"); return; }
  combo.dataset.digits = cur + digit;
  combo.textContent = combo.dataset.digits;
  combo.classList.remove("empty");
  combo.classList.add("ready");
}

function clearCombo(combo) {
  if (combo.classList.contains("placed")) return;
  combo.dataset.digits = "";
  combo.textContent = "";
  combo.classList.remove("ready");
  combo.classList.add("empty");
}

function attachComboHandlers(combo) {
  combo.addEventListener("pointerdown", (e) => {
    if (eraserOn) { notifyEraserBlocking(); return; }
    if (!combo.classList.contains("ready")) return;
    if (combo.classList.contains("placed")) return;
    startComboDrag(e, combo);
  });
}

function startComboDrag(e, combo) {
  e.preventDefault();
  const value = combo.dataset.digits;
  const rect = combo.getBoundingClientRect();
  const offX = e.clientX - rect.left;
  const offY = e.clientY - rect.top;

  combo.style.width = rect.width + "px";
  combo.style.height = rect.height + "px";
  combo.style.position = "fixed";
  combo.style.left = (e.clientX - offX) + "px";
  combo.style.top = (e.clientY - offY) + "px";
  combo.style.zIndex = "1000";
  combo.classList.add("dragging");
  document.body.appendChild(combo);

  function clearHover() {
    document.querySelectorAll(".slot.hover").forEach(s => s.classList.remove("hover"));
  }
  function findSlot(x, y) {
    // 組合方塊只能放數字格，並啟用就近偵測
    return findNearestSlot(x, y, { numOnly: true, maxDist: 80 });
  }
  function resetStyle() {
    combo.style.position = "";
    combo.style.left = combo.style.top = "";
    combo.style.width = combo.style.height = "";
    combo.style.zIndex = "";
    combo.classList.remove("dragging");
  }

  function onMove(ev) {
    ev.preventDefault();
    combo.style.left = (ev.clientX - offX) + "px";
    combo.style.top = (ev.clientY - offY) + "px";
    clearHover();
    const slot = findSlot(ev.clientX, ev.clientY);
    if (slot && !slot.children.length && !slot.classList.contains("op"))
      slot.classList.add("hover");
  }

  function onUp(ev) {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onUp);
    clearHover();
    const slot = findSlot(ev.clientX, ev.clientY);

    if (slot && !slot.children.length && !slot.classList.contains("op")) {
      resetStyle();
      combo.dataset.value = value;
      combo.classList.add("placed");
      slot.appendChild(combo);
      slot.classList.add("filled");
      spawnNewComboBlock();
      checkComplete();
    } else {
      resetStyle();
      const area = $("comboArea");
      area.insertBefore(combo, $("comboClear"));
      if (slot && slot.classList.contains("op")) {
        showFeedback("這格要放運算符號喔", "hint");
      } else if (!slot) {
        showFeedback("把組合方塊拖到算式裡的數字格子上 🎯", "hint");
      }
    }
  }

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
  document.addEventListener("pointercancel", onUp);
}

function spawnNewComboBlock() {
  const area = $("comboArea");
  const combo = document.createElement("div");
  combo.className = "combo-block empty";
  combo.id = "comboBlock";
  combo.dataset.digits = "";
  area.insertBefore(combo, $("comboClear"));
  attachComboHandlers(combo);
}

/* ========== 完成檢查 / 送出 ========== */
function checkComplete() {
  const slots = document.querySelectorAll("#equation .slot");
  if (eraserOn) slots.forEach(s => s.classList.toggle("erasable", s.children.length > 0));
  const allFilled = [...slots].every(s => s.children.length > 0);
  if (allFilled) {
    const input = $("answer");
    input.disabled = false;
    input.focus();
    showFeedback("👍 算式拼好了！算算看答案是多少", "hint");
  }
}

function getSlotValue(slot) {
  const child = slot.firstElementChild;
  if (!child) return null;
  return child.dataset.value ?? child.textContent;
}

function validateEquation() {
  const slots = document.querySelectorAll("#equation .slot");
  const wrong = [];
  slots.forEach((s) => {
    if (getSlotValue(s) !== s.dataset.expected) wrong.push(s);
  });
  return wrong;
}

function submitAnswer() {
  const input = $("answer");
  if (input.disabled) { showFeedback("先把算式拼完整再算答案唷！", "hint"); return; }
  const val = parseInt(input.value, 10);
  if (Number.isNaN(val)) { showFeedback("請輸入答案數字", "hint"); return; }
  const wrongSlots = validateEquation();
  if (wrongSlots.length) {
    state.wrong++; state.streak = 0;
    state.score = Math.max(0, state.score - 2);
    wrongSlots.forEach((s) => {
      s.classList.add("shake");
      setTimeout(() => s.classList.remove("shake"), 500);
    });
    showFeedback("❌ 算式有地方放錯囉！用橡皮擦清掉再試試 🧽", "wrong");
    updateStats();
    return;
  }
  if (val === state.ans) {
    state.correct++; state.streak++;
    const bonus = state.streak >= 3 ? 5 : 0;
    state.score += 10 + bonus;
    showVictory(10 + bonus);
  } else {
    state.wrong++; state.streak = 0;
    state.score = Math.max(0, state.score - 2);
    showFeedback("不太對喔，再想想！", "wrong");
  }
  updateStats();
}

function newQuestion() {
  Object.assign(state, makeProblem());
  $("questionText").textContent = state.text;
  buildEquation();
  resetWorkspace();
  if (eraserOn) setEraser(false);
  showFeedback("", "");
}

function resetWorkspace() {
  const area = $("comboArea");
  area.innerHTML = `
    <span class="combo-label">組合方塊：</span>
    <div class="combo-block empty" id="comboBlock" data-digits=""></div>
    <button class="combo-clear" id="comboClear" title="清除">✕</button>
  `;
  attachComboHandlers($("comboBlock"));
  $("comboClear").addEventListener("click", () => clearCombo($("comboBlock")));
}

function showFeedback(text, cls) {
  const f = $("feedback");
  f.textContent = text;
  f.className = "feedback " + cls;
}
function updateStats() {
  $("correctCount").textContent = state.correct;
  $("wrongCount").textContent = state.wrong;
  $("score").textContent = state.score;
  $("streak").textContent = state.streak;
}

/* ========== 答對動畫 ========== */
const PRAISES = ["很棒，你超厲害！", "太強了，繼續加油！", "答對了，你是數學小天才！", "厲害！再來一題！", "完美！你做得很好！"];
function showVictory(points) {
  $("victorySub").textContent = `+${points} 分 · ${PRAISES[Math.floor(Math.random()*PRAISES.length)]}`;
  document.body.classList.add("celebrating");
  $("victory").classList.add("show");
  updateStats();
}
function hideVictory() {
  document.body.classList.remove("celebrating");
  $("victory").classList.remove("show");
}

/* ========== 橡皮擦 ========== */
let eraserOn = false;
function notifyEraserBlocking() {
  const btn = $("eraserBtn");
  btn.classList.remove("shake");
  void btn.offsetWidth;
  btn.classList.add("shake");
  setTimeout(() => btn.classList.remove("shake"), 400);
  showFeedback("要先關掉橡皮擦才能拖動方塊喔 🧽", "hint");
}
function setEraser(on) {
  eraserOn = on;
  $("eraserBtn").classList.toggle("active", on);
  document.querySelectorAll("#equation .slot").forEach((s) => {
    s.classList.toggle("erasable", on && s.children.length > 0);
  });
  if (on) showFeedback("🧽 橡皮擦開啟中：點算式裡的格子可以清掉", "hint");
  else showFeedback("", "");
}
function eraseSlot(slot) {
  if (!slot.children.length) return;
  const child = slot.firstElementChild;
  if (child.classList.contains("combo-block")) {
    // 組合方塊：移除整個（已經有新的等著用）
    child.remove();
  } else {
    child.remove();
  }
  slot.classList.remove("filled", "erasable");
  // 算式不完整 → 鎖住答案輸入
  const input = $("answer");
  if (input) { input.disabled = true; input.value = ""; }
}
document.addEventListener("click", (e) => {
  if (!eraserOn) return;
  const slot = e.target.closest("#equation .slot");
  if (slot) eraseSlot(slot);
});

/* ========== 事件 ========== */
$("eraserBtn").addEventListener("click", () => setEraser(!eraserOn));
$("victoryNext").addEventListener("click", () => { hideVictory(); newQuestion(); });
$("submitBtn").addEventListener("click", submitAnswer);
$("nextBtn").addEventListener("click", newQuestion);
$("resetBtn").addEventListener("click", () => {
  buildEquation();
  resetWorkspace();
  showFeedback("", "");
});

/* ========== 啟動 ========== */
buildDigitTray();
buildOpTray();
attachComboHandlers($("comboBlock"));
$("comboClear").addEventListener("click", () => clearCombo($("comboBlock")));
newQuestion();
