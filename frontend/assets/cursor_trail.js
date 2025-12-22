// assets/cursor_trail.js
(function() {
  const dot = document.createElement('div');
  dot.style.position = 'fixed';
  dot.style.width = '14px';
  dot.style.height = '14px';
  dot.style.borderRadius = '999px';
  dot.style.pointerEvents = 'none';
  dot.style.background = 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(106,58,255,0.85))';
  dot.style.boxShadow = '0 6px 20px rgba(106,58,255,0.25)';
  dot.style.zIndex = 99999;
  dot.style.transform = 'translate(-50%,-50%)';
  dot.style.transition = 'transform 0.08s linear, opacity 0.18s';
  document.body.appendChild(dot);

  let mouse = { x: -100, y: -100 };
  let last = { x: -100, y: -100 };

  document.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    dot.style.opacity = 1;
  });

  document.addEventListener('mouseleave', () => {
    dot.style.opacity = 0;
  });

  function frame() {
    // simple lerp
    last.x += (mouse.x - last.x) * 0.28;
    last.y += (mouse.y - last.y) * 0.28;
    dot.style.left = last.x + 'px';
    dot.style.top = last.y + 'px';
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
