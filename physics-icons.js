(function () {
  const stage = document.getElementById('physicsStage');
  const menuScreen = document.getElementById('menuScreen');
  if (!stage || !menuScreen) return;

  const ICONS = [
    { name: 'plus', src: 'icons/plus.svg' },
    { name: 'sub',  src: 'icons/sub.svg' },
    { name: 'mul',  src: 'icons/mul.svg' },
    { name: 'div',  src: 'icons/div.svg' },
  ];

  const SIZE = 360;
  const R = SIZE / 2;
  const GRAVITY = 1800;       // px/s^2
  const REST_WALL = 0.4;     // 反彈係數
  const REST_BODY = 0.2;
  const FRICTION = 0.99;      // 空氣阻力
  const FLOOR_FRICTION = 0.82;
  const MAX_V = 2400;
  const SLEEP_V = 40;

  let W = window.innerWidth;
  let H = window.innerHeight;
  function syncSize() { W = window.innerWidth; H = window.innerHeight; }
  window.addEventListener('resize', syncSize);

  const bodies = ICONS.map((info, i) => {
    const el = document.createElement('div');
    el.className = 'physics-icon';
    el.dataset.name = info.name;
    const img = document.createElement('img');
    img.src = info.src;
    img.alt = '';
    img.draggable = false;
    el.appendChild(img);
    stage.appendChild(el);

    const startX = 80 + i * 110;
    return {
      el,
      x: Math.min(startX, W - SIZE - 20),
      y: -SIZE - i * 90,
      vx: (Math.random() - 0.5) * 200,
      vy: 0,
      rot: (Math.random() - 0.5) * 30,
      vr: (Math.random() - 0.5) * 60,
      dragging: false,
      px: 0, py: 0, pt: 0,
    };
  });

  function render(b) {
    b.el.style.transform = `translate(${b.x}px, ${b.y}px) rotate(${b.rot}deg)`;
  }
  bodies.forEach(render);

  // 拖曳
  bodies.forEach((b) => {
    b.el.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      b.dragging = true;
      b.el.classList.add('dragging');
      b.el.setPointerCapture(ev.pointerId);
      b.dragDX = ev.clientX - b.x;
      b.dragDY = ev.clientY - b.y;
      b.vx = 0; b.vy = 0; b.vr = 0;
      b.px = ev.clientX; b.py = ev.clientY;
      b.pt = performance.now();
    });
    b.el.addEventListener('pointermove', (ev) => {
      if (!b.dragging) return;
      const nx = ev.clientX - b.dragDX;
      const ny = ev.clientY - b.dragDY;
      const now = performance.now();
      const dt = Math.max(1, now - b.pt) / 1000;
      b.vx = (ev.clientX - b.px) / dt;
      b.vy = (ev.clientY - b.py) / dt;
      b.x = nx; b.y = ny;
      b.px = ev.clientX; b.py = ev.clientY; b.pt = now;
      render(b);
    });
    const endDrag = (ev) => {
      if (!b.dragging) return;
      b.dragging = false;
      b.el.classList.remove('dragging');
      try { b.el.releasePointerCapture(ev.pointerId); } catch (e) {}
      // 夾住速度
      b.vx = Math.max(-MAX_V, Math.min(MAX_V, b.vx));
      b.vy = Math.max(-MAX_V, Math.min(MAX_V, b.vy));
      b.vr = (Math.random() - 0.5) * 180;
    };
    b.el.addEventListener('pointerup', endDrag);
    b.el.addEventListener('pointercancel', endDrag);
  });

  function step(dt) {
    for (const b of bodies) {
      if (b.dragging) continue;
      b.vy += GRAVITY * dt;
      b.vx *= FRICTION;
      b.vy *= FRICTION;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rot += b.vr * dt;
      b.vr *= 0.98;

      // 牆壁
      if (b.x < 0) { b.x = 0; b.vx = -b.vx * REST_WALL; b.vr += b.vy * 0.05; }
      if (b.x + SIZE > W) { b.x = W - SIZE; b.vx = -b.vx * REST_WALL; b.vr -= b.vy * 0.05; }
      // 地板
      if (b.y + SIZE > H) {
        b.y = H - SIZE;
        if (b.vy > 0) b.vy = -b.vy * REST_WALL;
        b.vx *= FLOOR_FRICTION;
        if (Math.abs(b.vy) < SLEEP_V) b.vy = 0;
        b.vr *= 0.7;
        if (Math.abs(b.vr) < 10) b.vr = 0;
      }
      // 天花板（防止飛出）
      if (b.y < -SIZE * 3) { b.y = -SIZE * 3; b.vy = 0; }
    }

    // 兩兩碰撞 (圓形近似)
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i], c = bodies[j];
        const ax = a.x + R, ay = a.y + R;
        const cx = c.x + R, cy = c.y + R;
        let dx = cx - ax, dy = cy - ay;
        let dist = Math.hypot(dx, dy);
        const minD = SIZE * 0.92;
        if (dist < minD && dist > 0.0001) {
          const nx = dx / dist, ny = dy / dist;
          const overlap = (minD - dist);
          // 位置修正
          if (!a.dragging && !c.dragging) {
            a.x -= nx * overlap / 2;
            a.y -= ny * overlap / 2;
            c.x += nx * overlap / 2;
            c.y += ny * overlap / 2;
          } else if (a.dragging && !c.dragging) {
            c.x += nx * overlap;
            c.y += ny * overlap;
          } else if (!a.dragging && c.dragging) {
            a.x -= nx * overlap;
            a.y -= ny * overlap;
          }
          // 速度反應
          const rvx = c.vx - a.vx;
          const rvy = c.vy - a.vy;
          const velAlongN = rvx * nx + rvy * ny;
          if (velAlongN < 0) {
            const jImp = -(1 + REST_BODY) * velAlongN / 2;
            if (!a.dragging) { a.vx -= jImp * nx; a.vy -= jImp * ny; }
            if (!c.dragging) { c.vx += jImp * nx; c.vy += jImp * ny; }
          }
        }
      }
    }

    for (const b of bodies) render(b);
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (document.body.classList.contains('physics-on')) step(dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // 只在選單頁顯示
  function updateVisibility() {
    const onMenu = menuScreen.classList.contains('show');
    document.body.classList.toggle('physics-on', onMenu);
  }
  updateVisibility();
  const mo = new MutationObserver(updateVisibility);
  mo.observe(menuScreen, { attributes: true, attributeFilter: ['class'] });
})();
