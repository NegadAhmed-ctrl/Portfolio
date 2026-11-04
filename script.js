document.documentElement.classList.add('js');

// Keep each frame tidy if an image file is missing
document.querySelectorAll('.frame img').forEach(function (img) {
  function mark() { img.closest('.frame').classList.add('missing'); }
  img.addEventListener('error', mark);
  if (img.complete && img.naturalWidth === 0) mark();
});

// Project tabs
var tabs = Array.prototype.slice.call(document.querySelectorAll('[role=tab]'));
function selectTab(tab) {
  tabs.forEach(function (t) {
    var on = t === tab;
    t.setAttribute('aria-selected', on);
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
  });
}
tabs.forEach(function (tab, i) {
  tab.addEventListener('click', function () { selectTab(tab); });
  tab.addEventListener('keydown', function (e) {
    var step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    if (document.documentElement.dir === 'rtl') step = -step;
    var next = tabs[(i + step + tabs.length) % tabs.length];
    selectTab(next);
    next.focus();
  });
});

// Service cards: light follows the pointer, and a click preselects the form
document.querySelectorAll('.card').forEach(function (card) {
  card.addEventListener('pointermove', function (e) {
    var box = card.getBoundingClientRect();
    card.style.setProperty('--x', (e.clientX - box.left) + 'px');
    card.style.setProperty('--y', (e.clientY - box.top) + 'px');
  });
  card.addEventListener('click', function () {
    var select = document.querySelector('[name=type]');
    if (select) select.value = card.dataset.type;
  });
});

// Contact form opens WhatsApp with a ready message. No server needed.
var form = document.getElementById('waForm');
if (form) {
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = new FormData(form);
    var text = form.dataset.hello + ' ' + data.get('name').trim() + '.\n' +
      form.dataset.need + ' ' + data.get('type') + '.\n' + data.get('details').trim();
    window.open('https://wa.me/201148333903?text=' + encodeURIComponent(text), '_blank', 'noopener');
  });
}
