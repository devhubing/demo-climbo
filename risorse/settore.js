/* Versioni di settore della demo.
   Con ?settore=<nome> nell'indirizzo carica risorse/settori/<nome>.js e sostituisce
   testi, immagini e orari dell'attività d'esempio. Senza parametro la pagina resta com'è.
   Il parametro viene mantenuto nei link, nella navigazione di clone.js e nell'anteprima del sito. */
(function () {
  var ALIAS = { parrucchiere: 'parrucchieri', parrucchieri: 'parrucchieri', parrucchiera: 'parrucchieri' };
  var raw = (new URLSearchParams(location.search).get('settore') || '').toLowerCase().trim();
  var nome = ALIAS[raw] || raw;
  if (!nome || !/^[a-z0-9-]+$/.test(nome)) return;
  var me = document.currentScript && document.currentScript.src;
  if (!me) return;
  var base = me.replace(/settore\.js(\?.*)?$/, '');
  window.CLONE_SETTORE = nome;
  // nasconde la pagina finché la sostituzione non è fatta, così non si vede il vecchio contenuto
  document.write('<style id="settore-nascondi">body{visibility:hidden!important}</style>');
  document.write('<script src="' + base + 'settori/' + nome + '.js"><\/script>');
  setTimeout(mostra, 2500); // in ogni caso non lasciare la pagina invisibile

  function mostra() { var s = document.getElementById('settore-nascondi'); if (s) s.remove(); }
  function norm(t) { return t.replace(/\s+/g, ' ').trim(); }

  var D, GLOB, IMG, ATTR = ['alt', 'title', 'placeholder', 'aria-label', 'value', 'content', 'data-esito-ok', 'data-esito-errore'];
  var GIORNI = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
  var ORA = /^(\d{1,2}:\d{2}(\s?[AP]M)?\s*-\s*\d{1,2}:\d{2}(\s?[AP]M)?|Chiuso|Aperto 24 ore)$/i;

  function globali(s) {
    for (var i = 0; i < GLOB.length; i++) if (s.indexOf(GLOB[i][0]) > -1) s = s.split(GLOB[i][0]).join(GLOB[i][1]);
    return s;
  }
  function testo(s) {
    var n = norm(s);
    if (!n) return s;
    var t = D.testi[n];
    if (t !== undefined) { var m = s.match(/^\s*/)[0], e = s.match(/\s*$/)[0]; return m + t + e; }
    return globali(s);
  }
  function url(s) {
    for (var i = 0; i < IMG.length; i++) if (s.indexOf(IMG[i][0]) > -1) s = s.split(IMG[i][0]).join(IMG[i][1]);
    return s;
  }
  function conParam(h) {
    if (!h || /^(#|javascript:|mailto:|tel:|https?:|blob:|data:)/i.test(h) || !/\.html(\?|#|$)/.test(h) || /[?&]settore=/.test(h)) return h;
    var i = h.indexOf('#'), hash = i > -1 ? h.slice(i) : '', p = i > -1 ? h.slice(0, i) : h;
    return p + (p.indexOf('?') > -1 ? '&' : '?') + 'settore=' + nome + hash;
  }
  function fmtOra(vecchio, nuovo) {
    // nuovo è "09:00 - 19:30" o "Chiuso"; se il vecchio era in formato AM/PM si converte
    if (!/[AP]M/i.test(vecchio) || !/\d/.test(nuovo)) return nuovo;
    return nuovo.replace(/(\d{1,2}):(\d{2})/g, function (_, h, m) { h = +h; return (h % 12 || 12) + ':' + m + ' ' + (h < 12 ? 'AM' : 'PM'); });
  }
  function orari(root) {
    if (!D.orari) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n, giorni = [];
    while ((n = w.nextNode())) { var k = GIORNI.indexOf(norm(n.nodeValue).toLowerCase()); if (k > -1) giorni.push([n, k]); }
    // prima si raccolgono le celle orario, poi si sceglie il formato (24 ore o AM/PM) guardando tutte le righe
    var celle = [], ampm = false;
    giorni.forEach(function (g) {
      var riga = g[0].parentNode && g[0].parentNode.parentNode;
      if (!riga || !riga.querySelectorAll) return;
      var w2 = document.createTreeWalker(riga, NodeFilter.SHOW_TEXT), t;
      while ((t = w2.nextNode())) { var v = norm(t.nodeValue); if (ORA.test(v)) { celle.push([t, g[1]]); if (/[AP]M/i.test(v)) ampm = true; } }
    });
    celle.forEach(function (c) { c[0].nodeValue = fmtOra(ampm ? 'AM' : '', D.orari[c[1]]); });
  }
  function el(e) {
    for (var i = 0; i < ATTR.length; i++) {
      var a = e.getAttribute(ATTR[i]);
      if (a && !(ATTR[i] === 'content' && e.tagName !== 'META')) { var b = testo(a); if (b !== a) e.setAttribute(ATTR[i], b); }
    }
    ['src', 'srcset', 'href', 'xlink:href', 'poster', 'style'].forEach(function (k) {
      var a = e.getAttribute(k); if (!a) return;
      var b = url(a);
      if (k === 'href' && e.tagName === 'A') b = conParam(b);
      if (k === 'src' && e.tagName === 'IFRAME') b = conParam(globali(b));
      if (b !== a) e.setAttribute(k, b);
    });
    if (e.tagName === 'STYLE' && e.id !== 'settore-nascondi') { var c = e.textContent, d = url(c); if (d !== c) e.textContent = d; }
  }
  function giro(root) {
    if (root.nodeType === 3) { var v = testo(root.nodeValue); if (v !== root.nodeValue) root.nodeValue = v; return; }
    if (root.nodeType === 1) {
      if (root.tagName === 'SCRIPT') return;
      el(root);
      if (root.shadowRoot) giro(root.shadowRoot);
      if (root.tagName === 'TEMPLATE') giro(root.content);
    }
    for (var c = root.firstChild; c; c = c.nextSibling) giro(c);
  }

  function avvia() {
    D = window.SETTORE_DATI;
    if (!D) { mostra(); return; }
    GLOB = D.globali || []; IMG = D.immagini || [];
    if (document.title) document.title = testo(document.title);
    giro(document.documentElement);
    orari(document.body);
    mostra();
    new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        if (m.type === 'characterData') { var v = testo(m.target.nodeValue); if (v !== m.target.nodeValue) m.target.nodeValue = v; return; }
        m.addedNodes.forEach(function (n) { giro(n); if (n.nodeType === 1) orari(n); });
      });
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  }
  // i link creati o cambiati dopo (anche da script) ricevono il parametro al clic
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (a) { var h = a.getAttribute('href'), n = conParam(h); if (n !== h) a.setAttribute('href', n); }
  }, true);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia); else avvia();
})();
