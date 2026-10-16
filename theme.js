// Apply before styles paint; remember only an explicit visitor choice.
(function () {
  'use strict';
  var root = document.documentElement;
  var preference = null;
  var system = window.matchMedia('(prefers-color-scheme: dark)');
  try { preference = localStorage.getItem('adora-theme'); } catch (e) { /* Storage may be blocked. */ }
  if (preference !== 'dark' && preference !== 'light') preference = null;

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    var toggle = document.getElementById('themeToggle');
    if (toggle) toggle.setAttribute('aria-checked', String(theme === 'dark'));
    var color = document.querySelector('meta[name="theme-color"]');
    if (color) color.content = theme === 'dark' ? '#101d1d' : '#1f3d3a';
  }
  apply(preference || (system.matches ? 'dark' : 'light'));

  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.getElementById('themeToggle');
    if (!toggle) return;
    toggle.hidden = false;
    apply(root.getAttribute('data-theme'));
    toggle.addEventListener('click', function () {
      preference = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      apply(preference);
      try { localStorage.setItem('adora-theme', preference); } catch (e) { /* Still works for this visit. */ }
    });
  });
  system.addEventListener('change', function (event) {
    if (!preference) apply(event.matches ? 'dark' : 'light');
  });
})();
