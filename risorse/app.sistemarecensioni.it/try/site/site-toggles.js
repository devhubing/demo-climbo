// Anteprima del sito: riceve dagli interruttori della pagina "Sito web" quali sezioni mostrare o nascondere.
(function () {
  var DAYS = /^(lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica)$/i;
  function leaves(root, test) {
    return [].slice.call(root.querySelectorAll('*')).filter(function (e) { return e.childElementCount === 0 && test((e.textContent || '').trim()); });
  }
  function headerButtons() {
    var head = document.getElementById('header'); if (!head) return [];
    var btn = leaves(head, function (t) { return /^(Prenota|Indicazioni|Chiama|WhatsApp)$/i.test(t); })[0];
    if (!btn) return [];
    // contenitore comune dei pulsanti azione
    var box = btn.closest('a,button'); box = box ? box.parentElement : btn.parentElement;
    while (box && box !== head && leaves(box, function (t) { return /^(Prenota|Indicazioni|Chiama|WhatsApp)$/i.test(t); }).length < 2) box = box.parentElement;
    return box && box !== head ? [box] : [];
  }
  function hoursRows() {
    var h = document.getElementById('hours'); if (!h) return [];
    return leaves(h, function (t) { return DAYS.test(t); }).map(function (e) {
      var row = e.parentElement;
      while (row && row.parentElement && row.parentElement !== h && row.childElementCount < 2) row = row.parentElement;
      return row;
    });
  }
  function specialHours() {
    var h = document.getElementById('hours'); if (!h) return [];
    var lab = leaves(h, function (t) { return /orari speciali/i.test(t); })[0];
    return lab ? [lab.parentElement] : [];
  }
  function byId(id) { return function () { var e = document.getElementById(id); return e ? [e] : []; }; }
  // stesso ordine degli interruttori nella pagina "Sito web"
  var TARGETS = [
    function () { var n = document.querySelector('header'); return n ? [n] : []; }, // Barra di navigazione
    byId('header'),          // Header
    headerButtons,           // Pulsanti azione
    byId('photos'),          // Foto
    byId('services'),        // Servizi
    byId('amenities'),       // Attributi
    byId('reviews'),         // Widget carosello
    byId('blog'),            // Widget Blog
    hoursRows,               // Orari regolari
    specialHours,            // Orari speciali
    byId('customer-photos'), // Foto clienti
    byId('map'),             // Mappa
    byId('social')           // Link social
  ];
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || typeof d.cloneToggle !== 'number' || !TARGETS[d.cloneToggle]) return;
    TARGETS[d.cloneToggle]().forEach(function (el) { if (el) el.style.display = d.on ? '' : 'none'; });
  });
})();
