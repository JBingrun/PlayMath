(function(){
/* 題型 B：總額 − 單價 × 數量  →  a − b × c
 * 步驟1：b × c = product
 * 步驟2：a − product = answer  （找錢 / 剩下）
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

function make() {
  const b = rand(3, 12);            // 單價 / 每包個數
  const c = rand(2, 8);             // 數量
  const product = b * c;
  const a = product + rand(2, 30);  // 總額一定大於 product
  const ans = a - product;

  const text = pickText([
    `💰 一個紅豆餅 ${b} 元，媽媽買了 ${c} 個，付 ${a} 元可以找回幾元？`,
    `🥟 一顆水餃 ${b} 元，爸爸買了 ${c} 顆，付 ${a} 元能找回多少元？`,
    `🍭 一支棒棒糖 ${b} 元，小宇買了 ${c} 支，拿 ${a} 元結帳可以找回幾元？`,
    `📦 一盒鉛筆有 ${b} 枝，老師買了 ${c} 盒後分給同學，原本倉庫有 ${a} 枝鉛筆，現在還剩幾枝？`,
    `🍪 一包餅乾有 ${b} 片，弟弟吃了 ${c} 包，整箱原本 ${a} 片，現在還剩下幾片？`,
    `🥚 一盒雞蛋有 ${b} 顆，媽媽用掉 ${c} 盒做蛋糕，冰箱裡原本 ${a} 顆雞蛋，現在還剩幾顆？`,
  ]);

  return { a, b, c, product, ans, text };
}

function buildEquation(eqEl, problem) {
  eqEl.innerHTML = "";
  const { a, b, c, product } = problem;

  const s1 = document.createElement("div");
  s1.className = "step";
  s1.innerHTML = `
    <div class="step-label">步驟1</div>
    <div class="eq-line">
      <div class="slot num" data-expected="${b}"></div>
      <div class="slot op" data-expected="×"></div>
      <div class="slot num" data-expected="${c}"></div>
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
      <div class="slot num" data-expected="${a}"></div>
      <div class="slot op" data-expected="−"></div>
      <div class="slot num" data-expected="${product}"></div>
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
  id: "changeBack",
  title: "找錢與剩下",
  emoji: "💰",
  description: "先算用掉多少，再算還剩下或可以找回幾元。",
  make,
  buildEquation,
});
})();
