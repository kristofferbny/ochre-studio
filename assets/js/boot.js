// Ochre Studio — runs in <head>, before the page is drawn.
// Adds .motion to <html> so the intro can start from hidden (see styles.css),
// unless the visitor has asked their system for reduced motion.
(() => {
  const html = document.documentElement;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  html.classList.add('motion');

  try {
    // Arriving from a homepage card: the hero is already on screen, so don't hide it
    if (sessionStorage.getItem('ochre:arrive') === 'hero') html.classList.add('arrive-hero');
    sessionStorage.removeItem('ochre:arrive');

    // Tuning mode: ?tune turns it on for this browser tab, ?tune=off turns it off
    const tune = new URLSearchParams(location.search).get('tune');
    if (tune !== null) sessionStorage.setItem('ochre:tune', tune === 'off' ? '' : '1');
    if (sessionStorage.getItem('ochre:tune') === '1') {
      // The project hero's resting parallax must match the tuned drift (see .arrive-hero)
      const dial = JSON.parse(localStorage.getItem('ochre:dial') || '{}');
      const shift = dial.parallax && dial.parallax.shift;
      if (typeof shift === 'number') html.style.setProperty('--ochre-shift', shift);
    }
  } catch (e) { /* storage blocked: normal intro, no tuning */ }

  // Safety net: if motion.js never starts, show everything anyway
  setTimeout(() => {
    if (!html.classList.contains('motion-ready')) html.classList.remove('motion');
  }, 4000);
})();
