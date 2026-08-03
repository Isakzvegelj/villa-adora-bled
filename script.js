// ADORA — Villa Adora Bled · site interactions
(function () {
  'use strict';

  // ---------- Nav scrolled state ----------
  var nav = document.getElementById('nav');
  function onScroll() {
    if (window.scrollY > 40) { nav.classList.add('scrolled'); }
    else { nav.classList.remove('scrolled'); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- Mobile nav ----------
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      var active = navLinks.classList.toggle('active');
      navToggle.classList.toggle('active', active);
      navToggle.setAttribute('aria-expanded', active ? 'true' : 'false');
    });
    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        navLinks.classList.remove('active');
        navToggle.classList.remove('active');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ---------- Footer year ----------
  var year = document.getElementById('footerYear');
  if (year) year.textContent = String(new Date().getFullYear());

  // ---------- Suites carousel (horizontal scroll) ----------
  var GAP = 26;
  var carousel = document.querySelector('.carousel');
  var track = carousel ? carousel.querySelector('.carousel-track') : null;
  var prev = carousel ? carousel.querySelector('.car-arrow.prev') : null;
  var next = carousel ? carousel.querySelector('.car-arrow.next') : null;
  var dotsWrap = carousel ? carousel.querySelector('.car-dots') : null;
  var cards = track ? Array.prototype.slice.call(track.children) : [];
  var dots = [];

  function cardStep() {
    var c = track ? track.children[0] : null;
    return c ? c.offsetWidth + GAP : 320;
  }

  if (track && dotsWrap) {
    cards.forEach(function (card, i) {
      var d = document.createElement('button');
      d.type = 'button';
      d.className = 'car-dot';
      d.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      d.addEventListener('click', function () {
        track.scrollTo({ left: i * cardStep(), behavior: 'smooth' });
      });
      dotsWrap.appendChild(d);
      dots.push(d);
    });
  }

  function sync() {
    var step = cardStep();
    var idx = Math.round(track.scrollLeft / step);
    idx = Math.max(0, Math.min(idx, cards.length - 1));
    dots.forEach(function (d, i) { d.classList.toggle('active', i === idx); });
    if (prev) prev.style.visibility = idx === 0 ? 'hidden' : 'visible';
    if (next) next.style.visibility = idx >= cards.length - 1 ? 'hidden' : 'visible';
  }
  if (prev) prev.addEventListener('click', function () {
    var idx = Math.round(track.scrollLeft / cardStep());
    track.scrollTo({ left: Math.max(0, (idx - 1) * cardStep()), behavior: 'smooth' });
  });
  if (next) next.addEventListener('click', function () {
    var idx = Math.round(track.scrollLeft / cardStep());
    track.scrollTo({ left: Math.min((cards.length - 1) * cardStep(), (idx + 1) * cardStep()), behavior: 'smooth' });
  });
  if (track) {
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  }

  // ---------- Availability panel (per-suite, from Check Availability) ----------
  var panel = document.getElementById('availPanel');
  var availClose = document.getElementById('availClose');

  function scrollToCard(room) {
    if (!track) return;
    var target = track.querySelector('.suite-card[data-room="' + room + '"]');
    if (!target) return;
    var idx = Array.prototype.indexOf.call(track.children, target);
    track.scrollTo({ left: idx * cardStep(), behavior: 'smooth' });
    dots.forEach(function (d, i) { d.classList.toggle('active', i === idx); });
  }

  document.querySelectorAll('.btn-avail').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var room = btn.getAttribute('data-room');
      if (panel) {
        panel.hidden = false;
        // Highlight the matching calendar item
        var items = panel.querySelectorAll('.avail-item');
        items.forEach(function (it) { it.classList.remove('highlight'); });
        var target = panel.querySelector('.avail-item[data-room="' + room + '"]');
        if (target) {
          target.classList.add('highlight');
          setTimeout(function () {
            // scroll into view within panel
            target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 150);
        }
        // Ensure we're not within opening the panel repeatedly
        scrollToCard(room);
      }
    });
  });

  if (availClose && panel) {
    availClose.addEventListener('click', function () { panel.hidden = true; });
  }
})();
