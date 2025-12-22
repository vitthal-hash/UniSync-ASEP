// assets/auth_animations.js
document.addEventListener('DOMContentLoaded', () => {
  // fade-in left column copy
  const hero = document.querySelector('.hero-copy');
  if (hero) {
    hero.style.opacity = 0;
    hero.style.transform = 'translateY(14px)';
    setTimeout(() => {
      hero.style.transition = 'opacity 700ms ease, transform 700ms cubic-bezier(.2,.9,.2,1)';
      hero.style.opacity = 1;
      hero.style.transform = 'translateY(0)';
    }, 60);
  }

  // slide-in card
  const card = document.querySelector('.auth-card');
  if (card) {
    card.style.opacity = 0;
    card.style.transform = 'translateX(20px) scale(.995)';
    setTimeout(() => {
      card.style.transition = 'opacity 500ms ease, transform 500ms cubic-bezier(.2,.9,.2,1)';
      card.style.opacity = 1;
      card.style.transform = 'translateX(0) scale(1)';
    }, 140);
  }

  // small hover for input fields
  document.querySelectorAll('.auth-card input').forEach((inp) => {
    inp.addEventListener('focus', () => {
      inp.style.boxShadow = '0 10px 30px rgba(107,70,255,0.08)';
    });
    inp.addEventListener('blur', () => {
      inp.style.boxShadow = 'none';
    });
  });
});
