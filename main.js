// Ochre Studio

// Mobile menu: open/close, Escape, focus, scroll lock.
// The animation lives in motion.js (window.ochreMotion.menu). Without it
// (reduced motion, or scripts blocked) the menu simply appears and disappears.
(() => {
  const toggle = document.querySelector('.nav-mobile__toggle');
  const menu = document.getElementById('mobile-menu');
  if (!toggle || !menu) return;

  const closeBtn = menu.querySelector('.menu__close');
  const desktop = window.matchMedia('(min-width: 1024px)');
  const html = document.documentElement;
  const motion = () => window.ochreMotion && window.ochreMotion.menu;

  let isOpen = false;

  const open = () => {
    if (isOpen) return;
    isOpen = true;
    menu.hidden = false;
    html.classList.add('is-menu-open');
    toggle.setAttribute('aria-expanded', 'true');
    motion()?.open();
    closeBtn?.focus();
  };

  const close = ({ restoreFocus = true, instant = false } = {}) => {
    if (!isOpen) return;
    isOpen = false;
    toggle.setAttribute('aria-expanded', 'false');

    const finish = () => {
      if (isOpen) return; // reopened while closing
      menu.hidden = true;
      html.classList.remove('is-menu-open');
      if (restoreFocus) toggle.focus({ preventScroll: true });
    };

    if (motion() && !instant) motion().close(finish);
    else { motion()?.reset(); finish(); }
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
    if (e.matches) close({ restoreFocus: false, instant: true });
  });
})();
