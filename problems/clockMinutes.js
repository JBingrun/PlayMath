(function(){
/* 題型 F：時鐘長針  →  a × 5 + b
 * 步驟1：a × 5 = bigMin   （a 大格 = a × 5 分鐘）
 * 步驟2：bigMin + b = answer  （再加 b 小格 = b 分鐘）
 * 對應 PDF：「長針走 9 大格又 4 小格 = ? 分鐘」
 */

const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[rand(0, arr.length - 1)];

function make() {
  const a = rand(2, 9);           // 大格
  const b = rand(1, 4);           // 小格（小於 5，否則就湊成下一個大格）
  const bigMin = a * 5;
  const ans = bigMin + b;

  const text = pick([
    `🕐 長針走 1 大格是 5 分鐘，走 1 小格是 1 分鐘。長針走了 ${a} 大格又 ${b} 小格，總共經過幾分鐘？`,
    `⏰ 時鐘的長針走 1 大格代表 5 分鐘，1 小格代表 1 分鐘。如果長針走了 ${a} 大格又 ${b} 小格，總共是幾分鐘？`,
    `🧭 看著時鐘的長針，它從 12 開始走，走了 ${a} 大格又 ${b} 小格停下來。長針一共走了幾分鐘？`,
  ]);

  return { a, b, bigMin, ans, text };
}

function buildEquation(eqEl, problem) {
  eqEl.innerHTML = "";
  const { a, b, bigMin } = problem;

  const s1 = document.createElement("div");
  s1.className = "step";
  s1.innerHTML = `
    <div class="step-label">步驟1</div>
    <div class="eq-line">
      <div class="slot num" data-expected="${a}"></div>
      <div class="slot op" data-expected="×"></div>
      <div class="slot num" data-expected="5"></div>
    </div>
    <hr class="eq-divider">
    <div class="eq-line">
      <div class="eq-equal">=</div>
      <div class="slot num" data-expected="${bigMin}"></div>
    </div>
  `;
  eqEl.appendChild(s1);

  const s2 = document.createElement("div");
  s2.className = "step";
  s2.innerHTML = `
    <div class="step-label">步驟2</div>
    <div class="eq-line">
      <div class="slot num" data-expected="${bigMin}"></div>
      <div class="slot op" data-expected="+"></div>
      <div class="slot num" data-expected="${b}"></div>
    </div>
    <hr class="eq-divider">
    <div class="eq-line">
      <div class="eq-equal">=</div>
      <input type="number" inputmode="numeric" class="answer-input" id="answer" placeholder="?" disabled />
    </div>
  `;
  eqEl.appendChild(s2);
}

window.PROBLEM_TYPES = window.PROBLEM_TYPES || [];
window.PROBLEM_TYPES.push({
  id: "clockMinutes",
  title: "時鐘長針幾分鐘",
  emoji: "🕐",
  description: "大格 × 5 分鐘，再加上小格的分鐘數。",
  make,
  buildEquation,
});
})();
