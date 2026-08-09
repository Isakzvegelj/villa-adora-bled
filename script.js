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

  // ---------- Carousels (suites + availability + any .carousel) ----------
  var GAP = 26;

  function initCarousel(carousel) {
    var track = carousel.querySelector('.carousel-track');
    if (!track) return;
    var prev = carousel.querySelector('.car-arrow.prev');
    var next = carousel.querySelector('.car-arrow.next');
    var dotsWrap = carousel.querySelector('.car-dots');
    var cards = Array.prototype.slice.call(track.children);
    var dots = [];

    function cardStep() {
      var c = track.children[0];
      return c ? c.offsetWidth + GAP : 320;
    }

    if (dotsWrap) {
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
    return { track: track, cards: cards, step: cardStep, dots: dots };
  }

  var carousels = document.querySelectorAll('.carousel');
  var suiteCar = null;
  var availCar = null;
  carousels.forEach(function (c) {
    var api = initCarousel(c);
    if (c.classList.contains('carousel-avail')) availCar = api;
    else if (!suiteCar) suiteCar = api;
  });

  // ---------- Check Availability -> scroll matching calendar into view ----------
  document.querySelectorAll('.btn-avail').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var room = btn.getAttribute('data-room');
      if (availCar && availCar.track) {
        var card = availCar.track.querySelector('.avail-card[data-room="' + room + '"]');
        if (card) {
          var idx = Array.prototype.indexOf.call(availCar.track.children, card);
          availCar.track.scrollTo({ left: idx * availCar.step(), behavior: 'smooth' });
          availCar.dots.forEach(function (d, i) { d.classList.toggle('active', i === idx); });
          availCar.track.querySelectorAll('.avail-card.highlight').forEach(function (c) { c.classList.remove('highlight'); });
          setTimeout(function () { card.classList.add('highlight'); }, 450);
          setTimeout(function () { card.classList.remove('highlight'); }, 2600);
        }
        var availSec = document.getElementById('availCarousel');
        if (availSec) availSec.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });

  // ---------- Dinner table reservation form ----------
  var restToggle = document.getElementById('restaurantToggle');
  var restFormWrap = document.getElementById('restaurantForm');
  if (restToggle && restFormWrap) {
    restToggle.addEventListener('click', function () {
      var isOpen = restFormWrap.classList.toggle('show');
      restToggle.textContent = isOpen ? 'Close Form' : 'Reserve a Table';
      restToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }
  var restForm = document.getElementById('restaurantReservationForm');
  if (restForm) {
    var dateField = document.getElementById('rfDate');
    if (dateField) dateField.min = new Date().toISOString().slice(0, 10);
    restForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('rfName').value.trim();
      var email = document.getElementById('rfEmail').value.trim();
      var date = document.getElementById('rfDate').value;
      var time = document.getElementById('rfTime').value;
      var guests = document.getElementById('rfGuests').value;
      var note = document.getElementById('rfNote').value.trim();
      if (!name || !email || !date) return;
      var subject = 'Dinner reservation - ' + name + ' - ' + date + ' ' + time + ' - ' + guests;
      var body = 'Name: ' + name + '\nEmail: ' + email + '\nDate: ' + date + '\nTime: ' + time + '\nGuests: ' + guests + '\nNote: ' + (note || '-');
      window.location.href = 'mailto:evita.vilebled@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      var ok = document.createElement('p');
      ok.className = 'rf-note';
      ok.style.color = 'var(--green-600)';
      ok.textContent = 'Your email app opened with the reservation pre-filled — we will confirm by email or phone.';
      restForm.appendChild(ok);
      restForm.reset();
    });
  }
})();
