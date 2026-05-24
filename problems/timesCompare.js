(function(){
/* 題型 E：倍數比較  →  a × b ± c
 * 步驟1：a × b = product   （倍數）
 * 步驟2：product ± c = answer  （多/少幾個）
 * 對應 PDF：「小如是小星的 4 倍少 4 張」
 */

const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const makePicker = () => {
  let last = -1;
  return (arr) => {
    if (arr.length <= 1) return arr[0];
    let i;
    do { i = rand(0, arr.length - 1); } while (i === last);
    last = i;
    return arr[i];
  };
};
const pickText = makePicker();
const pickNames = makePicker();

function make() {
  const a = rand(3, 9);           // 小星有幾張（維持一位數）
  const b = rand(2, 6);           // 幾倍
  const product = a * b;
  const more = Math.random() < 0.5;
  const c = rand(1, Math.min(10, more ? 15 : product - 1));
  const sign = more ? "+" : "−";
  const ans = more ? product + c : product - c;

  const namesPair = pickNames([
    ["小宇", "小晴"], ["阿良", "阿萱"], ["哥哥", "妹妹"], ["小傑", "小婷"],
  ]);
  const [A, B] = namesPair;
  const moreWord = more ? "多" : "少";

  const text = pickText([
    `🃏 ${A} 有 ${a} 張遊戲卡，${B} 的卡數是 ${A} 的 ${b} 倍${moreWord} ${c} 張，${B} 有幾張遊戲卡？`,
    `⭐ ${A} 蒐集了 ${a} 張貼紙，${B} 的貼紙是 ${A} 的 ${b} 倍${moreWord} ${c} 張，${B} 有幾張貼紙？`,
    `🎟 ${A} 有 ${a} 張遊樂園代幣，${B} 的代幣是 ${A} 的 ${b} 倍${moreWord} ${c} 張，${B} 有幾張代幣？`,
    `🪙 ${A} 存了 ${a} 個 1 元硬幣，${B} 存的是 ${A} 的 ${b} 倍${moreWord} ${c} 個，${B} 存了幾個硬幣？`,
  ]);

  return { a, b, c, sign, product, ans, text };
}

function buildEquation(eqEl, problem) {
  eqEl.innerHTML = "";
  const { a, b, c, sign, product } = problem;

  const s1 = document.createElement("div");
  s1.className = "step";
  s1.innerHTML = `
    <div class="step-label">步驟1</div>
    <div class="eq-line">
      <div class="slot num" data-expected="${a}"></div>
      <div class="slot op" data-expected="×"></div>
      <div class="slot num" data-expected="${b}"></div>
    </div>
    <hr class="eq-divider">
    <div class="eq-line">
      <div class="eq-equal">=</div>
      <div class="slot num" data-expected="${product}"></div>
    </div>
  `;
  eqEl.appendChild(s1);

  const s2 = document.createElement("div");
  s2.className = "step";
  s2.innerHTML = `
    <div class="step-label">步驟2</div>
    <div class="eq-line">
      <div class="slot num" data-expected="${product}"></div>
      <div class="slot op" data-expected="${sign}"></div>
      <div class="slot num" data-expected="${c}"></div>
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
  id: "timesCompare",
  title: "倍數多幾 / 少幾",
  emoji: "🃏",
  description: "先算幾倍，再加或減多/少的數量。",
  make,
  buildEquation,
});
})();
