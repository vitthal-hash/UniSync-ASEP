// assets/particles.js
(function () {
  function initParticles(canvasId) {
    try {
      const el = document.getElementById(canvasId) || document.getElementById('particleCanvas');
      if (!el) return;

      // Create canvas
      let canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
    canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

      el.appendChild(canvas);
      const ctx = canvas.getContext('2d');

      let particles = [];
      const max = Math.floor((canvas.width * canvas.height) / 30000); // density
      for (let i = 0; i < max; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          r: 1 + Math.random() * 2,
          hue: 260 + Math.random() * 40
        });
      }

      function resize() {
        canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

      }
      window.addEventListener('resize', resize);

      function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // lines
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          for (let j = i + 1; j < particles.length; j++) {
            const q = particles[j];
            const dx = p.x - q.x;
            const dy = p.y - q.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
              ctx.beginPath();
         ctx.strokeStyle = `rgba(139,92,246,${(1 - dist / 120) * 0.25})`;  // brighter lines
ctx.lineWidth = 1.2;

              ctx.moveTo(p.x, p.y);
              ctx.lineTo(q.x, q.y);
              ctx.stroke();
            }
          }
        }

        // particles
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;

          // bounce
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

          ctx.beginPath();
          ctx.fillStyle = `hsla(${p.hue},80%,70%,1)`;   // more vibrant color
ctx.shadowBlur = 14;
ctx.shadowColor = `hsla(${p.hue},90%,70%,0.9)`;  // glow effect

          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }

        requestAnimationFrame(draw);
      }
      draw();
    } catch (e) {
      console.warn('particles init error', e);
    }
  }

  // init for pages that exist
  document.addEventListener('DOMContentLoaded', () => {
    initParticles('bgParticles');

  });
})();
