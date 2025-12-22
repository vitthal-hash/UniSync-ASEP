// assets/flow_lines.js
(function () {
  function initFlowLines() {
 const container = document.querySelector('.global-anim-bg');


    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.id = "bgFlow";   
    canvas.className = 'flow-lines-canvas';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    function resize() {
     canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

    }
    resize();
    window.addEventListener('resize', resize);

    let lines = [];
    const count = 18;

    for (let i = 0; i < count; i++) {
      lines.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        length: 180 + Math.random() * 200,
        speed : 0.5 + Math.random() * 0.8,
        angle: Math.random() * Math.PI * 2,
        hue: 250 + Math.random() * 50,
        width: 1.2 + Math.random() * 1.8
      });
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      lines.forEach((l) => {
        const x2 = l.x + Math.cos(l.angle) * l.length;
        const y2 = l.y + Math.sin(l.angle) * l.length;

        ctx.beginPath();
        ctx.strokeStyle = `hsla(${l.hue}, 80%, 70%, 0.55)`;  // more vivid & brighter
ctx.lineWidth = l.width + 1.2;                      // increase thickness
ctx.shadowBlur = 10;
ctx.shadowColor = `hsla(${l.hue}, 90%, 70%, 0.8)`;  // neon glow

        ctx.moveTo(l.x, l.y);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // movement
        l.x += Math.cos(l.angle) * l.speed;
        l.y += Math.sin(l.angle) * l.speed;

        // wrap around screen
        if (l.x > canvas.width + 200) l.x = -200;
        if (l.x < -200) l.x = canvas.width + 200;
        if (l.y > canvas.height + 200) l.y = -200;
        if (l.y < -200) l.y = canvas.height + 200;
      });

      requestAnimationFrame(draw);
    }

    draw();
  }

  document.addEventListener('DOMContentLoaded', initFlowLines);
})();
