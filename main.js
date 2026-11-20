// Ochre Studio

// Mobile menu (static, no motion yet)
(() => {
  const toggle = document.querySelector('.nav-mobile__toggle');
  const menu = document.getElementById('mobile-menu');
  if (!toggle || !menu) return;

  const closeBtn = menu.querySelector('.menu__close');
  const desktop = window.matchMedia('(min-width: 1024px)');

  const open = () => {
    menu.hidden = false;
    document.documentElement.classList.add('is-menu-open');
    toggle.setAttribute('aria-expanded', 'true');
    closeBtn?.focus();
  };

  const close = ({ restoreFocus = true } = {}) => {
    if (menu.hidden) return;
    menu.hidden = true;
    document.documentElement.classList.remove('is-menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus) toggle.focus();
  };

  toggle.addEventListener('click', open);

  menu.addEventListener('click', (e) => {
    const target = e.target.closest('[data-menu-close]');
    if (!target) return;
    // Let anchor links navigate, just close the panel
    close({ restoreFocus: target.tagName !== 'A' });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  // Never leave the mobile menu open after resizing up to desktop
  desktop.addEventListener('change', (e) => {
    if (e.matches) close({ restoreFocus: false });
  });
})();
