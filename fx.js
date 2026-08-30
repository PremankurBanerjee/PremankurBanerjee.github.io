/* =============================================================================
   fx.js — motion, page-transition and ambient graphics layer
   -----------------------------------------------------------------------------
   Load this in <head> WITHOUT defer, before script.js. The first block has to
   run ahead of the first paint so the arriving page can be masked without a
   flash; everything that touches the DOM waits for DOMContentLoaded.

   Nothing here replaces existing behaviour. script.js keeps owning the tabs,
   the news list and the contact form; fx.js only listens after it and decorates.
   ============================================================================= */

(function () {
  'use strict';

  var root = document.documentElement;

  var reduced = false;
  try {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { /* older browsers: keep motion on */ }

  var canHover = true;
  try {
    canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  } catch (e) { /* assume a mouse */ }


  /* ===========================================================================
     1. PRE-PAINT PHASE
     =========================================================================== */

  /* Which page are we on? Drives the per-destination accent pair in fx.css.
     Matches on substrings so the preview-*.html copies resolve identically. */
  function pageKeyFor(pathname) {
    var p = String(pathname || '').toLowerCase();
    if (p.indexOf('about') > -1)   return 'about';
    if (p.indexOf('project') > -1) return 'projects';
    if (p.indexOf('contact') > -1) return 'contact';
    return 'home';
  }

  /* Nav order. The wavefront travels forward through this list and backward
     out of it, so the transition direction mirrors the visitor's movement. */
  var ORDER = ['home', 'about', 'projects', 'contact'];

  root.setAttribute('data-fx-page', pageKeyFor(location.pathname));
  root.classList.add('fx');

  /* The sweep direction has to survive the navigation so the arriving half of
     the wavefront keeps travelling the way the leaving half was already going.
     sessionStorage is the happy path; window.name is the fallback because
     file:// origins block storage entirely and this site is often opened
     straight off disk. */
  var HANDOFF = 'fx:handoff:';

  function readHandoff() {
    var raw = null;

    try {
      raw = sessionStorage.getItem('fx-handoff');
      sessionStorage.removeItem('fx-handoff');
    } catch (e) { /* storage blocked */ }

    if (!raw && typeof window.name === 'string' && window.name.indexOf(HANDOFF) === 0) {
      raw = window.name.slice(HANDOFF.length);
      try { window.name = ''; } catch (e) {}
    }

    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function writeHandoff(data) {
    var raw = JSON.stringify(data);
    try { sessionStorage.setItem('fx-handoff', raw); } catch (e) {}
    try { window.name = HANDOFF + raw; } catch (e) {}
  }

  var incoming = readHandoff();

  if (incoming && (incoming.dir === 1 || incoming.dir === -1)) {
    root.style.setProperty('--fx-dir', String(incoming.dir));
  }

  /* A page restored from the back/forward cache still carries the leaving
     state. Clear it, or the visitor lands on a blurred, displaced page. */
  window.addEventListener('pageshow', function () {
    root.classList.remove('fx-leaving');

    var stale = document.querySelectorAll('.fx-exit');
    for (var i = 0; i < stale.length; i++) {
      stale[i].parentNode.removeChild(stale[i]);
    }
  });


  /* ===========================================================================
     2. PAGE TRANSITION
     =========================================================================== */

  var navigating = false;

  function isInternalPage(url) {
    if (url.origin !== location.origin) return false;
    if (/\.(pdf|zip|png|jpe?g|gif|mp4|webm|svg)$/i.test(url.pathname)) return false;
    return true;
  }

  function leaveTo(href, x, y, tint) {
    if (navigating) return;
    navigating = true;

    var from = ORDER.indexOf(pageKeyFor(location.pathname));
    var to = ORDER.indexOf(tint);
    var dir = (to < 0 || from < 0 || to >= from) ? 1 : -1;

    writeHandoff({ dir: dir });

    if (reduced) {
      location.href = href;
      return;
    }

    root.style.setProperty('--fx-dir', String(dir));
    root.classList.add('fx-leaving');

    /* Tint the leaving wavefront with the DESTINATION colour, so the front that
       arrives on the next page is visibly the same object still travelling. */
    var front = document.createElement('div');
    front.className = 'fx-exit';
    front.style.setProperty('--fx-dir', String(dir));
    applyTint(front, tint);
    document.body.appendChild(front);

    /* A parting impulse under the press itself, so the click still feels felt. */
    if (window.fxImpulse) window.fxImpulse(x, y, 1.5);

    window.setTimeout(function () { location.href = href; }, 470);
  }

  /* fx.css keys its palette off html[data-fx-page]; detached overlay elements
     need the same values written directly onto them. */
  var TINTS = {
    home:     ['#73e0ff', '#9d7bff', 'rgba(115,224,255,0.30)', 'rgba(157,123,255,0.20)'],
    about:    ['#4af1b4', '#73e0ff', 'rgba(74,241,180,0.28)',  'rgba(115,224,255,0.20)'],
    projects: ['#9d7bff', '#e180ff', 'rgba(157,123,255,0.30)', 'rgba(225,128,255,0.20)'],
    contact:  ['#73e0ff', '#4af1b4', 'rgba(115,224,255,0.28)', 'rgba(74,241,180,0.20)']
  };

  function applyTint(el, key) {
    var t = TINTS[key] || TINTS.home;
    el.style.setProperty('--fx-tint', t[0]);
    el.style.setProperty('--fx-tint-2', t[1]);
    el.style.setProperty('--fx-glow-1', t[2]);
    el.style.setProperty('--fx-glow-2', t[3]);
  }

  document.addEventListener('click', function (event) {
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    var link = event.target && event.target.closest ? event.target.closest('a') : null;
    if (!link) return;
    if (link.hasAttribute('download')) return;
    if (link.target && link.target !== '_self') return;

    var href = link.getAttribute('href');
    if (!href || href.charAt(0) === '#') return;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return;

    var url;
    try { url = new URL(link.href, location.href); } catch (e) { return; }

    if (!isInternalPage(url)) return;
    if (url.pathname === location.pathname && url.search === location.search) return;

    event.preventDefault();

    var rect = link.getBoundingClientRect();
    var x = event.clientX || (rect.left + rect.width / 2);
    var y = event.clientY || (rect.top + rect.height / 2);

    leaveTo(url.href, x, y, pageKeyFor(url.pathname));
  });


  /* ===========================================================================
     3. AMBIENT FIELD
     ---------------------------------------------------------------------------
     A slow drift of particles that the cursor pushes around — a visual stand-in
     for the force fields this research is actually about. Clicking emits a
     pressure wave; so does leaving the page.
     =========================================================================== */

  function initField() {
    if (reduced) return;

    var canvas = document.createElement('canvas');
    canvas.className = 'fx-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(canvas, document.body.firstChild);

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var TAU = Math.PI * 2;
    var COLORS = [[115, 224, 255], [157, 123, 255], [74, 241, 180]];
    var sprites = COLORS.map(makeSprite);
    var flashSprite = makeSprite([214, 240, 255]);

    var w = 0, h = 0;
    var particles = [];
    var impulses = [];
    var sparks = [];
    var pointer = { x: -9999, y: -9999, live: false };
    var frame = 0;

    function rgba(c, a) {
      return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' +
        (a > 0 ? a : 0).toFixed(3) + ')';
    }

    function makeSprite(rgb) {
      var size = 64;
      var s = document.createElement('canvas');
      s.width = s.height = size;

      var c = s.getContext('2d');
      var g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);

      g.addColorStop(0,    'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.95)');
      g.addColorStop(0.25, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.35)');
      g.addColorStop(1,    'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0)');

      c.fillStyle = g;
      c.fillRect(0, 0, size, size);

      return s;
    }

    function build() {
      /* Scale the population with the viewport, and hold back on machines
         that are unlikely to enjoy 90 glowing sprites a frame. */
      var budget = (w * h) / 19000;
      if ((navigator.hardwareConcurrency || 4) < 4) budget *= 0.55;

      var count = Math.round(Math.max(24, Math.min(88, budget)));
      particles = [];

      for (var i = 0; i < count; i++) {
        particles.push({
          x:  Math.random() * w,
          y:  Math.random() * h,
          vx: (Math.random() - 0.5) * 0.24,
          vy: (Math.random() - 0.5) * 0.24,
          r:  1 + Math.random() * 2,
          c:  i % COLORS.length,
          ph: Math.random() * Math.PI * 2
        });
      }
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);

      w = window.innerWidth;
      h = window.innerHeight;

      canvas.width  = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width  = w + 'px';
      canvas.style.height = h + 'px';

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    /* -----------------------------------------------------------------------
       A press is rendered as a damped vibration mode of a circular membrane:
       three lobed wavefronts, one per accent colour, expanding at slightly
       different rates while their lobes rotate and flatten out — plus a spark
       discharge and a core flash. That is the shape a driven membrane actually
       takes, and it carries far more energy than a plain expanding ring.
       ----------------------------------------------------------------------- */
    function impulse(x, y, power) {
      power = power || 1;

      if (impulses.length > 4) impulses.shift();

      var lobes = [3, 5, 8];
      var modes = [];

      for (var m = 0; m < 3; m++) {
        modes.push({
          n:     lobes[m] + (Math.random() < 0.5 ? 0 : 1),
          phase: Math.random() * TAU,
          spin:  (0.005 + Math.random() * 0.006) * (m % 2 ? 1 : -1),
          amp:   0.34 - m * 0.07,
          lag:   m * 0.13,
          c:     COLORS[m]
        });
      }

      impulses.push({ x: x, y: y, r: 8, t: 0, power: power, flash: 1, modes: modes });

      var count = Math.round(15 * power);

      for (var s = 0; s < count; s++) {
        var a = (s / count) * TAU + (Math.random() - 0.5) * 0.55;
        var v = (2.6 + Math.random() * 4.6) * power;

        sparks.push({
          x: x, y: y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          life: 1,
          c: COLORS[s % 3]
        });
      }

      if (sparks.length > 180) sparks.splice(0, sparks.length - 180);
    }

    window.fxImpulse = impulse;

    function step() {
      frame++;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';

      var i, j, p, q;

      /* --- membrane modes --------------------------------------------------- */
      for (i = impulses.length - 1; i >= 0; i--) {
        var im = impulses[i];

        im.t += 0.016;
        im.r += 13 * im.power * (1 - im.t * 0.6);
        im.flash *= 0.80;

        if (im.t >= 1) { impulses.splice(i, 1); continue; }

        var fade = (1 - im.t) * (1 - im.t);

        for (j = 0; j < im.modes.length; j++) {
          var m = im.modes[j];
          var radius = im.r * (1 - m.lag * im.t);

          if (radius <= 1) continue;

          var amp = m.amp * (1 - im.t);
          var rot = m.phase + im.r * m.spin;

          ctx.beginPath();

          for (var seg = 0; seg <= 60; seg++) {
            var th = (seg / 60) * TAU;
            var rr = radius * (1 + amp * Math.cos(m.n * th + rot));
            var mx = im.x + Math.cos(th) * rr;
            var my = im.y + Math.sin(th) * rr;

            if (seg) ctx.lineTo(mx, my); else ctx.moveTo(mx, my);
          }

          ctx.closePath();
          ctx.strokeStyle = rgba(m.c, fade * 0.5);
          ctx.lineWidth = Math.max(0.4, 2.4 * fade);
          ctx.stroke();
        }

        if (im.flash > 0.02) {
          var fs = 160 * im.power * (1.25 - im.flash);

          ctx.globalAlpha = im.flash * 0.5;
          ctx.drawImage(flashSprite, im.x - fs / 2, im.y - fs / 2, fs, fs);
          ctx.globalAlpha = 1;
        }
      }

      /* --- particles ------------------------------------------------------ */
      for (i = 0; i < particles.length; i++) {
        p = particles[i];

        p.x += p.vx;
        p.y += p.vy;
        p.ph += 0.012;

        if (p.x < -40) p.x = w + 40;
        if (p.x > w + 40) p.x = -40;
        if (p.y < -40) p.y = h + 40;
        if (p.y > h + 40) p.y = -40;

        var lift = 0;

        if (pointer.live) {
          var dx = p.x - pointer.x;
          var dy = p.y - pointer.y;
          var d2 = dx * dx + dy * dy;

          if (d2 < 26000 && d2 > 1) {
            var d = Math.sqrt(d2);
            var push = (1 - d / 161) * 0.9;

            p.x += (dx / d) * push;
            p.y += (dy / d) * push;
            lift = push;
          }
        }

        /* Every wavefront nudges and brightens whatever it passes through. */
        for (j = 0; j < impulses.length; j++) {
          var iw = impulses[j];
          var wdx = p.x - iw.x;
          var wdy = p.y - iw.y;
          var wd = Math.sqrt(wdx * wdx + wdy * wdy) || 1;
          var band = Math.abs(wd - iw.r);

          if (band < 72) {
            var force = (1 - band / 72) * (1 - iw.t) * 1.6 * iw.power;
            p.x += (wdx / wd) * force;
            p.y += (wdy / wd) * force;
            lift = Math.max(lift, force * 0.7);
          }
        }

        var pulse = 0.55 + Math.sin(p.ph) * 0.18;
        var size  = p.r * (7 + lift * 10);

        ctx.globalAlpha = Math.min(0.85, pulse * (0.42 + lift * 0.9));
        ctx.drawImage(sprites[p.c], p.x - size / 2, p.y - size / 2, size, size);
      }

      /* --- constellation lines -------------------------------------------- */
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;

      for (i = 0; i < particles.length; i++) {
        p = particles[i];

        for (j = i + 1; j < particles.length; j++) {
          q = particles[j];

          var lx = p.x - q.x;
          var ly = p.y - q.y;
          var l2 = lx * lx + ly * ly;

          if (l2 > 17000) continue;

          var a = (1 - Math.sqrt(l2) / 130) * 0.11;

          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = 'rgba(150,200,255,' + a.toFixed(3) + ')';
          ctx.stroke();
        }

        /* Tether nearby particles to the cursor — the field "feeling" you. */
        if (pointer.live) {
          var cx = p.x - pointer.x;
          var cy = p.y - pointer.y;
          var c2 = cx * cx + cy * cy;

          if (c2 < 30000) {
            var ca = (1 - Math.sqrt(c2) / 173) * 0.22;

            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.strokeStyle = 'rgba(115,224,255,' + ca.toFixed(3) + ')';
            ctx.stroke();
          }
        }
      }

      /* --- spark discharge -------------------------------------------------- */
      ctx.lineCap = 'round';

      for (i = sparks.length - 1; i >= 0; i--) {
        var sp = sparks[i];

        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vx *= 0.925;
        sp.vy *= 0.925;
        sp.life -= 0.024;

        if (sp.life <= 0) { sparks.splice(i, 1); continue; }

        /* Drawn as a short streak along its own velocity, so fast sparks read
           as motion-blurred filaments instead of dots. */
        ctx.beginPath();
        ctx.moveTo(sp.x - sp.vx * 2.6, sp.y - sp.vy * 2.6);
        ctx.lineTo(sp.x, sp.y);
        ctx.strokeStyle = rgba(sp.c, sp.life * 0.8);
        ctx.lineWidth = 1.8 * sp.life + 0.3;
        ctx.stroke();
      }

      ctx.lineCap = 'butt';

      /* --- cursor glow ----------------------------------------------------- */
      if (pointer.live) {
        var halo = 220 + Math.sin(frame * 0.03) * 18;
        ctx.globalAlpha = 0.16;
        ctx.drawImage(sprites[0], pointer.x - halo / 2, pointer.y - halo / 2, halo, halo);
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    var raf = 0;

    function loop() {
      step();
      raf = window.requestAnimationFrame(loop);
    }

    function start() { if (!raf) loop(); }
    function stop()  { if (raf) { window.cancelAnimationFrame(raf); raf = 0; } }

    resize();
    start();

    window.addEventListener('resize', debounce(resize, 180));

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    window.addEventListener('pointermove', function (e) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.live = e.pointerType !== 'touch';
    }, { passive: true });

    window.addEventListener('pointerleave', function () { pointer.live = false; });

    /* Pressing empty background is the case that has nothing else to say, so
       it gets the fullest impulse; controls already answer with their own
       ripple and only need a light one. */
    window.addEventListener('pointerdown', function (e) {
      var onControl = e.target && e.target.closest &&
        e.target.closest('a, button, input, textarea, select, .pill');

      impulse(e.clientX, e.clientY, onControl ? 0.7 : 1.3);
    }, { passive: true });
  }


  /* ===========================================================================
     4. NAVIGATION CHROME
     =========================================================================== */

  function initNav() {
    var list = document.querySelector('.nav-links');
    if (!list) return;

    var links = list.querySelectorAll('a');
    var active = list.querySelector('a.active');

    var indicator = document.createElement('span');
    indicator.className = 'fx-nav-ind';
    indicator.setAttribute('aria-hidden', 'true');
    list.insertBefore(indicator, list.firstChild);

    function moveTo(target) {
      if (!target) {
        indicator.style.opacity = '0';
        return;
      }

      indicator.style.opacity = '1';
      indicator.style.width  = target.offsetWidth + 'px';
      indicator.style.height = target.offsetHeight + 'px';
      indicator.style.transform =
        'translate(' + target.offsetLeft + 'px,' + target.offsetTop + 'px)';
    }

    /* One frame of settle time so the first position is not animated from 0,0. */
    window.requestAnimationFrame(function () {
      indicator.style.transition = 'none';
      moveTo(active);

      window.requestAnimationFrame(function () { indicator.style.transition = ''; });
    });

    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('pointerenter', function () { moveTo(this); });
    }

    list.addEventListener('pointerleave', function () { moveTo(active); });
    window.addEventListener('resize', debounce(function () { moveTo(active); }, 150));

    var progress = document.createElement('div');
    progress.className = 'fx-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.appendChild(progress);

    var ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(function () {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        var pct = max > 0 ? Math.min(1, window.scrollY / max) : 0;

        progress.style.transform = 'scaleX(' + pct + ')';
        root.classList.toggle('fx-scrolled', window.scrollY > 24);

        ticking = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }


  /* ===========================================================================
     5. HERO DECORATION
     =========================================================================== */

  function initHero() {
    var img = document.querySelector('.hero-img');
    if (!img || img.parentNode.classList.contains('fx-avatar')) return;

    var wrap = document.createElement('div');
    wrap.className = 'fx-avatar';

    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);
  }


  /* ===========================================================================
     6. TABS
     ---------------------------------------------------------------------------
     script.js owns the .active class switching. These listeners are registered
     later, so by the time they run the classes are already correct and all we
     have to do is choreograph.
     =========================================================================== */

  function staggerPills(panel) {
    if (!panel) return;

    var pills = panel.querySelectorAll('.pill');

    for (var i = 0; i < pills.length; i++) {
      pills[i].style.animationDelay = (i * 0.028).toFixed(3) + 's';
    }

    panel.classList.remove('fx-stagger');
    void panel.offsetWidth;          /* force a reflow so the animation restarts */
    panel.classList.add('fx-stagger');
  }

  /* `from` is measured in the capture phase, before script.js swaps panels. */
  function animateCardHeight(card, from, mutate) {
    if (!card || reduced || !from) { mutate(); return; }

    mutate();

    card.classList.add('fx-resizing');

    /* Measure the settled height exactly rather than inferring it from
       scrollHeight, which drops the card's border. */
    card.style.height = 'auto';
    var to = card.offsetHeight;

    card.style.height = from + 'px';
    void card.offsetWidth;

    window.requestAnimationFrame(function () {
      card.style.transition = 'height 0.45s cubic-bezier(0.22, 1, 0.36, 1)';
      card.style.height = to + 'px';
    });

    window.setTimeout(function () {
      card.style.transition = '';
      card.style.height = '';
      card.classList.remove('fx-resizing');
    }, 480);
  }

  function initTabs() {
    var header = document.querySelector('.focus-tabs-header');
    var card = document.querySelector('.focus-tabs');
    var preHeight = 0;

    if (card) {
      card.addEventListener('click', function (event) {
        if (event.target.closest('.tab-btn, .subtab-btn')) {
          preHeight = card.offsetHeight;
        }
      }, true);
    }

    if (header && card) {
      header.addEventListener('click', function (event) {
        var btn = event.target.closest('.tab-btn');
        if (!btn) return;

        /* script.js has already swapped .active by the time this bubbles. */
        animateCardHeight(card, preHeight, function () {
          staggerPills(card.querySelector('.tab-panel.active'));
        });
      });
    }

    var subtabs = document.querySelector('.skills-subtabs');

    if (subtabs) {
      var subInd = document.createElement('span');
      subInd.className = 'fx-sub-ind';
      subInd.setAttribute('aria-hidden', 'true');
      subtabs.appendChild(subInd);

      var moveSub = function () {
        var on = subtabs.querySelector('.subtab-btn.active');
        if (!on) { subInd.style.opacity = '0'; return; }

        subInd.style.opacity = '1';
        subInd.style.width = on.offsetWidth + 'px';
        subInd.style.transform = 'translateX(' + on.offsetLeft + 'px)';
      };

      subtabs.addEventListener('click', function (event) {
        var btn = event.target.closest('.subtab-btn');
        if (!btn) return;

        moveSub();

        animateCardHeight(card, preHeight, function () {
          staggerPills(document.querySelector('.skills-subpanel.active'));
        });

        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      });

      window.requestAnimationFrame(function () {
        subInd.style.transition = 'none';
        moveSub();
        window.requestAnimationFrame(function () { subInd.style.transition = ''; });
      });

      window.addEventListener('resize', debounce(moveSub, 150));
    }

    /* First impression: cascade the pills once the panel scrolls into view,
       timed to land just after the arrival veil has cleared. */
    var first = document.querySelector('.tab-panel.active');

    if (first) {
      window.setTimeout(function () { staggerPills(first); }, 880);
    }
  }


  /* ===========================================================================
     7. CARD TILT + SPOTLIGHT
     =========================================================================== */

  function initCards() {
    var spots = document.querySelectorAll(
      '.info-card, .timeline-card, .page-card, .project-part, .mini-stat'
    );

    for (var i = 0; i < spots.length; i++) {
      spots[i].classList.add('fx-spot');
    }

    if (!canHover || reduced) return;

    var tilts = document.querySelectorAll('.project-part, .mini-stat');

    for (var j = 0; j < tilts.length; j++) {
      tilts[j].classList.add('fx-tilt');
      bindTilt(tilts[j]);
    }

    /* Spotlight tracking is cheap enough to run on every hoverable card. */
    for (var k = 0; k < spots.length; k++) {
      bindSpotlight(spots[k]);
    }
  }

  function bindSpotlight(el) {
    el.addEventListener('pointermove', function (event) {
      var r = el.getBoundingClientRect();

      el.style.setProperty('--fx-px', ((event.clientX - r.left) / r.width * 100) + '%');
      el.style.setProperty('--fx-py', ((event.clientY - r.top) / r.height * 100) + '%');
    }, { passive: true });
  }

  function bindTilt(el) {
    var raf = 0;

    el.addEventListener('pointermove', function (event) {
      if (raf) return;

      raf = window.requestAnimationFrame(function () {
        raf = 0;

        var r = el.getBoundingClientRect();
        var px = (event.clientX - r.left) / r.width - 0.5;
        var py = (event.clientY - r.top) / r.height - 0.5;

        el.style.transform =
          'perspective(900px) translateY(-4px)' +
          ' rotateX(' + (-py * 7).toFixed(2) + 'deg)' +
          ' rotateY(' + (px * 7).toFixed(2) + 'deg)' +
          ' scale(1.012)';
      });
    }, { passive: true });

    el.addEventListener('pointerleave', function () {
      el.style.transform = '';
    });
  }


  /* ===========================================================================
     8. MAGNETIC BUTTONS + CLICK RIPPLES
     =========================================================================== */

  function initButtons() {
    var ripplers = document.querySelectorAll(
      '.btn, .tab-btn, .subtab-btn, .see-more-btn'
    );

    for (var i = 0; i < ripplers.length; i++) {
      ripplers[i].addEventListener('pointerdown', function (event) {
        var r = this.getBoundingClientRect();
        var size = Math.max(r.width, r.height) * 2.4;

        var ink = document.createElement('span');
        ink.className = 'fx-ripple';
        ink.style.width = ink.style.height = size + 'px';
        ink.style.left = (event.clientX - r.left) + 'px';
        ink.style.top  = (event.clientY - r.top) + 'px';

        this.appendChild(ink);
        window.setTimeout(function () {
          if (ink.parentNode) ink.parentNode.removeChild(ink);
        }, 640);
      });
    }

    if (!canHover || reduced) return;

    var magnets = document.querySelectorAll('.btn, .contact-icon-link');

    for (var j = 0; j < magnets.length; j++) {
      bindMagnet(magnets[j]);
    }
  }

  function bindMagnet(el) {
    el.addEventListener('pointermove', function (event) {
      var r = el.getBoundingClientRect();
      var dx = (event.clientX - (r.left + r.width / 2)) / r.width;
      var dy = (event.clientY - (r.top + r.height / 2)) / r.height;

      el.style.setProperty('--fx-mx', (dx * 12).toFixed(2) + 'px');
      el.style.setProperty('--fx-my', (dy * 10).toFixed(2) + 'px');
    }, { passive: true });

    el.addEventListener('pointerleave', function () {
      el.style.setProperty('--fx-mx', '0px');
      el.style.setProperty('--fx-my', '0px');
    });
  }


  /* ===========================================================================
     9. STAGGERED SCROLL REVEALS
     =========================================================================== */

  function initReveals() {
    if (reduced || !('IntersectionObserver' in window)) return;

    var groups = [
      '.stats-grid > .mini-stat',
      '.news-list > .news-item',
      '.timeline > .timeline-item',
      '.contact-list > .contact-item',
      '.project-parts > .project-part',
      '.projects-list > .project-feature > .project-feature-header'
    ];

    var watched = [];

    groups.forEach(function (selector) {
      var nodes = document.querySelectorAll(selector);

      for (var i = 0; i < nodes.length; i++) {
        nodes[i].classList.add('fx-rise');
        nodes[i].style.animationDelay = (Math.min(i, 8) * 0.07).toFixed(2) + 's';
        watched.push(nodes[i]);
      }
    });

    if (!watched.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        entry.target.classList.add('fx-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    watched.forEach(function (el) { io.observe(el); });

    /* News items past the fold are clipped by the collapsed list, so the
       observer never sees them. Reveal them when the list expands. */
    var seeMore = document.getElementById('seeMoreBtn');

    if (seeMore) {
      seeMore.addEventListener('click', function () {
        var hidden = document.querySelectorAll('#newsList .fx-rise:not(.fx-in)');

        for (var i = 0; i < hidden.length; i++) {
          hidden[i].style.animationDelay = (i * 0.05).toFixed(2) + 's';
          hidden[i].classList.add('fx-in');
        }
      });
    }

    /* Failsafe: nothing stays invisible because an observer misfired. */
    window.setTimeout(function () {
      for (var i = 0; i < watched.length; i++) {
        watched[i].classList.add('fx-in');
      }
    }, 6000);
  }


  /* ===========================================================================
     UTILITIES + BOOT
     =========================================================================== */

  function debounce(fn, wait) {
    var t = 0;

    return function () {
      var args = arguments;
      var self = this;

      window.clearTimeout(t);
      t = window.setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }

  function boot() {
    initField();
    initNav();
    initHero();
    initTabs();
    initCards();
    initButtons();
    initReveals();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}());
