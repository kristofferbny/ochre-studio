// Ochre Studio — motion tuning panel.
// Loaded only in tuning mode (?tune). Every change is saved in this browser
// and applied straight away by rebuilding the motion (see motion.js → rebuild).
// "Copy settings" puts a ready-made DIAL on the clipboard to paste into motion.js.
(() => {
  const T = window.ochreTune;
  if (!T || !window.gsap || document.querySelector('.tuner')) return;
  const { DIAL, CODE_DIAL } = T;

  /* ---------- What can be tuned ---------- */

  const CURVES = [
    { key: 'arrive', name: 'Arrivals', hint: 'Text rising, photos settling, copy fading in' },
    { key: 'travel', name: 'Travel', hint: 'Frames opening, divider lines, the menu panel, card → project' },
    { key: 'leave', name: 'Leaving', hint: 'The page fading out before the next one loads' },
  ];

  const PRESETS = [
    ['Soft landing', '0.22, 1, 0.36, 1'],
    ['Expo', '0.16, 1, 0.3, 1'],
    ['Heavy glide', '0.7, 0, 0.12, 1'],
    ['Smooth', '0.65, 0, 0.35, 1'],
    ['Gather & go', '0.5, 0, 0.75, 0'],
    ['Overshoot', '0.34, 1.56, 0.64, 1'],
    ['Linear', '0, 0, 1, 1'],
  ];

  const GROUPS = [
    { title: 'Text', rows: [
      { path: 'lines.duration', label: 'Heading reveal', unit: 's', min: 0.2, max: 3, step: 0.05, hint: 'How long a heading line takes to rise out of its mask' },
      { path: 'lines.stagger', label: 'Delay between lines', unit: 's', min: 0, max: 0.5, step: 0.01, hint: 'Line 1, then line 2 …' },
      { path: 'chars.duration', label: 'Letter reveal', unit: 's', min: 0.2, max: 3, step: 0.05, hint: '"Ochre Studio" in the hero (desktop) and the footer' },
      { path: 'chars.stagger', label: 'Delay between letters', unit: 's', min: 0, max: 0.2, step: 0.005, hint: 'O, then c, then h …' },
      { path: 'fade.duration', label: 'Copy fade', unit: 's', min: 0.2, max: 3, step: 0.05, hint: 'Body text, labels and buttons fading in' },
      { path: 'fade.y', label: 'Copy rise', unit: 'px', min: 0, max: 120, step: 1, hint: 'How far they travel up while fading in' },
    ] },
    { title: 'Images', rows: [
      { path: 'image.duration', label: 'Frame opening', unit: 's', min: 0.3, max: 3.5, step: 0.05, hint: 'A photo frame opening from its bottom edge' },
      { path: 'image.zoom', label: 'Settle from zoom', unit: '×', min: 1, max: 2, step: 0.01, hint: 'The photo starts this much bigger and settles' },
      { path: 'parallax.shift', label: 'Parallax drift', unit: '%', min: 0, max: 20, step: 0.5, hint: 'Photos drift inside their frames while scrolling' },
      { path: 'rule.duration', label: 'Divider draw', unit: 's', min: 0.2, max: 3.5, step: 0.05, hint: 'Lines drawing across in the process list and project details' },
    ] },
    { title: 'Scrolling', rows: [
      { path: 'smoothScroll', label: 'Smooth scroll', unit: 's', min: 0, max: 3, step: 0.05, hint: 'How long the page glides after the wheel or trackpad. 0 = off. Mouse and trackpad only' },
      { path: 'revealAt', label: 'Reveal starts at', unit: '% down', min: 50, max: 100, step: 1, hint: 'Where on the screen an element must reach before it animates in' },
      { path: 'lag', label: 'Objects heading lag', unit: 's', min: 0, max: 0.6, step: 0.01, hint: '"Objects / Shaped Slowly / In Clay" trail behind the scroll. Smooth scroll only' },
    ] },
    { title: 'Menu and pages', rows: [
      { path: 'menu.duration', label: 'Menu panel', unit: 's', min: 0.2, max: 2.5, step: 0.05, hint: 'The phone menu rising over the page' },
      { path: 'menu.closeSpeed', label: 'Menu closing speed', unit: '×', min: 0.5, max: 3, step: 0.05, hint: 'Closing plays the opening backwards, this much faster' },
      { path: 'leave.duration', label: 'Page fade-out', unit: 's', min: 0.1, max: 1.5, step: 0.05, hint: 'Before another page loads' },
      { path: 'flip.duration', label: 'Card → project', unit: 's', min: 0.4, max: 3, step: 0.05, hint: 'A homepage card growing into the project hero' },
    ] },
  ];

  /* ---------- Helpers ---------- */

  const get = (path, obj = DIAL) => path.split('.').reduce((o, k) => o[k], obj);
  const put = (path, value) => {
    const keys = path.split('.');
    const last = keys.pop();
    keys.reduce((o, k) => o[k], DIAL)[last] = value;
  };
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const svgEl = (tag, attrs) => {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    return e;
  };
  const button = (cls, text, onClick) => {
    const b = el('button', cls, text);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  };
  const decimals = (step) => (String(step).split('.')[1] || '').length;
  const fmt = (row, v) => `${(+v).toFixed(decimals(row.step))}${row.unit === '% down' ? '%' : row.unit === 'px' ? 'px' : row.unit}`;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
  };

  /* ---------- Applying a change ---------- */

  let applyTimer;
  const refreshers = [];
  const apply = () => {
    T.save();
    status('Applying…');
    clearTimeout(applyTimer);
    applyTimer = setTimeout(() => {
      T.rebuild();
      refreshers.forEach((r) => r());
      status('Applied. Anything on screen replays with the new values');
    }, 150);
  };

  /* ---------- Panel ---------- */

  const panel = el('aside', 'tuner');
  panel.setAttribute('aria-label', 'Motion tuning panel');
  if (store.get('ochre:tuner-side') === 'left') panel.classList.add('is-left');
  if (store.get('ochre:tuner-collapsed') === '1') panel.classList.add('is-collapsed');

  // Head
  const head = el('div', 'tuner__head');
  const title = el('p', 'tuner__title', 'Motion');
  const headBtns = el('div', 'tuner__head-btns');
  headBtns.append(
    button('tuner__icon', '⇆', () => {
      panel.classList.toggle('is-left');
      store.set('ochre:tuner-side', panel.classList.contains('is-left') ? 'left' : 'right');
    }),
    button('tuner__icon tuner__collapse', '–', () => {
      panel.classList.toggle('is-collapsed');
      store.set('ochre:tuner-collapsed', panel.classList.contains('is-collapsed') ? '1' : '0');
    }),
  );
  headBtns.firstChild.title = 'Move the panel to the other side';
  headBtns.lastChild.title = 'Fold the panel away';
  head.append(title, headBtns);

  const body = el('div', 'tuner__body');

  // Playback
  const play = section('Playback', 'Watch the page intro as often as you like, slowly, or frame by frame.');
  const replay = button('tuner__btn tuner__btn--primary', 'Replay intro', () => {
    const intro = T.intro();
    if (intro) { intro.timeScale(1).restart(); window.scrollTo(0, 0); }
  });
  const scrubRow = el('label', 'tuner__scrub');
  const scrub = el('input');
  scrub.type = 'range'; scrub.min = 0; scrub.max = 1; scrub.step = 0.001; scrub.value = 0;
  const scrubOut = el('span', 'tuner__value', '');
  scrubRow.append(el('span', 'tuner__label', 'Scrub the intro'), scrubOut, scrub);
  let scrubbing = false;
  scrub.addEventListener('pointerdown', () => { scrubbing = true; });
  scrub.addEventListener('pointerup', () => { scrubbing = false; });
  scrub.addEventListener('input', () => {
    const intro = T.intro();
    if (intro) intro.pause().progress(+scrub.value);
  });

  const speeds = el('div', 'tuner__speeds');
  speeds.append(el('span', 'tuner__label', 'Speed'));
  const speedBtns = [0.1, 0.25, 0.5, 1, 2].map((v) => {
    const b = button('tuner__chip', `${v}×`, () => {
      gsap.globalTimeline.timeScale(v);
      speedBtns.forEach((x) => x.classList.toggle('is-on', x === b));
    });
    if (v === 1) b.classList.add('is-on');
    return b;
  });
  speeds.append(...speedBtns);

  const menuBtn = button('tuner__btn', 'Open the phone menu', () => {
    const toggle = document.querySelector('.nav-mobile__toggle');
    if (toggle) toggle.click();
  });
  menuBtn.title = 'Only on phone widths (narrower than 1024px)';
  const playBtns = el('div', 'tuner__btns');
  playBtns.append(replay, menuBtn);
  play.append(playBtns, scrubRow, speeds);

  gsap.ticker.add(() => {
    const intro = T.intro();
    replay.disabled = scrub.disabled = !intro;
    menuBtn.hidden = window.innerWidth >= 1024;
    if (!intro) { scrubOut.textContent = 'no intro on this visit'; return; }
    if (!scrubbing) scrub.value = intro.progress();
    scrubOut.textContent = `${intro.time().toFixed(2)}s / ${intro.duration().toFixed(2)}s`;
  });

  // Curves
  const curves = section('Curves', 'The speed of a movement over its time. Drag the two handles, or pick a preset. The dot shows the feel.');
  CURVES.forEach((c) => curves.append(curveEditor(c)));

  // Sliders
  GROUPS.forEach((g) => {
    const s = section(g.title);
    g.rows.forEach((row) => s.append(slider(row)));
  });

  // Foot
  const foot = el('div', 'tuner__foot');
  const statusEl = el('p', 'tuner__status', 'Changes are saved in this browser only.');
  const footBtns = el('div', 'tuner__btns');
  footBtns.append(
    button('tuner__btn tuner__btn--primary', 'Copy settings', copySettings),
    button('tuner__btn', 'Reset all', () => {
      if (!window.confirm('Put every value back to what is in motion.js?')) return;
      T.forget();
      const fresh = JSON.parse(JSON.stringify(CODE_DIAL));
      Object.keys(fresh).forEach((k) => { DIAL[k] = fresh[k]; });
      apply();
    }),
    button('tuner__btn', 'Exit', () => {
      const url = new URL(location.href);
      url.searchParams.set('tune', 'off');
      location.href = url.href;
    }),
  );
  foot.append(footBtns, statusEl);

  panel.append(head, body, foot);
  document.body.append(panel);

  function status(text) { statusEl.textContent = text; }

  function section(name, intro) {
    const s = el('section', 'tuner__section');
    s.append(el('h3', 'tuner__h', name));
    if (intro) s.append(el('p', 'tuner__intro', intro));
    body.append(s);
    return s;
  }

  /* ---------- A slider row ---------- */

  function slider(row) {
    const wrap = el('div', 'tuner__row');
    const label = el('label', 'tuner__label', row.label);
    const value = el('span', 'tuner__value');
    const reset = button('tuner__reset', '↺', () => { put(row.path, get(row.path, CODE_DIAL)); sync(); apply(); });
    reset.title = `Back to the value in motion.js (${fmt(row, get(row.path, CODE_DIAL))})`;
    const input = el('input');
    input.type = 'range';
    input.min = row.min; input.max = row.max; input.step = row.step;
    const id = `tune-${row.path.replace('.', '-')}`;
    input.id = id; label.htmlFor = id;
    const hint = el('p', 'tuner__hint', row.hint);

    const sync = () => {
      const v = get(row.path);
      input.value = v;
      value.textContent = fmt(row, v);
      wrap.classList.toggle('is-changed', v !== get(row.path, CODE_DIAL));
    };
    input.addEventListener('input', () => { value.textContent = fmt(row, input.value); });
    input.addEventListener('change', () => {
      put(row.path, +(+input.value).toFixed(decimals(row.step)));
      sync();
      apply();
    });
    refreshers.push(sync);
    sync();

    const top = el('div', 'tuner__row-top');
    top.append(label, value, reset);
    wrap.append(top, input, hint);
    return wrap;
  }

  /* ---------- A curve editor (like cubic-bezier.com or AE's graph editor) ---------- */

  function curveEditor(c) {
    const wrap = el('div', 'curve');
    const top = el('div', 'tuner__row-top');
    const reset = button('tuner__reset', '↺', () => { DIAL.curves[c.key] = CODE_DIAL.curves[c.key]; load(); commit(); });
    reset.title = `Back to the curve in motion.js (${CODE_DIAL.curves[c.key]})`;
    top.append(el('span', 'tuner__label', c.name), reset);
    wrap.append(top, el('p', 'tuner__hint', c.hint));

    // Graph: x = time (left → right), y = progress (bottom → top)
    const X = (x) => 20 + x * 120;
    const Y = (y) => 130 - y * 100;
    const graph = svgEl('svg', { class: 'curve__graph', viewBox: '0 0 160 160', role: 'img', 'aria-label': `${c.name} curve` });
    graph.append(
      svgEl('rect', { class: 'curve__frame', x: X(0), y: Y(1), width: 120, height: 100 }),
      svgEl('line', { class: 'curve__guide', x1: X(0), y1: Y(0), x2: X(1), y2: Y(1) }),
      svgEl('text', { class: 'curve__axis', x: X(0), y: 148 }),
      svgEl('text', { class: 'curve__axis', x: X(1), y: 148, 'text-anchor': 'end' }),
    );
    graph.children[2].textContent = 'start';
    graph.children[3].textContent = 'end';
    const arm1 = svgEl('line', { class: 'curve__arm' });
    const arm2 = svgEl('line', { class: 'curve__arm' });
    const path = svgEl('path', { class: 'curve__path' });
    const handles = [0, 1].map(() => {
      const g = svgEl('g', { class: 'curve__handle' });
      g.append(svgEl('circle', { class: 'curve__hit', r: 12 }), svgEl('circle', { class: 'curve__dot-h', r: 5.5 }));
      return g;
    });
    graph.append(arm1, arm2, path, ...handles);

    const text = el('input', 'curve__value');
    text.type = 'text';
    text.spellcheck = false;
    text.setAttribute('aria-label', `${c.name} curve values (x1, y1, x2, y2)`);

    const chips = el('div', 'curve__chips');
    const chipBtns = PRESETS.map(([name, val]) => button('tuner__chip', name, () => { vals = parse(val); draw(); commit(); }));
    chips.append(...chipBtns);

    const track = el('div', 'curve__track');
    const dot = el('div', 'curve__dot');
    track.append(dot);
    track.title = 'Play the curve';
    track.addEventListener('click', () => preview());

    const side = el('div', 'curve__side');
    side.append(text, track);
    const grid = el('div', 'curve__grid');
    grid.append(graph, side);
    wrap.append(grid, chips);

    let vals = [];
    const parse = (s) => s.split(',').map((n) => +n.trim());
    const str = (v) => v.map((n) => +n.toFixed(2)).join(', ');

    function load() { vals = parse(DIAL.curves[c.key]); draw(); }

    function draw() {
      const [x1, y1, x2, y2] = vals;
      path.setAttribute('d', `M${X(0)} ${Y(0)} C${X(x1)} ${Y(y1)} ${X(x2)} ${Y(y2)} ${X(1)} ${Y(1)}`);
      arm1.setAttribute('x1', X(0)); arm1.setAttribute('y1', Y(0)); arm1.setAttribute('x2', X(x1)); arm1.setAttribute('y2', Y(y1));
      arm2.setAttribute('x1', X(1)); arm2.setAttribute('y1', Y(1)); arm2.setAttribute('x2', X(x2)); arm2.setAttribute('y2', Y(y2));
      handles[0].setAttribute('transform', `translate(${X(x1)} ${Y(y1)})`);
      handles[1].setAttribute('transform', `translate(${X(x2)} ${Y(y2)})`);
      text.value = str(vals);
      const current = str(vals);
      chipBtns.forEach((b, i) => b.classList.toggle('is-on', str(parse(PRESETS[i][1])) === current));
      wrap.classList.toggle('is-changed', current !== str(parse(CODE_DIAL.curves[c.key])));
    }

    function preview() {
      CustomEase.create(`tuner-${c.key}`, str(vals));
      gsap.fromTo(dot, { x: 0 }, { x: () => track.clientWidth - dot.offsetWidth - 4, duration: 1.2, ease: `tuner-${c.key}`, overwrite: true });
    }

    function commit() {
      DIAL.curves[c.key] = str(vals);
      draw();
      preview();
      apply();
    }

    // Dragging the handles
    handles.forEach((h, i) => {
      h.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        h.setPointerCapture(e.pointerId);
        h.classList.add('is-dragging');
      });
      h.addEventListener('pointermove', (e) => {
        if (!h.hasPointerCapture(e.pointerId)) return;
        const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(graph.getScreenCTM().inverse());
        vals[i * 2] = clamp((p.x - 20) / 120, 0, 1);
        vals[i * 2 + 1] = clamp((130 - p.y) / 100, -0.3, 1.3);
        draw();
      });
      const end = (e) => {
        if (!h.hasPointerCapture(e.pointerId)) return;
        h.releasePointerCapture(e.pointerId);
        h.classList.remove('is-dragging');
        commit();
      };
      h.addEventListener('pointerup', end);
      h.addEventListener('pointercancel', end);
    });

    text.addEventListener('change', () => {
      const v = parse(text.value);
      if (v.length === 4 && v.every((n) => Number.isFinite(n))) {
        vals = [clamp(v[0], 0, 1), v[1], clamp(v[2], 0, 1), v[3]];
        commit();
      } else {
        draw();
        status('A curve needs four numbers: x1, y1, x2, y2 (x between 0 and 1)');
      }
    });

    refreshers.push(load);
    load();
    return wrap;
  }

  /* ---------- Copy settings as code for motion.js ---------- */

  function copySettings() {
    const d = DIAL;
    const n = (v) => String(+v);
    const code =
`  const DIAL = {
    // Ochre's own curves, written like CSS cubic-bezier(x1, y1, x2, y2).
    curves: {
      arrive: '${d.curves.arrive}',   // arrivals: text rising, photos settling, copy fading in
      travel: '${d.curves.travel}',    // things that travel: frames opening, lines, menu panel, card → project
      leave:  '${d.curves.leave}',    // leaving a page
    },
    smoothScroll: ${n(d.smoothScroll)},                           // seconds the page takes to catch up with a mouse wheel or trackpad (0 = normal scrolling). Phones always scroll natively.
    lines:    { duration: ${n(d.lines.duration)}, stagger: ${n(d.lines.stagger)} },   // headings rising line by line out of a mask
    chars:    { duration: ${n(d.chars.duration)}, stagger: ${n(d.chars.stagger)} },  // the big "Ochre Studio" letters (hero and footer)
    fade:     { duration: ${n(d.fade.duration)}, y: ${n(d.fade.y)} },          // body copy, labels, buttons: fade in while rising
    image:    { duration: ${n(d.image.duration)}, zoom: ${n(d.image.zoom)} },      // frames open upwards while the photo settles from a zoom
    rule:     { duration: ${n(d.rule.duration)} },                 // divider lines drawing across
    parallax: { shift: ${n(d.parallax.shift)} },                      // photos drift ±shift% inside their frames as you scroll (they zoom just enough to hide the edges)
    revealAt: ${n(d.revealAt)},                                // a scroll reveal starts when the element's top reaches this % down the screen
    menu:     { duration: ${n(d.menu.duration)}, closeSpeed: ${n(d.menu.closeSpeed)} },// mobile menu panel; closing plays the opening backwards, this much faster
    leave:    { duration: ${n(d.leave.duration)} },                 // the page fading out before the next one loads
    flip:     { duration: ${n(d.flip.duration)} },                 // a project card growing into that project's hero
    lag: ${n(d.lag)},                                   // "Objects / Shaped Slowly / In Clay" trail behind the scroll, each line this many seconds more (smooth scroll only)
  };
`;
    const done = () => status('Copied. In motion.js, select from "const DIAL = {" to its closing "};" and paste over it.');
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code).then(done, () => showCode(code));
    } else {
      showCode(code);
    }
  }

  function showCode(code) {
    const area = el('textarea', 'tuner__code');
    area.value = code;
    area.readOnly = true;
    foot.prepend(area);
    area.select();
    status('Select all of the text above, copy it, and paste it over THE DIAL in motion.js.');
  }
})();
