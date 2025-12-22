// frontend/assets/main.js

// Theme toggle
(function () {
  const THEME_KEY = "unisync_theme"; // 'dark' or 'light'
  const root = document.documentElement;
  const stored = localStorage.getItem(THEME_KEY) || "dark";

  function applyTheme(t) {
    if (t === "light") {
      document.body.classList.add("light");
    } else {
      document.body.classList.remove("light");
    }
  }

  applyTheme(stored);

  // Attach to any element with id themeBtn
  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("themeBtn");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const current = localStorage.getItem(THEME_KEY) || "dark";
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
    });
  });
})();
