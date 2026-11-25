// Ochre Studio — runs in <head>, before the page is drawn.
// Adds .motion to <html> so the intro can start from hidden (see styles.css),
// unless the visitor has asked their system for reduced motion.
(() => {
  const html = document.documentElement;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  html.classList.add('motion');

  // Arriving from a homepage card: the hero is already on screen, so don't hide it
  try {
    if (sessionStorage.getItem('ochre:arrive') === 'hero') html.classList.add('arrive-hero');
    sessionStorage.removeItem('ochre:arrive');
  } catch (e) { /* storage blocked: just play the normal intro */ }

  // Safety net: if motion.js never starts, show everything anyway
  setTimeout(() => {
    if (!html.classList.contains('motion-ready')) html.classList.remove('motion');
  }, 4000);
})();
