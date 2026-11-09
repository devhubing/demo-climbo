// Riproduce menu a tendina, popup e finestre registrati dalla demo originale,
// compresi i menu che si aprono dentro un popup.
(function () {
  var dataEl = document.getElementById('clone-ix');
  if (!dataEl) return;
  var IX = JSON.parse(dataEl.textContent);
  var byTrigger = {};
  IX.forEach(function (it) { byTrigger[it.t] = it; });

  var stack = []; // livelli aperti: { it, trigger, nodes, floats }

  // Navigazione tra pagine: schede -> pagina della scheda, pulsanti che cambiano pagina, voci di menu
  var navEl = document.getElementById('clone-nav');
  var NAV = navEl ? JSON.parse(navEl.textContent) : {};
  NAV.tabs = NAV.tabs || {}; NAV.nav = NAV.nav || {}; NAV.options = NAV.options || {};
  var HERE = decodeURIComponent(location.pathname.split('/').pop());
  function go(file) { if (file && file !== HERE) { location.href = file; return true; } return false; }
  function label(e) { return (e.textContent || '').replace(/\s+/g, ' ').trim(); }

  function el(n) { return n === 'body' ? document.body : document.querySelector('[data-n="' + n + '"]'); }

  // Dettagli che si aprono in linea (es. "Visualizza dettagli"): si aprono e chiudono con lo stesso pulsante
  var inlineOpen = {};
  function toggleInline(it) {
    if (inlineOpen[it.t]) { inlineOpen[it.t].forEach(function (n) { n.remove(); }); delete inlineOpen[it.t]; return; }
    var added = [];
    it.nodes.forEach(function (n, j) {
      var tpl = document.getElementById('ctpl-' + it.tpl + '-' + j);
      var parent = el(n.parent);
      if (!tpl || !parent) return;
      var node = tpl.content.firstElementChild.cloneNode(true);
      var before = n.before ? el(n.before) : null;
      if (before && before.parentNode === parent) parent.insertBefore(node, before); else parent.appendChild(node);
      added.push(node);
    });
    inlineOpen[it.t] = added;
  }

  // Scheda dentro un popup: sostituisce il contenuto del popup con quello registrato
  function doSwap(it) {
    (it.roots || []).forEach(function (rootId, j) {
      var old = el(rootId);
      var tpl = document.getElementById('ctpl-' + it.tpl + '-' + j);
      if (!old || !tpl) return;
      var fresh = tpl.content.firstElementChild.cloneNode(true);
      old.replaceWith(fresh);
      stack.forEach(function (o) { o.nodes = o.nodes.map(function (x) { return x === old ? fresh : x; }); });
    });
  }

  function place(o) {
    var r = o.trigger.getBoundingClientRect();
    o.floats.forEach(function (f) {
      var s = f.el.style;
      s.position = 'fixed'; s.transform = 'none'; s.translate = 'none'; s.right = 'auto'; s.bottom = 'auto'; s.margin = '0';
      var w = f.el.offsetWidth, h = f.el.offsetHeight;
      var left = Math.max(4, Math.min(r.left + f.dx, window.innerWidth - w - 4));
      var top = r.top + f.dy;
      if (top + h > window.innerHeight - 4 && r.top - h - 6 > 0) top = r.top - h - 6;
      s.left = left + 'px'; s.top = top + 'px';
    });
  }

  function show(it, trigger) {
    var o = { it: it, trigger: trigger, nodes: [], floats: [] };
    it.nodes.forEach(function (n, j) {
      var tpl = document.getElementById('ctpl-' + it.tpl + '-' + j);
      var parent = el(n.parent);
      if (!tpl || !parent) return;
      var node = tpl.content.firstElementChild.cloneNode(true);
      var before = n.before ? el(n.before) : null;
      if (before && before.parentNode === parent) parent.insertBefore(node, before); else parent.appendChild(node);
      o.nodes.push(node);
      if (n.float) {
        var f = n.float.path === '' ? node : node.children[+n.float.path];
        // le finestre di dialogo restano centrate come nell'originale: solo i menu seguono il pulsante
        var isDialog = f && (f.matches('[role=dialog],[role=alertdialog]') || f.querySelector(':scope > [role=dialog],:scope > [role=alertdialog]'));
        if (f && !isDialog) o.floats.push({ el: f, dx: n.float.dx, dy: n.float.dy });
      }
    });
    o.saved = it.attrs.map(function (a) {
      var t = el(a[0]); if (!t) return null;
      var prev = t.getAttribute(a[1]);
      if (a[3] === null) t.removeAttribute(a[1]); else t.setAttribute(a[1], a[3]);
      return [t, a[1], prev];
    });
    stack.push(o);
    place(o);
  }

  function closeTop() {
    var o = stack.pop(); if (!o) return;
    o.nodes.forEach(function (n) { n.remove(); });
    o.saved.forEach(function (s) {
      if (!s) return;
      if (s[2] === null) s[0].removeAttribute(s[1]); else s[0].setAttribute(s[1], s[2]);
    });
  }
  function closeTo(level) { while (stack.length > level) closeTop(); }

  // livello (1..n) che contiene il nodo, 0 se fuori da tutti i popup
  function levelOf(target) {
    for (var i = stack.length - 1; i >= 0; i--) {
      if (stack[i].nodes.some(function (n) { return n.contains(target); })) return i + 1;
    }
    return 0;
  }

  function triggerFor(target) {
    var t = target.closest('[data-n]');
    while (t && !byTrigger[t.getAttribute('data-n')]) t = t.parentElement && t.parentElement.closest('[data-n]');
    return t;
  }

  // Aggiorna l'etichetta del pulsante quando si sceglie una voce di un elenco
  function pickOption(o, item) {
    var label = (item.textContent || '').trim();
    if (!label) return;
    var walker = document.createTreeWalker(o.trigger, NodeFilter.SHOW_TEXT, null);
    var tn;
    while ((tn = walker.nextNode())) { if (tn.nodeValue.trim()) { tn.nodeValue = label; return; } }
  }

  // ---------- Pulsanti di azione (Salva, Invia, ...) ----------
  // Nella demo originale questi pulsanti non salvano nulla: qui chiudono il popup
  // e mostrano una notifica di conferma nello stile dell'app.
  var ACTIONS = [
    [/^(salva|salva modifiche|aggiorna|applica|conferma|ok)$/, 'Modifiche salvate'],
    [/^invia/, 'Inviato con successo'],
    [/^(elimina|rimuovi|cancella)/, 'Eliminato'],
    [/^(aggiungi|crea|invita)/, 'Aggiunto con successo'],
    [/^pubblica/, 'Pubblicato'],
    [/^(copia|copia link)/, 'Copiato negli appunti'],
    [/^esporta/, 'Esportazione completata'],
    [/^(genera|rigenera)/, 'Generazione avviata'],
    [/^(scarica|download)/, 'Download avviato'],
    [/^(pulisci|reimposta|reset)$/, '__clear'],
    [/^(annulla|chiudi)$/, '__close']
  ];
  function actionFor(btn) {
    var label = (btn.textContent || btn.getAttribute('aria-label') || btn.title || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!label || label.length > 30) return null;
    for (var i = 0; i < ACTIONS.length; i++) if (ACTIONS[i][0].test(label)) return ACTIONS[i][1];
    return null;
  }

  // contenitore di un elemento: i nodi del popup che lo contiene, oppure la pagina
  function containerOf(node) {
    var l = levelOf(node);
    return l ? stack[l - 1].nodes : [document.querySelector('main') || document.body];
  }
  // Come nell'originale: dopo una modifica il pulsante si attiva solo se tutti i campi
  // di testo del popup/pagina sono compilati (es. Team: nome ed email).
  var TEXT_FIELDS = 'input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=search]):not([type=file]), textarea';
  function visible(el) { var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }
  function enableActions(nodes) {
    var fields = [];
    nodes.forEach(function (root) { fields = fields.concat([].slice.call(root.querySelectorAll(TEXT_FIELDS)).filter(visible)); });
    var ok = fields.every(function (f) { return f.value.trim() !== ''; });
    nodes.forEach(function (root) {
      root.querySelectorAll('button').forEach(function (b) {
        var act = actionFor(b);
        if (!act || act === '__close') return;
        if (!b.hasAttribute('data-clone-was-disabled')) {
          if (!b.disabled) return; // pulsante sempre attivo nell'originale
          b.setAttribute('data-clone-was-disabled', '');
        }
        var on = act === '__clear' ? true : ok; // "Pulisci" basta una modifica
        b.disabled = !on;
        b.setAttribute('aria-disabled', on ? 'false' : 'true');
        b.classList.toggle('opacity-50', !on);
      });
    });
  }
  function clearFields(nodes) {
    nodes.forEach(function (root) {
      root.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]), textarea').forEach(function (f) { f.value = ''; });
    });
  }

  var toastBox = null;
  function toast(msg) {
    if (!toastBox) {
      var st = document.createElement('style');
      st.textContent =
        '.clone-toasts{position:fixed;right:24px;bottom:24px;z-index:2147483000;display:flex;flex-direction:column;gap:8px;pointer-events:none;font-family:inherit}' +
        '.clone-toast{display:flex;align-items:center;gap:8px;width:356px;max-width:calc(100vw - 48px);box-sizing:border-box;padding:16px;border-radius:8px;' +
        'background:#fff;color:#171717;border:1px solid #ededed;box-shadow:0 4px 12px rgba(0,0,0,.1);font-size:13px;font-weight:500;line-height:1.4;' +
        'transform:translateY(16px);opacity:0;transition:transform .35s cubic-bezier(.21,1.02,.73,1),opacity .35s}' +
        '.clone-toast.in{transform:none;opacity:1}.clone-toast svg{flex:none}';
      document.head.appendChild(st);
      toastBox = document.createElement('div');
      toastBox.className = 'clone-toasts';
      toastBox.setAttribute('role', 'status');
      document.body.appendChild(toastBox);
    }
    var t = document.createElement('div');
    t.className = 'clone-toast';
    t.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="#16a34a" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg><span></span>';
    t.querySelector('span').textContent = msg;
    toastBox.appendChild(t);
    requestAnimationFrame(function () { requestAnimationFrame(function () { t.classList.add('in'); }); });
    setTimeout(function () { t.classList.remove('in'); setTimeout(function () { t.remove(); }, 400); }, 3200);
  }

  // ---------- "Visualizza dettagli" (Cronologia, Invia) ----------
  // Nella demo originale il pulsante non fa nulla: qui apre una finestra con i dati della scheda.
  var MSG = {
    'Richiesta rapida': 'Ciao {nome}, grazie per averci scelto! Ci lasceresti una recensione? Bastano 30 secondi: sistemarecensioni.it/r/sistema-recensioni',
    'Promemoria': 'Ciao {nome}, ti scriviamo di nuovo per un piccolo favore: la tua opinione ci aiuta tantissimo. Puoi lasciarla qui: sistemarecensioni.it/r/sistema-recensioni',
    'Campagna': 'Ciao {nome}, è passato un po\' dalla tua ultima visita. Ci racconti com\'è andata? Lascia una recensione qui: sistemarecensioni.it/r/sistema-recensioni',
    'Feedback privato': 'Grazie {nome} per il tuo feedback privato. Lo abbiamo ricevuto e il team ti ricontatterà a breve.'
  };
  function cardOf(btn) {
    var c = btn.parentElement;
    while (c && c.parentElement) {
      var others = [].slice.call(c.parentElement.querySelectorAll('button')).filter(function (b) { return /visualizza dettagli/i.test(label(b)) && b !== btn; });
      if (others.length) return c;
      c = c.parentElement;
    }
    return btn.parentElement;
  }
  function openDetails(btn) {
    var card = cardOf(btn);
    var lines = [].slice.call(card.querySelectorAll('*')).filter(function (e) { return e.childElementCount === 0; })
      .map(function (e) { return label(e); }).filter(function (t) { return t && !/visualizza dettagli/i.test(t) && !/^[A-Z]{2}$/.test(t); });
    var date = lines.filter(function (t) { return /\d{4}|\d{1,2}:\d{2}/.test(t) && !/@|\+\d/.test(t); })[0] || '';
    var contact = lines.filter(function (t) { return /@|\+\d/.test(t); })[0] || '';
    var type = lines.filter(function (t) { return MSG[t]; })[0] || 'Richiesta rapida';
    var name = lines.filter(function (t) { return t !== date && t !== contact && t !== type && /^[A-ZÀ-Ý][a-zà-ÿ']+( [A-ZÀ-Ý'][A-Za-zà-ÿ'\-]+)+$/.test(t); })[0] || 'Cliente';
    // canale dall'icona della scheda: gradiente verde = WhatsApp, blu = Email, verde pieno = SMS
    var h = card.innerHTML.toUpperCase();
    var canale = h.indexOf('#25CF43') > -1 || h.indexOf('#61FD7D') > -1 ? 'WhatsApp'
      : (h.indexOf('#0E61FE') > -1 || /@/.test(contact) ? 'Email' : 'SMS');
    var msg = MSG[type].replace('{nome}', name.split(' ')[0]);
    var ov = document.createElement('div');
    ov.className = 'clone-modal';
    ov.innerHTML =
      '<div class="clone-modal-box" role="dialog" aria-modal="true">' +
      '<div class="clone-modal-head"><div class="clone-modal-title">Dettagli messaggio</div><button type="button" class="clone-modal-x" aria-label="Chiudi">×</button></div>' +
      '<dl class="clone-modal-dl"></dl>' +
      '<div class="clone-modal-label">Messaggio inviato</div><div class="clone-modal-msg"></div>' +
      '<button type="button" class="clone-modal-close">Chiudi</button></div>';
    var dl = ov.querySelector('dl');
    [['Destinatario', name], ['Contatto', contact], ['Canale', canale], ['Tipo', type], ['Data', date], ['Stato', 'Consegnato ✓']].forEach(function (r) {
      if (!r[1]) return;
      var dt = document.createElement('dt'); dt.textContent = r[0];
      var dd = document.createElement('dd'); dd.textContent = r[1];
      dl.appendChild(dt); dl.appendChild(dd);
    });
    ov.querySelector('.clone-modal-msg').textContent = msg;
    if (!document.getElementById('clone-modal-css')) {
      var st = document.createElement('style'); st.id = 'clone-modal-css';
      st.textContent =
        '.clone-modal{position:fixed;inset:0;z-index:2147482000;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit}' +
        '.clone-modal-box{background:#fff;color:#171717;border-radius:12px;width:min(480px,100%);padding:24px;box-shadow:0 20px 50px rgba(0,0,0,.25)}' +
        '.clone-modal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}' +
        '.clone-modal-title{font-size:18px;font-weight:700}' +
        '.clone-modal-x{border:0;background:#f3f4f6;border-radius:999px;width:32px;height:32px;font-size:20px;line-height:1;cursor:pointer}' +
        '.clone-modal-dl{display:grid;grid-template-columns:120px 1fr;gap:8px 12px;margin:0 0 16px;font-size:14px}' +
        '.clone-modal-dl dt{color:#6b7280}.clone-modal-dl dd{margin:0;font-weight:500;word-break:break-word}' +
        '.clone-modal-label{font-size:13px;color:#6b7280;margin-bottom:6px}' +
        '.clone-modal-msg{background:#f6f7f9;border-radius:10px;padding:12px 14px;font-size:14px;line-height:1.5;margin-bottom:20px}' +
        '.clone-modal-close{width:100%;height:40px;border:0;border-radius:8px;background:#000;color:#fff;font-weight:600;font-size:15px;cursor:pointer}';
      document.head.appendChild(st);
    }
    function close() { ov.remove(); document.removeEventListener('keydown', esc, true); }
    function esc(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
    ov.addEventListener('click', function (e) { if (e.target === ov || e.target.closest('.clone-modal-x,.clone-modal-close')) { e.stopPropagation(); close(); } });
    document.addEventListener('keydown', esc, true);
    document.body.appendChild(ov);
  }

  // un campo modificato attiva i pulsanti Salva/Invia del suo popup (o della pagina)
  function onEdit(e) {
    var f = e.target;
    if (f && f.matches && f.matches('input,textarea,select,[contenteditable]')) enableActions(containerOf(f));
  }
  document.addEventListener('input', onEdit, true);
  document.addEventListener('change', onEdit, true);

  // interruttori (switch): cambiano stato al clic
  function toggleSwitch(sw) {
    var on = !(sw.getAttribute('data-state') === 'checked' || sw.getAttribute('aria-checked') === 'true');
    var state = on ? 'checked' : 'unchecked';
    [sw].concat([].slice.call(sw.querySelectorAll('[data-state]'))).forEach(function (n) { n.setAttribute('data-state', state); });
    sw.setAttribute('aria-checked', on ? 'true' : 'false');
    var box = sw.parentElement && sw.parentElement.querySelector('input[type=checkbox]');
    if (box) box.checked = on;
    // Sito web: l'interruttore mostra/nasconde la sezione corrispondente nell'anteprima
    var frame = document.querySelector('iframe[title="Website Preview"]');
    if (frame && frame.contentWindow) {
      var all = [].slice.call(document.querySelectorAll('main [role=switch]'));
      frame.contentWindow.postMessage({ cloneToggle: all.indexOf(sw), on: on }, '*');
    }
    enableActions(containerOf(sw));
  }

  document.addEventListener('click', function (e) {
    var target = e.target;
    var lvl = levelOf(target);
    // schede della pagina (fuori dai popup) -> pagina della scheda
    var tab = target.closest('[role=tab]');
    if (tab && lvl === 0 && NAV.tabs[label(tab)] !== undefined) { e.preventDefault(); go(NAV.tabs[label(tab)]); return; }
    var trig = triggerFor(target);

    var sw = target.closest('[role=switch]');
    // un interruttore che non apre nessun popup cambia solo stato
    if (sw && (!trig || !sw.contains(trig))) { e.preventDefault(); toggleSwitch(sw); return; }

    var btn = target.closest('button,[role=button]');
    if (target.closest('.clone-modal')) return;
    if (btn && lvl === 0 && /^visualizza dettagli$/i.test(label(btn)) && !(trig && trig.contains(btn))) { e.preventDefault(); openDetails(btn); return; }
    var act = btn && !(trig && (trig === btn || btn.contains(trig))) ? actionFor(btn) : null;
    if (act) {
      e.preventDefault();
      if (act === '__clear') { clearFields(containerOf(btn)); enableActions(containerOf(btn)); return; }
      closeTo(lvl ? lvl - 1 : 0);
      if (act !== '__close') toast(act);
      return;
    }
    // un pulsante che apre un menu (anche dentro un popup)
    // pulsanti che nell'originale portano a un'altra pagina
    var navT = target.closest('[data-n]');
    while (navT && !NAV.nav[navT.getAttribute('data-n')]) navT = navT.parentElement && navT.parentElement.closest('[data-n]');
    if (navT && lvl === 0) { e.preventDefault(); go(NAV.nav[navT.getAttribute('data-n')]); return; }

    if (trig && levelOf(trig) === lvl) {
      e.preventDefault();
      var it = byTrigger[trig.getAttribute('data-n')];
      if (it.kind === 'inline') { toggleInline(it); return; }
      if (it.kind === 'swap') { doSwap(it); return; }
      var wasOpen = stack[lvl] && stack[lvl].it === it;
      closeTo(lvl); // chiude i livelli sopra quello cliccato
      if (!wasOpen) show(it, trig);
      return;
    }
    closeTo(lvl);
    if (lvl === 0) return;

    var o = stack[lvl - 1];
    var r = target.getBoundingClientRect();
    var isBackdrop = r.width >= window.innerWidth * 0.9 && r.height >= window.innerHeight * 0.9 &&
      o.nodes.some(function (n) { return n === target || n.parentNode === target.parentNode; });
    if (isBackdrop) { e.preventDefault(); closeTo(lvl - 1); return; }

    var item = target.closest('[role=option],[role=menuitem],[role=menuitemradio],[role=menuitemcheckbox],li,button,a');
    if (item && !item.matches('input,textarea,select') && o.nodes.some(function (n) { return n.contains(item); })) {
      var isOption = item.matches('[role=option],[role=menuitemradio]') || item.closest('[role=listbox]');
      if (isOption) {
        // voce di menu che nell'originale cambia pannello (es. Link recensione)
        var txt = label(item);
        for (var key in NAV.options) { if (txt.indexOf(key) === 0) { e.preventDefault(); if (go(NAV.options[key])) return; } }
      }
      if (isOption) pickOption(o, item);
      if (item.tagName !== 'A') e.preventDefault();
      closeTo(lvl - 1);
      // scegliere una voce conta come modifica del popup/pagina sottostante
      if (isOption) enableActions(containerOf(o.trigger));
    }
  }, true);

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeTop(); });
  function replace() { stack.forEach(function (o) { if (o.floats.length) place(o); }); }
  window.addEventListener('resize', replace);
  document.addEventListener('scroll', replace, true);
})();
