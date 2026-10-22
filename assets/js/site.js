(function () {
  'use strict';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };

  // Footer year
  if ($('y')) $('y').textContent = new Date().getFullYear();

  // ---------- Spheroid compression demo ----------
  var svgNS = 'http://www.w3.org/2000/svg';
  var cellsG = $('cells'), fibersG = $('fibers'), plate = $('plate');
  var press = $('press'), out = $('pressOut'), sig = $('sig'), msg = $('simMsg');

  if (cellsG && press) {
    // Seeded random so the picture is the same on every visit
    var seed = 7;
    var rand = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

    // Collagen fibers in the background
    for (var f = 0; f < 34; f++) {
      var x = 20 + rand() * 360, y = 40 + rand() * 210, a = rand() * Math.PI, l = 30 + rand() * 50;
      var line = document.createElementNS(svgNS, 'path');
      var cx = x + Math.cos(a + 0.6) * l * 0.5, cy = y + Math.sin(a + 0.6) * l * 0.5;
      line.setAttribute('d', 'M' + x.toFixed(1) + ' ' + y.toFixed(1) + ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) +
        ' ' + (x + Math.cos(a) * l).toFixed(1) + ' ' + (y + Math.sin(a) * l).toFixed(1));
      fibersG.appendChild(line);
    }

    // Cells packed in a disk (sunflower pattern)
    var FLOOR = 250, R = 88, CX = 200, CY = FLOOR - R - 2, N = 80;
    var cells = [];
    for (var i = 0; i < N; i++) {
      var r = R * 0.9 * Math.sqrt((i + 0.5) / N), t = i * 2.39996;
      var c = document.createElementNS(svgNS, 'circle');
      c.setAttribute('cx', (CX + r * Math.cos(t)).toFixed(1));
      c.setAttribute('cy', (CY + r * Math.sin(t)).toFixed(1));
      c.setAttribute('r', (8.5 + rand() * 2.5).toFixed(1));
      cellsG.appendChild(c);
      cells.push({ el: c, base: 0.75 + rand() * 0.25 });
    }
    cellsG.setAttribute('filter', 'url(#glow)');

    var messages = [
      [0, 'No compression. The spheroid sits in a soft collagen gel.'],
      [1, 'Light compression starts to flatten the spheroid.'],
      [20, 'As compression increases, STAT1/IFN signaling goes down. We saw this in RNA-seq and confirmed it with qPCR and immunostaining.'],
      [40, 'Interferon signaling is central to how tumors interact with the immune system, so this observation opened new questions about mechanics and tumor immunity.']
    ];

    var render = function (v) {
      // v is the height reduction in percent (0 to 50); width grows so volume stays roughly constant
      var k = v / 50;
      var sy = 1 - v / 100, sx = 1 / Math.sqrt(sy);
      cellsG.setAttribute('transform',
        'translate(' + CX + ' ' + FLOOR + ') scale(' + sx.toFixed(3) + ' ' + sy.toFixed(3) + ') translate(' + (-CX) + ' ' + (-FLOOR) + ')');
      var top = FLOOR - 2 * R * sy;
      plate.setAttribute('y', (top - 12 - 12 * (1 - k)).toFixed(1));

      // Signal falls once compression is meaningful
      var s = 1 - 0.8 * Math.min(1, Math.max(0, (k - 0.15) / 0.75));
      for (var j = 0; j < cells.length; j++) {
        var b = cells[j].base * s;
        cells[j].el.setAttribute('fill', 'rgba(255,' + Math.round(70 + 60 * (1 - s)) + ',' + Math.round(130 + 60 * (1 - s)) + ',' + (0.15 + 0.8 * b).toFixed(2) + ')');
      }
      sig.style.width = Math.round(s * 100) + '%';
      out.textContent = v + '%';
      press.style.setProperty('--fill', (v / 50 * 100) + '%');
      var m = messages[0][1];
      for (var q = 0; q < messages.length; q++) if (v >= messages[q][0]) m = messages[q][1];
      if (msg.textContent !== m) msg.textContent = m;
    };

    var touched = false;
    press.addEventListener('input', function () { touched = true; render(+press.value); });
    render(0);

    // One gentle hint the first time the demo scrolls into view
    if (!reduceMotion && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        var start = null, dur = 2600;
        var step = function (ts) {
          if (touched) return;
          if (!start) start = ts;
          var p = Math.min(1, (ts - start) / dur);
          var v = Math.round(30 * Math.sin(Math.PI * p));
          press.value = v; render(v);
          if (p < 1) requestAnimationFrame(step); else { press.value = 0; render(0); }
        };
        setTimeout(function () { requestAnimationFrame(step); }, 500);
      }, { threshold: 0.6 });
      io.observe($('sph'));
    }
  }

  // ---------- Earlier roles toggle ----------
  var moreBtn = $('moreBtn'), earlier = $('earlier');
  if (moreBtn && earlier) {
    moreBtn.addEventListener('click', function () {
      var open = earlier.hidden;
      earlier.hidden = !open;
      moreBtn.setAttribute('aria-expanded', String(open));
      moreBtn.textContent = open ? 'Hide earlier roles' : 'Show earlier roles (3)';
    });
  }

  // ---------- Publication filters ----------
  var chips = document.querySelectorAll('.filters .chip');
  var pubs = document.querySelectorAll('#pubs li');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.dataset.filter;
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      pubs.forEach(function (li) {
        var tags = (li.dataset.tags || '').split(' ');
        li.hidden = !(f === 'all' || tags.indexOf(f) !== -1);
      });
    });
  });

  // ---------- Photo lightbox ----------
  var lb = $('lightbox'), lbImg = $('lightboxImg');
  if (lb && typeof lb.showModal === 'function') {
    document.querySelectorAll('#fun img, #leadership img').forEach(function (img) {
      img.classList.add('zoomable');
      img.tabIndex = 0;
      var open = function () { lbImg.src = img.src; lbImg.alt = img.alt; lb.showModal(); };
      img.addEventListener('click', open);
      img.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
  }

  // ---------- Mobile menu ----------
  var toggle = document.querySelector('.nav-toggle'), nav = $('primary-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
    });
  }

  // ---------- Back to top ----------
  var toTop = $('toTop');
  if (toTop) {
    var onScroll = function () { toTop.classList.toggle('show', window.scrollY > 800); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
})();
