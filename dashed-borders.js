/* 圓頭虛線邊框
 * 用 SVG <rect stroke-dasharray stroke-linecap="round"> 取代 CSS dashed border。
 * CSS 變數可控制密度與粗細：
 *   --dash-len    每段虛線長度（px）
 *   --dash-gap    虛線間距（px）
 *   --dash-width  虛線粗細（px）
 *
 * 也可從 console 呼叫：
 *   PlayMath.setDashDensity(10, 8, 3)
 */
(function () {
  const SVG_NS = "http://www.w3.org/2000/svg";

  function ensureFrame(el) {
    let frame = el.querySelector(":scope > svg.dash-frame");
    if (frame) return frame;
    frame = document.createElementNS(SVG_NS, "svg");
    frame.classList.add("dash-frame");
    frame.setAttribute("aria-hidden", "true");
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("fill", "none");
    frame.appendChild(rect);
    el.insertBefore(frame, el.firstChild);
    return frame;
  }

  function readDashVars() {
    const cs = getComputedStyle(document.documentElement);
    const num = (name, fallback) => {
      const v = parseFloat(cs.getPropertyValue(name));
      return Number.isFinite(v) ? v : fallback;
    };
    return {
      len: num("--dash-len", 10),
      gap: num("--dash-gap", 8),
      width: num("--dash-width", 3),
    };
  }

  function updateFrame(el) {
    const opts = el.__dashOpts;
    if (!opts) return;
    const { color, radius } = opts;
    const { len, gap, width: sw } = readDashVars();

    const r = el.getBoundingClientRect();
    const w = r.width, h = r.height;
    if (w === 0 || h === 0) return;

    const frame = ensureFrame(el);
    frame.setAttribute("width", w);
    frame.setAttribute("height", h);

    const rect = frame.firstElementChild;
    rect.setAttribute("x", sw / 2);
    rect.setAttribute("y", sw / 2);
    rect.setAttribute("width", Math.max(0, w - sw));
    rect.setAttribute("height", Math.max(0, h - sw));
    rect.setAttribute("rx", radius);
    rect.setAttribute("ry", radius);
    rect.setAttribute("stroke", color);
    rect.setAttribute("stroke-width", sw);
    rect.setAttribute("stroke-dasharray", `${len} ${gap}`);
    rect.setAttribute("stroke-linecap", "round");
  }

  const resizeObs = new ResizeObserver((entries) => {
    entries.forEach((e) => updateFrame(e.target));
  });

  function attachFrame(el, opts) {
    el.__dashOpts = opts;
    updateFrame(el);
    resizeObs.observe(el);
  }

  function paletteFor(el) {
    if (el.matches(".question-box")) return { color: "#fdb8dd", radius: 16 };
    if (el.matches(".slot.op")) return { color: "#9eb16f", radius: 12 };
    if (el.matches(".slot")) return { color: "#423631", radius: 12 };
    return null;
  }

  function refreshAll() {
    document.querySelectorAll(".question-box, .slot").forEach((el) => {
      const opts = paletteFor(el);
      if (opts) attachFrame(el, opts);
    });
  }

  // 監聽 DOM 變化，新題目產生新 slot 時自動上邊框
  const mutObs = new MutationObserver((muts) => {
    let dirty = false;
    muts.forEach((m) => {
      m.addedNodes.forEach((n) => {
        if (n.nodeType !== 1) return;
        if (n.matches?.(".slot, .question-box") ||
            n.querySelector?.(".slot, .question-box")) dirty = true;
      });
    });
    if (dirty) refreshAll();
  });

  document.addEventListener("DOMContentLoaded", () => {
    mutObs.observe(document.body, { childList: true, subtree: true });
    refreshAll();
  });

  // 對外 API
  window.PlayMath = window.PlayMath || {};
  window.PlayMath.setDashDensity = function (len, gap, width) {
    const s = document.documentElement.style;
    if (Number.isFinite(len))   s.setProperty("--dash-len", len);
    if (Number.isFinite(gap))   s.setProperty("--dash-gap", gap);
    if (Number.isFinite(width)) s.setProperty("--dash-width", width);
    document.querySelectorAll(".question-box, .slot").forEach(updateFrame);
  };
  window.PlayMath.refreshDashedBorders = refreshAll;
})();
