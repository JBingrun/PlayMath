(function(){
/* 題型 C：兩組相加  →  a × b + c × b （三步驟）
 * 步驟1：a × b = p1
 * 步驟2：c × b = p2
 * 步驟3：p1 + p2 = answer
 * 對應 PDF 的「香草口味 3 盒 + 草莓口味 4 盒，每盒 6 個」型素養題。
 */

const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[rand(0, arr.length - 1)];

function make() {
  const a = rand(2, 6);
  const c = rand(2, 6);
  const b = rand(3, 9);
  const p1 = a * b;
  const p2 = c * b;
  const ans = p1 + p2;

  const text = pick([
    `🧁 媽媽買了 ${a} 盒巧克力杯子蛋糕和 ${c} 盒草莓杯子蛋糕，每盒都有 ${b} 個。一共買了幾個杯子蛋糕？`,
    `🥟 哥哥買了 ${a} 包鮮肉小籠包和 ${c} 包高麗菜小籠包，每包 ${b} 顆。兩種小籠包一共有幾顆？`,
    `🍙 便利商店進貨 ${a} 盒鮪魚飯糰和 ${c} 盒梅子飯糰，每盒 ${b} 個。架上一共有幾個飯糰？`,
    `🐠 水族館左邊有 ${a} 缸金魚，右邊有 ${c} 缸熱帶魚，每缸都有 ${b} 條魚。館內一共有幾條魚？`,
    `📚 學校發給男生 ${a} 排各 ${b} 本作業簿，發給女生 ${c} 排各 ${b} 本。一共發出幾本作業簿？`,
    `🎈 校慶準備 ${a} 串紅氣球和 ${c} 串黃氣球，每串都綁 ${b} 顆。場上一共有幾顆氣球？`,
  ]);

  return { a, b, c, p1, p2, ans, text };
}

function buildEquation(eqEl, problem) {
  eqEl.innerHTML = "";
  const { a, b, c, p1, p2 } = problem;

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
      <div class="slot num" data-expected="${p1}"></div>
    </div>
  `;
  eqEl.appendChild(s1);

  const s2 = document.createElement("div");
  s2.className = "step";
  s2.innerHTML = `
    <div class="step-label">步驟2</div>
    <div class="eq-line">
      <div class="slot num" data-expected="${c}"></div>
      <div class="slot op" data-expected="×"></div>
      <div class="slot num" data-expected="${b}"></div>
    </div>
    <hr class="eq-divider">
    <div class="eq-line">
      <div class="eq-equal">=</div>
      <div class="slot num" data-expected="${p2}"></div>
    </div>
  `;
  eqEl.appendChild(s2);

  const s3 = document.createElement("div");
  s3.className = "step";
  s3.innerHTML = `
    <div class="step-label">步驟3</div>
    <div class="eq-line">
      <div class="slot num" data-expected="${p1}"></div>
      <div class="slot op" data-expected="+"></div>
      <div class="slot num" data-expected="${p2}"></div>
    </div>
    <hr class="eq-divider">
    <div class="eq-line">
      <div class="eq-equal">=</div>
      <input type="number" inputmode="numeric" class="answer-input" id="answer" placeholder="?" disabled />
    </div>
  `;
  eqEl.appendChild(s3);
}

window.PROBLEM_TYPES = window.PROBLEM_TYPES || [];
window.PROBLEM_TYPES.push({
  id: "twoGroupsAdd",
  title: "兩種口味相加",
  emoji: "🧁",
  description: "兩種口味各買幾盒，每盒幾個，算總共幾個。",
  make,
  buildEquation,
});
})();
