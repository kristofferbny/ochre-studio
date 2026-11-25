// Ochre Studio — motion (GSAP 3.15)
//
// HOW TO TUNE
// Everything that decides how Ochre *feels* is in THE DIAL just below.
// Change a number, save, reload the page.
// Or add ?tune to the address (e.g. http://localhost:5175/?tune) for the
// tuning panel: sliders and curve editors for everything below, applied live.
// When it feels right, press "Copy settings" in the panel and paste over
// THE DIAL here. (?tune=off, or "Exit" in the panel, turns it off again.)
//
// Words used here
//   duration  seconds an animation takes
//   ease      the speed curve over that time (like After Effects' graph editor)
//   stagger   the delay between items in a group: line 1, then line 2 …
//   scrub     an animation tied to the scrollbar instead of to time
//   mask      an invisible edge that text or images are revealed from behind
//
// If the visitor has asked their system for reduced motion, none of this runs:
// the site stays exactly as the static design.

(() => {
  if (!window.gsap) return;

  gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText, CustomEase, Flip, MorphSVGPlugin);

  /* =====================================================================
     THE DIAL
     ===================================================================== */

  const DIAL = {
    // Ochre's own curves, written like CSS cubic-bezier(x1, y1, x2, y2).
    curves: {
      arrive: '0.22, 1, 0.36, 1',   // arrivals: moves off at once, then a long, soft landing
      travel: '0.7, 0, 0.12, 1',    // things that travel: a heavy start, then a slow glide in
      leave:  '0.5, 0, 0.75, 0',    // leaving a page: gathers pace and goes
    },
    smoothScroll: 1.1,                           // seconds the page takes to catch up with a mouse wheel or trackpad (0 = normal scrolling). Phones always scroll natively.
    lines:    { duration: 1.2, stagger: 0.1 },   // headings rising line by line out of a mask
    chars:    { duration: 1.4, stagger: 0.04 },  // the big "Ochre Studio" letters (hero and footer)
    fade:     { duration: 1.1, y: 24 },          // body copy, labels, buttons: fade in while rising 24px
    image:    { duration: 1.6, zoom: 1.3 },      // frames open upwards while the photo settles from 1.3× zoom
    rule:     { duration: 1.6 },                 // divider lines drawing across
    parallax: { shift: 8 },                      // photos drift ±8% inside their frames as you scroll (they zoom just enough to hide the edges)
    revealAt: 88,                                // a scroll reveal starts when the element's top reaches 88% down the screen
    menu:     { duration: 0.9, closeSpeed: 1.4 },// mobile menu panel; closing plays the opening backwards, 1.4× faster
    leave:    { duration: 0.5 },                 // the page fading out before the next one loads
    flip:     { duration: 1.2 },                 // a project card growing into that project's hero
    lag: 0.15,                                   // "Objects / Shaped Slowly / In Clay" trail behind the scroll, each line 0.15s more (smooth scroll only)
  };

  /* ===================================================================== */

  const html = document.documentElement;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const here = document.currentScript ? document.currentScript.src : location.href;
  const cleanups = []; // things to undo when the motion is rebuilt

  // Tuning mode (boot.js turns it on with ?tune). Values changed in the panel
  // are kept in this browser and override THE DIAL until you reset or exit.
  const CODE_DIAL = JSON.parse(JSON.stringify(DIAL));
  let tuning = false;
  try {
    tuning = sessionStorage.getItem('ochre:tune') === '1';
    if (tuning) merge(DIAL, JSON.parse(localStorage.getItem('ochre:dial') || '{}'));
  } catch (e) { /* storage blocked: code values */ }

  function merge(target, src) {
    Object.keys(target).forEach((k) => {
      if (!(k in src)) return;
      if (typeof target[k] === 'object') merge(target[k], src[k] || {});
      else if (typeof src[k] === typeof target[k]) target[k] = src[k];
    });
  }

  const revealStart = () => `top ${DIAL.revealAt}%`;
  const parallaxZoom = () => 1 + DIAL.parallax.shift / 50; // just enough zoom to hide the edges

  function applyCurves() {
    CustomEase.create('ochre', DIAL.curves.arrive);
    CustomEase.create('ochre-travel', DIAL.curves.travel);
    CustomEase.create('ochre-leave', DIAL.curves.leave);
  }

  // How far down a line (or letter) must sit to be fully hidden under its mask.
  // Masks reach 0.3em past their line so descenders aren't cut (see .split-line-mask).
  const below = (i, el) => el.offsetHeight + parseFloat(getComputedStyle(el).fontSize) * 0.45;
  const headerH = () => $('.site-header').getBoundingClientRect().height;
  const pagePath = (path) => path.replace(/index\.html$/, '');

  // Wait for Satoshi / General Sans, so text is split into lines in the real font
  const fontsReady = Promise.race([
    document.fonts ? document.fonts.ready : null,
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]);

  /* ---------- Building blocks ---------- */

  // Text rises line by line from behind a mask. Re-splits itself if the
  // window is resized (autoSplit), so line breaks always match the layout.
  function riseLines(el, { trigger = el } = {}) {
    return SplitText.create(el, {
      type: 'lines', mask: 'lines', linesClass: 'split-line', aria: 'none', autoSplit: true,
      onSplit: (self) => gsap.from(self.lines, {
        y: below,
        duration: DIAL.lines.duration,
        stagger: DIAL.lines.stagger,
        ease: 'ochre',
        scrollTrigger: { trigger, start: revealStart() },
      }),
    });
  }

  // A group of items fades up one after another when their container arrives
  function fadeUp(containerSel, itemSel, { stagger = 0.1 } = {}) {
    $$(containerSel).forEach((container) => {
      const items = $$(itemSel, container);
      if (!items.length) return;
      gsap.from(items, {
        autoAlpha: 0,
        y: DIAL.fade.y,
        duration: DIAL.fade.duration,
        stagger,
        ease: 'ochre',
        scrollTrigger: { trigger: container, start: revealStart() },
      });
    });
  }

  // Big words split into letters, each pinned to exactly where it sits in the
  // plain text (browsers lay split letters out slightly differently: kerning,
  // and in some browsers the height of the line). The word's box is frozen
  // while split, so nothing around it moves. restore() puts the plain text back.
  function splitLetters(els) {
    const glyphs = (el) => {
      const out = [];
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      let node;
      while ((node = walk.nextNode())) {
        for (let i = 0; i < node.length; i++) {
          if (/\s/.test(node.data[i])) continue;
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          out.push(range.getBoundingClientRect());
        }
      }
      return out;
    };
    const before = els.map(glyphs);
    els.forEach((el) => {
      const fs = parseFloat(getComputedStyle(el).fontSize);
      const box = el.getBoundingClientRect();
      el.style.width = `${box.width / fs}em`; // in em, so it still scales if the window is resized
      el.style.height = `${box.height / fs}em`;
    });
    const split = SplitText.create(els, { type: 'chars', mask: 'chars', charsClass: 'split-char', aria: 'none' });
    els.forEach((el, i) => {
      const fs = parseFloat(getComputedStyle(el).fontSize);
      const after = glyphs(el);
      split.masks.filter((m) => el.contains(m)).forEach((mask, j) => {
        const a = before[i][j];
        const b = after[j];
        if (a && b) mask.style.translate = `${(a.left - b.left) / fs}em ${(a.top - b.top) / fs}em`;
      });
    });
    let done = false;
    const restore = () => {
      if (done) return;
      done = true;
      split.revert();
      els.forEach((el) => { el.style.width = ''; el.style.height = ''; });
    };
    cleanups.push(restore);
    return { chars: split.chars, restore };
  }

  // An image frame opens from the bottom edge while the photo settles from a zoom
  function openFrame(frame, { zoom = true, delay = 0, scrollTrigger } = {}) {
    const img = $('img', frame);
    const r = getComputedStyle(frame).borderTopLeftRadius; // keeps rounded corners while clipping
    const tl = gsap.timeline({ delay, scrollTrigger });
    tl.fromTo(frame,
      { clipPath: `inset(100% 0% 0% 0% round ${r})` },
      { clipPath: `inset(0% 0% 0% 0% round ${r})`, duration: DIAL.image.duration, ease: 'ochre-travel', clearProps: 'clipPath' });
    if (zoom && img) {
      tl.from(img, { scale: DIAL.image.zoom, duration: DIAL.image.duration * 1.15, ease: 'ochre' }, 0);
    }
    return tl;
  }

  // A photo drifts inside its frame while the frame scrolls past (parallax)
  function drift(img, frame, { start = 'top bottom' } = {}) {
    if (!img || !frame) return;
    // y: 0 drops the pixel offset GSAP reads from the CSS hand-off (.arrive-hero); yPercent takes over
    gsap.set(img, { y: 0, scale: parallaxZoom() });
    gsap.fromTo(img,
      { yPercent: -DIAL.parallax.shift },
      { yPercent: DIAL.parallax.shift, ease: 'none',
        scrollTrigger: { trigger: frame, start, end: 'bottom top', scrub: true } });
  }

  /* ---------- Page intros (play once, on load) ---------- */

  function introHome() {
    const frame = $('.hero__image');
    const words = $$('.hero__logo > span');
    if (!frame) return null;
    gsap.set([frame, ...words], { visibility: 'visible' });

    const tl = gsap.timeline({ id: 'intro', defaults: { ease: 'ochre' } });
    tl.add(openFrame(frame), 0);

    // "Ochre Studio" (desktop): letter by letter, each rising out of its own mask
    const letters = splitLetters(words);
    tl.from(letters.chars, { y: below, duration: DIAL.chars.duration, stagger: DIAL.chars.stagger }, 0.25);
    // Once landed, put the plain words back (kept split while tuning, so the intro can be replayed)
    if (!tuning) tl.eventCallback('onComplete', letters.restore);
    return tl;
  }

  function introProject() {
    const hero = $('.page--project .p-hero');
    if (!hero) return null;
    // Came from a homepage card: the hero is already on screen, nothing to introduce
    if (html.classList.contains('arrive-hero')) return null;

    const img = $('.p-hero__bg', hero);
    const title = $('.p-hero__title', hero);
    gsap.set([img, title], { visibility: 'visible' });

    const tl = gsap.timeline({ id: 'intro', defaults: { ease: 'ochre' } });
    tl.fromTo(hero,
      { clipPath: 'inset(100% 0% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: DIAL.image.duration, ease: 'ochre-travel', clearProps: 'clipPath' }, 0);
    tl.from(img, { scale: DIAL.image.zoom, duration: DIAL.image.duration * 1.15 }, 0);

    const split = SplitText.create(title, { type: 'lines', mask: 'lines', linesClass: 'split-line', aria: 'none' });
    tl.from(split.lines, { y: below, duration: DIAL.lines.duration }, 0.55);
    return tl;
  }

  function introNotFound() {
    const items = $$('.notfound > *');
    if (!items.length) return null;
    gsap.set(items, { visibility: 'visible' });
    return gsap.timeline({ id: 'intro' }).from(items, {
      autoAlpha: 0, y: DIAL.fade.y, duration: DIAL.fade.duration, stagger: 0.12, ease: 'ochre',
    });
  }

  /* ---------- Scroll reveals (every page) ---------- */

  function scrollMotion(smoother) {
    // Photos drifting inside their frames. Set up first: the intros zoom
    // in towards the drift's resting scale.
    drift($('.hero__image img'), $('.hero__image'));
    $$('.project').forEach((card) => drift($('.project__bg', card), card));
    drift($('.page--project .p-hero__bg'), $('.page--project .p-hero'), { start: 'top top' });
    drift($('.contact__image img'), $('.contact__image'));

    // Headings: line by line out of a mask
    $$('.about__title, .about__lede, .project__title, .objects__line, .contact__heading, ' +
       '.p-intro__title, .p-details__title, .p-pager__name, .footer__tagline').forEach((el) => riseLines(el));
    $$('.process__item').forEach((item) => riseLines($('.process__name', item), { trigger: item }));

    // Footer lockup: "Ochre" and "Studio" letter by letter
    $$('.footer__bottom').forEach((bottom) => {
      const letters = splitLetters($$('.footer__word', bottom));
      gsap.from(letters.chars, {
        y: below, duration: DIAL.chars.duration, stagger: DIAL.chars.stagger, ease: 'ochre',
        scrollTrigger: { trigger: bottom, start: 'top 95%' },
        onComplete: letters.restore, // the plain words back once the letters have landed
      });
    });

    // Copy, labels and buttons: fade up, one after another
    fadeUp('.process__row', '.process__num, .process__desc');
    fadeUp('.project', '.project__num, .project__meta > p, .btn', { stagger: 0.08 });
    fadeUp('.objects__intro', '.objects__copy', { stagger: 0.2 });
    fadeUp('.contact__intro-copy, .contact__details-copy', '.contact__body');
    fadeUp('.contact__info', '.info', { stagger: 0.08 });
    fadeUp('.p-intro', '.p-intro__copy > p, .p-intro__note');
    fadeUp('.p-details__list', '.p-field__row', { stagger: 0.06 });
    fadeUp('.p-pager__links', '.p-pager__label');
    fadeUp('.footer__top', '.footer__group', { stagger: 0.12 });

    // Divider lines draw across from the left
    $$('.process__rule, .p-field__rule').forEach((rule) => {
      gsap.from(rule, {
        scaleX: 0, transformOrigin: 'left center', duration: DIAL.rule.duration, ease: 'ochre-travel',
        scrollTrigger: { trigger: rule, start: revealStart() },
      });
    });

    // Image frames open as they arrive. Gallery pairs open slightly after each other.
    $$('.p-intro__image, .contact__intro-image, .contact__image, .footer__image').forEach((frame) => {
      openFrame(frame, {
        zoom: !frame.matches('.contact__intro-image'), // that photo is mirrored on phones; leave its transform alone
        scrollTrigger: { trigger: frame, start: revealStart() },
      });
    });
    $$('.p-gallery__item').forEach((frame, i) => {
      openFrame(frame, { delay: (i % 2) * 0.15, scrollTrigger: { trigger: frame, start: revealStart() } });
    });

    // Ceramics: whichever pieces arrive together open one after another
    const products = $$('.product');
    if (products.length) {
      products.forEach((p) => {
        gsap.set($('.product__image', p), { clipPath: 'inset(100% 0% 0% 0%)' });
        gsap.set($('.product__name', p), { autoAlpha: 0 });
      });
      ScrollTrigger.batch(products, {
        start: revealStart(),
        once: true,
        onEnter: (batch) => batch.forEach((p, i) => {
          openFrame($('.product__image', p), { delay: i * 0.12 })
            .fromTo($('.product__name', p), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: DIAL.fade.duration, ease: 'ochre' }, 0.6);
        }),
      });
    }

    // Smooth scroll only: the Objects heading lines trail behind, each a little more
    if (smoother) {
      smoother.effects('.objects__line', { lag: (i) => DIAL.lag * (i + 1) });
    }
  }

  /* ---------- Mobile menu: burger morphs into a cross (MorphSVG) ---------- */

  function menuMotion() {
    const toggle = $('.nav-mobile__toggle');
    const menu = $('#mobile-menu');
    if (!toggle || !menu) return null;
    let tl = null;

    // Built on first open, when the menu is visible and can be measured
    const build = () => {
      const [l1, l2, l3] = $$('.burger__line', toggle);
      const panel = $('.menu__panel', menu);
      const links = SplitText.create($$('.menu__links a', menu), { type: 'lines', mask: 'lines', linesClass: 'split-line', aria: 'none' });

      tl = gsap.timeline({ paused: true, id: 'menu', defaults: { ease: 'ochre' } })
        // The three lines become a cross centred where the menu's own close button sits
        .to(l1, { morphSVG: 'M8.93 2.93L23.07 17.07', duration: 0.6 }, 0)
        .to(l3, { morphSVG: 'M8.93 17.07L23.07 2.93', duration: 0.6 }, 0)
        .to(l2, { morphSVG: 'M16 9.5H16', duration: 0.35 }, 0)
        // The white panel rises from the bottom and arrives over the cross
        .fromTo(panel, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: DIAL.menu.duration, ease: 'ochre-travel' }, 0.1)
        .add(openFrame($('.menu__image', menu)), 0.35)
        .from(links.lines, { y: below, duration: DIAL.lines.duration, stagger: 0.08 }, 0.45);
    };

    return {
      open() {
        if (!tl) build();
        tl.timeScale(1).play();
      },
      close(done) {
        if (!tl) return done();
        tl.eventCallback('onReverseComplete', done);
        tl.timeScale(DIAL.menu.closeSpeed).reverse();
      },
      reset() { if (tl) tl.pause(0); },
    };
  }

  /* ---------- Leaving a page ---------- */

  const leaving = { active: false, layer: null, cardBits: null };

  // Any other page: the content fades out, then the next page loads
  function leavePage(href, smoother) {
    if (smoother) smoother.paused(true);
    gsap.to('#smooth-content', {
      autoAlpha: 0, duration: DIAL.leave.duration, ease: 'ochre-leave',
      onComplete: () => { location.href = href; },
    });
  }

  // A project card's "Visit Project" (Flip): the card's photo grows into the
  // project page's hero, the project name rises, then that page loads with its
  // hero in exactly the same place.
  async function cardToHero(card, href, smoother) {
    if (smoother) smoother.paused(true);
    const cardImg = $('.project__bg', card);
    const heroSrc = new URL(card.dataset.heroSrc, location.href).href;

    // 1. Where the card is now
    card.dataset.flipId = 'ochre-hero';
    const state = Flip.getState(card);

    // 2. The card's text steps back while the hero photo loads
    leaving.cardBits = $$('.project__num, .project__content', card);
    const preload = new Image();
    preload.src = heroSrc;
    await Promise.all([
      gsap.to(leaving.cardBits, { autoAlpha: 0, duration: 0.4, ease: 'power2.out' }),
      Promise.race([preload.decode().catch(() => {}), new Promise((r) => setTimeout(r, 1200))]),
    ]);

    // 3. A copy of the project hero, built from the same CSS as the real one
    const layer = document.createElement('div');
    layer.className = 'page transition-layer';
    layer.innerHTML =
      `<section class="p-hero${card.hasAttribute('data-hero-plain') ? ' p-hero--plain' : ''}" data-flip-id="ochre-hero">` +
      '<img class="p-hero__bg" alt=""><img class="p-hero__bg transition-layer__from" alt="">' +
      '<p class="p-hero__title t-trim"></p></section>';
    const section = $('.p-hero', layer);
    const [heroImg, fromImg] = $$('img', section);
    const title = $('.p-hero__title', section);
    heroImg.src = heroSrc;
    fromImg.src = cardImg.currentSrc || cardImg.src;
    title.textContent = $('.project__title', card).textContent;
    document.body.append(layer);
    leaving.layer = layer;

    const split = SplitText.create(title, { type: 'lines', mask: 'lines', linesClass: 'split-line', aria: 'none' });
    gsap.set(split.lines, { y: below });

    // Start the photos exactly as the card shows them (it is mid-parallax)
    const from = { scale: gsap.getProperty(cardImg, 'scale'), yPercent: gsap.getProperty(cardImg, 'yPercent') };
    const to = { scale: parallaxZoom(), yPercent: -DIAL.parallax.shift, duration: DIAL.flip.duration, ease: 'ochre-travel' };

    // 4. Flip: from the card's box to the hero's box
    const tl = Flip.from(state, {
      targets: section, scale: false, absolute: true,
      duration: DIAL.flip.duration, ease: 'ochre-travel',
    });
    tl.fromTo([heroImg, fromImg], from, to, 0);
    tl.fromTo(section, { '--shade': 0 }, { '--shade': 1, duration: DIAL.flip.duration, ease: 'none' }, 0);
    if (fromImg.src === heroImg.src) fromImg.remove();
    else tl.to(fromImg, { autoAlpha: 0, duration: DIAL.flip.duration * 0.6, ease: 'none' }, DIAL.flip.duration * 0.2);
    tl.to(split.lines, { y: 0, duration: DIAL.lines.duration, ease: 'ochre' }, DIAL.flip.duration - 0.4);

    // 5. Hand over to the project page (boot.js reads this and skips its intro)
    tl.eventCallback('onComplete', () => {
      try { sessionStorage.setItem('ochre:arrive', 'hero'); } catch (e) { /* intro will play instead */ }
      location.href = href;
    });
  }

  // One click listener for every link on the page
  function linkHandling(smoother) {
    const onClick = (e) => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      if (leaving.active) { e.preventDefault(); return; }
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return;

      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;

      // Same page, e.g. "Contact" → #get-in-touch
      if (pagePath(url.pathname) === pagePath(location.pathname)) {
        if (!url.hash || !smoother) return; // without smooth scroll the browser jumps by itself
        const id = decodeURIComponent(url.hash.slice(1));
        const target = id === 'top' ? null : document.getElementById(id);
        if (id !== 'top' && !target) return;
        e.preventDefault();
        if (target) {
          const offset = headerH() + (parseFloat(getComputedStyle(target).scrollMarginTop) || 0);
          smoother.scrollTo(target, true, `top ${offset}px`);
        } else {
          smoother.scrollTo(0, true);
        }
        history.pushState(null, '', url.hash);
        if (a.classList.contains('skip-link')) $('#top').focus({ preventScroll: true });
        return;
      }

      // Another page
      e.preventDefault();
      leaving.active = true;
      const card = a.matches('.project .btn') ? a.closest('.project') : null;
      if (card && card.dataset.heroSrc) cardToHero(card, url.href, smoother);
      else leavePage(url.href, smoother);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }

  // Coming back with the Back button can restore the page exactly as we left it
  // (faded out, or with the transition layer on top). Put it back.
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    leaving.active = false;
    if (leaving.layer) { leaving.layer.remove(); leaving.layer = null; }
    if (leaving.cardBits) { gsap.set(leaving.cardBits, { autoAlpha: 1 }); leaving.cardBits = null; }
    gsap.set('#smooth-content', { autoAlpha: 1 });
    const smoother = ScrollSmoother.get();
    if (smoother) smoother.paused(false);
  });

  /* ---------- Tuning panel (only in tuning mode) ----------
     The panel lives in assets/js/tuner.js and assets/css/tuner.css and is
     only loaded with ?tune. It talks to this file through window.ochreTune. */

  let currentIntro = null;

  function loadTuner() {
    window.ochreTune = {
      DIAL,
      CODE_DIAL,
      intro: () => currentIntro,
      menu: () => window.ochreMotion && window.ochreMotion.menu,
      rebuild,
      save() { try { localStorage.setItem('ochre:dial', JSON.stringify(DIAL)); } catch (e) { /* not saved */ } },
      forget() { try { localStorage.removeItem('ochre:dial'); } catch (e) { /* nothing saved */ } },
    };
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = new URL('assets/css/tuner.css', here).href;
    document.head.append(css);
    const js = document.createElement('script');
    js.src = new URL('assets/js/tuner.js', here).href;
    document.body.append(js);
  }

  /* ---------- Start (and rebuild, when the tuning panel changes a value) ---------- */

  let mm = null;
  let firstRun = true;

  function start() {
    applyCurves();
    mm = gsap.matchMedia();
    mm.add({
      motion: '(prefers-reduced-motion: no-preference)',
      fine: '(hover: hover) and (pointer: fine)', // mouse or trackpad
    }, (ctx) => {
      const { motion, fine } = ctx.conditions;
      html.classList.add('motion-ready');
      if (!motion) { html.classList.remove('motion'); return; }

      // Smooth scroll (ScrollSmoother) for mouse and trackpad
      const smoother = fine && DIAL.smoothScroll > 0
        ? ScrollSmoother.create({
            wrapper: '#smooth-wrapper', content: '#smooth-content',
            smooth: DIAL.smoothScroll, effects: true, smoothTouch: false,
          })
        : null;

      scrollMotion(smoother);
      currentIntro = introHome() || introProject() || introNotFound();
      window.ochreMotion = { menu: menuMotion() };
      const offLinks = linkHandling(smoother);

      let offWrapper = () => {};
      if (smoother) {
        // Keyboard focus can scroll the wrapper itself; hand that over to the smoother
        const wrapper = $('#smooth-wrapper');
        const onScroll = () => {
          const d = wrapper.scrollTop;
          if (!d) return;
          wrapper.scrollTop = 0;
          smoother.scrollTop(smoother.scrollTop() + d);
        };
        wrapper.addEventListener('scroll', onScroll);
        offWrapper = () => wrapper.removeEventListener('scroll', onScroll);

        // Arrived with #get-in-touch etc. in the address: land under the header
        const target = firstRun && location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (target) {
          const offset = headerH() + (parseFloat(getComputedStyle(target).scrollMarginTop) || 0);
          requestAnimationFrame(() => smoother.scrollTo(target, false, `top ${offset}px`));
        }
      }
      firstRun = false;

      return () => {
        offLinks();
        offWrapper();
        cleanups.splice(0).forEach((undo) => undo());
        delete window.ochreMotion;
      };
    });
  }

  // Undo every animation and set them all up again with the current DIAL
  function rebuild() {
    if (mm) mm.revert();
    start();
  }

  fontsReady.then(() => {
    start();
    if (tuning) loadTuner();
  });
})();
