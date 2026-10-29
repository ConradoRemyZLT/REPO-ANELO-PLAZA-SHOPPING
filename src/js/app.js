/* Añelo Plaza Shopping — web v1 · lógica del sitio (sin dependencias salvo Leaflet embebido) */
(function () {
  'use strict';
  var D = JSON.parse(document.getElementById('site-data').textContent);
  var IMG = JSON.parse(document.getElementById('img-db').textContent);
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var html = document.documentElement;

  /* ---------- Idioma ---------- */
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  var q = (location.search.match(/[?&]lang=(es|en)/) || [])[1];
  var lang = q || store('aps-lang') || 'es';
  function t(es, en) { return lang === 'en' ? en : es; }
  function setLang(l) {
    lang = l; html.lang = l; store('aps-lang', l);
    $$('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.lang === l ? 'true' : 'false'); });
    $$('option[data-es]').forEach(function (o) { o.textContent = o.dataset[l]; });
    renderAll();
  }
  $$('.lang button').forEach(function (b) { b.addEventListener('click', function () { setLang(b.dataset.lang); }); });

  /* ---------- Imágenes (base64 una sola vez, carga diferida) ---------- */
  function setImg(img) { var k = img.dataset.img; if (k && IMG[k] && !img.src) img.src = IMG[k]; }
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { setImg(e.target); io.unobserve(e.target); } });
  }, { rootMargin: '600px 0px' }) : null;
  $$('img[data-img]').forEach(function (img) {
    if (img.hasAttribute('data-eager') || !io) setImg(img); else io.observe(img);
  });
  function src(k) { return IMG[k] || ''; }

  /* ---------- Barra ---------- */
  var bar = $('#bar');
  function onScroll() { bar.classList.toggle('solid', window.scrollY > window.innerHeight * 0.6 - 64); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  var drawer = $('#drawer'), burger = $('#burger');
  burger.addEventListener('click', function () {
    var o = drawer.classList.toggle('open'); burger.setAttribute('aria-expanded', o); if (o) bar.classList.add('solid'); else onScroll();
  });
  $$('#drawer a').forEach(function (a) { a.addEventListener('click', function () { drawer.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }); });

  /* ---------- Pantalla de carga (mismo patrón que PIVM) ----------
     Fondo crema, isologotipo APS que "respira" y una línea con el avance real.
     Se va cuando la página cargó (tipografías incluidas) y están decodificadas las imágenes
     de la primera vista (encabezado + ficha del proyecto). Si pasan 25 s sin avance, se muestra igual.
     Con login (gate.js) la carga arranca recién al ingresar, para que suceda detrás de esta pantalla. */
  var PRE = { done: false, cbs: [] };
  function onReady(f) { if (PRE.done) f(); else PRE.cbs.push(f); }
  (function () {
    html.classList.add('js-on');
    var pre = document.getElementById('pre');
    if (!pre) { PRE.done = true; return; }
    html.classList.add('loading');
    if (html.style.visibility === 'hidden') {
      var iv = setInterval(function () {
        var ok = false; try { ok = sessionStorage.getItem('zlt_gate_ok') === '1'; } catch (e) {}
        if (ok) { clearInterval(iv); start(); }
      }, 150);
    } else start();
    function start() {
      var bar = pre.querySelector('.pre-bar i'), parts = {}, shown = 0, last = Date.now(), jobs = [];
      function paint() {
        var tw = 0, acc = 0, k;
        for (k in parts) { tw += parts[k].w; acc += parts[k].w * parts[k].l; }
        shown = Math.max(shown, tw ? acc / tw : 1);
        if (bar) bar.style.width = (3 + shown * 97) + '%';
      }
      function put(k, l) { parts[k].l = l; last = Date.now(); paint(); }
      // 1 · la página y las tipografías
      parts.page = { l: 0, w: 2 };
      jobs.push(new Promise(function (r) { if (document.readyState === 'complete') r(); else addEventListener('load', r); })
        .then(function () { return document.fonts && document.fonts.ready ? document.fonts.ready.catch(function () {}) : null; })
        .then(function () { put('page', 1); }));
      // 2 · imágenes de la primera vista, decodificadas (no solo descargadas)
      var first = $$('#heroMedia img').concat($$('#proyecto .gslide img').slice(0, 2));
      first.forEach(function (img, i) {
        var k = 'img' + i; parts[k] = { l: 0, w: 1 };
        setImg(img);
        var done = function () { put(k, 1); };
        jobs.push((img.decode ? img.decode() : new Promise(function (r) { if (img.complete) r(); else img.onload = img.onerror = r; }))
          .then(done, done));
      });
      paint();
      function finish() {
        if (PRE.done) return;
        PRE.done = true; shown = 1; if (bar) bar.style.width = '100%';
        setTimeout(function () {
          document.body.classList.add('ready'); html.classList.remove('loading');
          PRE.cbs.forEach(function (f) { f(); });
          setTimeout(function () { pre.setAttribute('hidden', ''); }, 900);
        }, 380);
      }
      Promise.all(jobs).then(finish, finish);
      (function guard() { if (PRE.done) return; if (Date.now() - last > 25000) return finish(); setTimeout(guard, 1000); })();
    }
  })();

  /* ---------- Hero slideshow ---------- */
  var hs = $$('#heroMedia img'), hd = $('#heroDots'), hi = 0, ht;
  hs.forEach(function (_, i) {
    var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Imagen ' + (i + 1));
    b.addEventListener('click', function () { heroGo(i, true); }); hd.appendChild(b);
  });
  function heroGo(i, user) {
    hs[hi].classList.remove('on'); hi = (i + hs.length) % hs.length; setImg(hs[hi]); hs[hi].classList.add('on');
    $$('button', hd).forEach(function (b, j) { b.classList.toggle('on', j === hi); });
    if (user) { clearInterval(ht); ht = setInterval(function () { heroGo(hi + 1); }, 6500); }
  }
  hs.forEach(setImg);
  // el slideshow arranca cuando se va la pantalla de carga, así la primera imagen hace su zoom a la vista
  onReady(function () { heroGo(0); ht = setInterval(function () { heroGo(hi + 1); }, 6500); });

  /* ---------- Lightbox ---------- */
  var lb = $('#lb'), lbImg = $('#lbImg'), lbC = $('#lbC'), lbList = [], lbI = 0;
  function lbOpen(list, i) { lbList = list; lbI = i; lbShow(); lb.classList.add('open'); }
  function lbShow() {
    var it = lbList[lbI]; lbImg.src = it.src; lbImg.alt = it.alt || ''; lbImg.classList.toggle('plan', !!it.plan);
    lbC.textContent = lbList.length > 1 ? (lbI + 1) + ' / ' + lbList.length : '';
    $('.lb-p', lb).style.display = $('.lb-n', lb).style.display = lbList.length > 1 ? '' : 'none';
  }
  function lbStep(d) { lbI = (lbI + d + lbList.length) % lbList.length; lbShow(); }
  $('.lb-x', lb).addEventListener('click', function () { lb.classList.remove('open'); });
  $('.lb-p', lb).addEventListener('click', function () { lbStep(-1); });
  $('.lb-n', lb).addEventListener('click', function () { lbStep(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) lb.classList.remove('open'); });
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') lb.classList.remove('open'); if (e.key === 'ArrowLeft') lbStep(-1); if (e.key === 'ArrowRight') lbStep(1);
  });
  function itemsOf(imgs) { return imgs.map(function (im) { return { src: src(im.dataset.img), alt: im.alt }; }); }
  function bindLB(container, sel) {
    var figs = $$(sel, container);
    figs.forEach(function (f, i) {
      f.addEventListener('click', function () {
        var vis = figs.filter(function (x) { return !x.classList.contains('hide'); });
        lbOpen(itemsOf(vis.map(function (x) { return $('img', x); })), Math.max(0, vis.indexOf(f)));
      });
    });
  }

  /* ---------- Galerías (patrón ZLT: gprev / gnext / dots / contador) ---------- */
  var ARW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6l-6 6 6 6"/></svg>';
  $$('[data-gal]').forEach(function (g) {
    var tr = $('.gtrack', g), sl = $$('.gslide', tr), i = 0, n = sl.length;
    var p = document.createElement('button'); p.className = 'gprev'; p.type = 'button'; p.setAttribute('aria-label', 'Anterior'); p.innerHTML = ARW;
    var nx = document.createElement('button'); nx.className = 'gnext'; nx.type = 'button'; nx.setAttribute('aria-label', 'Siguiente'); nx.innerHTML = ARW.replace('M15 6l-6 6 6 6', 'M9 6l6 6-6 6');
    var dots = document.createElement('div'); dots.className = 'gdots';
    var cnt = document.createElement('div'); cnt.className = 'gcount';
    sl.forEach(function (_, j) { var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Imagen ' + (j + 1)); b.addEventListener('click', function () { go(j); }); dots.appendChild(b); });
    g.appendChild(p); g.appendChild(nx); g.appendChild(dots); g.appendChild(cnt);
    function go(j) {
      i = (j + n) % n; tr.style.transform = 'translateX(' + (-100 * i) + '%)';
      [i, (i + 1) % n].forEach(function (k) { setImg($('img', sl[k])); });
      $$('button', dots).forEach(function (b, k) { b.classList.toggle('on', k === i); });
      cnt.textContent = (i + 1) + ' / ' + n;
    }
    p.addEventListener('click', function () { go(i - 1); }); nx.addEventListener('click', function () { go(i + 1); });
    var x0 = null;
    g.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    g.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); x0 = null; });
    sl.forEach(function (s, j) { s.addEventListener('click', function () { lbOpen(itemsOf(sl.map(function (x) { return $('img', x); })), j); }); });
    go(0);
  });
  bindLB($('#mosaic'), 'figure');
  bindLB(document, '[data-lb-single]');

  /* ---------- Datos: contacto ---------- */
  var C = D.contacto;
  function waLink(msg) { return 'https://wa.me/' + C.whatsapp + (msg ? '?text=' + encodeURIComponent(msg) : ''); }
  var ICO = {
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor" ><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>',
    web: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>'
  };
  function telHref(p) { return 'tel:' + p.replace(/[^\d+]/g, ''); }
  function renderContact() {
    var li = C.telefonos.map(function (p) { return '<li><a href="' + telHref(p) + '">' + ICO.phone + p + '</a></li>'; }).join('');
    li += '<li><a href="' + waLink(t('Hola, quiero información sobre Añelo Plaza Shopping.', 'Hi, I would like information about Añelo Plaza Shopping.')) + '" target="_blank" rel="noopener">' + ICO.wa + 'WhatsApp</a></li>';
    li += '<li><a href="mailto:' + C.email + '">' + ICO.mail + C.email + '</a></li>';
    li += '<li><a>' + ICO.web + C.dominio + '</a></li>';
    $('#ctList').innerHTML = li;
    $('#ftList').innerHTML = C.telefonos.map(function (p) { return '<a href="' + telHref(p) + '">' + p + '</a>'; }).join('') + '<a href="mailto:' + C.email + '">' + C.email + '</a>';
    $('#waFloat').href = waLink(t('Hola, quiero información sobre Añelo Plaza Shopping.', 'Hi, I would like information about Añelo Plaza Shopping.'));
  }

  /* ---------- Locales ---------- */
  var SECT = {
    gastro: { es: ['Punto de encuentro gastronómico', 'Cafeterías, gastronomía y comercio cotidiano. Incluye un espacio gastronómico de escala y la mayor circulación del paseo.'],
              en: ['Dining & meeting hub', 'Cafés, dining and everyday retail. Includes a large-format restaurant space and the busiest stretch of the walk.'] },
    servicios: { es: ['Servicios, bienestar y comercio flexible', 'Showrooms, oficinas, bienestar y servicios.'], en: ['Services, wellness & flexible retail', 'Showrooms, offices, wellness and services.'] },
    cercania: { es: ['Comercio de cercanía y servicios', 'Formatos compactos junto al área institucional del Lote 11.'], en: ['Neighborhood retail & services', 'Compact formats next to the institutional area of Lot 11.'] },
    institucional: { es: ['Área institucional y servicios profesionales', 'Incluye una sucursal bancaria de escala: banco, oficinas, seguros y estudios profesionales.'], en: ['Institutional & professional services', 'Includes a large bank branch: banking, offices, insurance and professional firms.'] }
  };
  var TIPOS = [
    { k: ['1A', '1B'], es: ['Compacto', 'Kioscos, accesorios, servicios express'], en: ['Compact', 'Kiosks, accessories, express services'] },
    { k: ['2', '2A', '2B'], es: ['Estándar', 'Indumentaria, calzado, perfumería, óptica, oficinas'], en: ['Standard', 'Apparel, footwear, beauty, optics, offices'] },
    { k: ['3', '3A'], es: ['Amplio', 'Tecnología, electrodomésticos, gimnasio, showroom'], en: ['Large', 'Tech, appliances, gym, showroom'] },
    { k: ['G'], es: ['Gastronómico', 'Cafeterías, restaurantes, terraza en planta alta'], en: ['Dining', 'Cafés, restaurants, upper-floor terrace'] },
    { k: ['B'], es: ['Institucional', 'Sucursal bancaria de escala, en dos niveles'], en: ['Institutional', 'Large bank branch, on two levels'] }
  ];
  function tipoName(k) { return k === 'G' ? t('Gastronómico', 'Dining') : k === 'B' ? t('Banco', 'Bank') : t('Tipo ', 'Type ') + k; }
  function fmt(n) { return String(n).replace('.', lang === 'en' ? '.' : ','); }
  function moduleOf(lote) { var m = D.obra.modulos.filter(function (x) { return x.lote === lote; })[0]; return m; }
  var MES = { es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
  var MESL = { es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'], en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] };
  function ym(s, long) { var p = s.split('-'); return (long ? MESL : MES)[lang][+p[1] - 1] + ' ' + p[0]; }

  var state = { lote: 'all', planta: 'all', tipo: 'all', all: false };
  $('#uMore').addEventListener('click', function () { state.all = true; renderUnits(); });
  function renderLotes() {
    $('#lotes').innerHTML = D.lotes.map(function (l) {
      var s = SECT[l.sector][lang], m = moduleOf(l.lote);
      return '<button type="button" class="lote" data-lote="' + l.lote + '" aria-pressed="' + (String(state.lote) === String(l.lote)) + '">' +
        '<div class="lt"><b>' + t('Lote ', 'Lot ') + l.lote + '</b><span>' + t('Módulo ', 'Module ') + m.modulo + '</span></div>' +
        '<h3>' + s[0] + '</h3><p>' + s[1] + '</p>' +
        '<div class="lm"><span><strong>' + l.locales + '</strong> ' + t('locales', 'units') + '</span><span><strong>' + fmt(l.min) + '–' + fmt(l.max) + '</strong> m²</span></div></button>';
    }).join('');
    $$('#lotes .lote').forEach(function (b) {
      b.addEventListener('click', function () {
        var l = b.dataset.lote; state.lote = state.lote === l ? 'all' : l;
        if (state.lote !== 'all') setPlan(+l <= 4 ? '3-4' : '10-11', null);
        renderLotes(); renderFilters(); renderUnits();
      });
    });
  }
  var plan = { set: '3-4', floor: 'planta-baja' };
  function setPlan(set, floor) {
    if (set) plan.set = set; if (floor) plan.floor = floor;
    $$('#planSet button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.set === plan.set); });
    $$('#planFloor button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.floor === plan.floor); });
    var pic = $('#planPic'); pic.src = src('planos/lotes-' + plan.set + '_' + plan.floor);
    var lots = plan.set.split('-');
    var n = D.unidades.filter(function (u) { return lots.indexOf(String(u.lote)) > -1 && u.planta === (plan.floor === 'planta-baja' ? 'PB' : 'PA'); }).length;
    $('#planCap').textContent = t('Lotes ', 'Lots ') + lots.join(t(' y ', ' & ')) + ' · ' + (plan.floor === 'planta-baja' ? t('Planta baja', 'Ground floor') : t('Planta alta', 'Upper floor')) + ' · ' + n + ' ' + t('locales', 'units') + ' · ' + t('Tocá para ampliar', 'Tap to enlarge');
  }
  $$('#planSet button').forEach(function (b) { b.addEventListener('click', function () { setPlan(b.dataset.set, null); }); });
  $$('#planFloor button').forEach(function (b) { b.addEventListener('click', function () { setPlan(null, b.dataset.floor); }); });
  $('#planImg').addEventListener('click', function () {
    var list = [], start = 0;
    ['3-4', '10-11'].forEach(function (s) { ['planta-baja', 'planta-alta'].forEach(function (f) {
      if (s === plan.set && f === plan.floor) start = list.length;
      list.push({ src: src('planos/lotes-' + s + '_' + f), alt: 'Plano', plan: true });
    }); });
    lbOpen(list, start);
  });

  function renderTipos() {
    $('#tipos').innerHTML = TIPOS.map(function (ti) {
      var n = D.unidades.filter(function (u) { return ti.k.indexOf(u.tipo) > -1; }).length;
      var lots = []; D.unidades.forEach(function (u) { if (ti.k.indexOf(u.tipo) > -1 && lots.indexOf(u.lote) < 0) lots.push(u.lote); });
      var code = ti.k[0] === 'G' ? 'G' : ti.k[0] === 'B' ? t('BCO', 'BNK') : ti.k.join(' · ');
      return '<div class="tipo"><span class="tk">' + code + '</span><div><h4>' + ti[lang][0] + '</h4><p>' + ti[lang][1] + ' · ' + t('Lotes ', 'Lots ') + lots.join(', ') + '</p></div>' +
        '<div class="tc">' + n + '<small>' + t('locales', 'units') + '</small></div></div>';
    }).join('');
  }
  function opt(v, label, cur) { return '<option value="' + v + '"' + (String(cur) === String(v) ? ' selected' : '') + '>' + label + '</option>'; }
  function renderFilters() {
    $('#fLote').innerHTML = opt('all', t('Todos los lotes', 'All lots'), state.lote) + D.lotes.map(function (l) { return opt(l.lote, t('Lote ', 'Lot ') + l.lote, state.lote); }).join('');
    $('#fPlanta').innerHTML = opt('all', t('Ambas plantas', 'Both floors'), state.planta) + opt('PB', t('Planta baja', 'Ground floor'), state.planta) + opt('PA', t('Planta alta', 'Upper floor'), state.planta);
    var tipos = ['1A', '1B', '2', '2A', '2B', '3', '3A', 'G', 'B'];
    $('#fTipo').innerHTML = opt('all', t('Todas las tipologías', 'All types'), state.tipo) + tipos.map(function (k) { return opt(k, tipoName(k), state.tipo); }).join('');
  }
  ['fLote', 'fPlanta', 'fTipo'].forEach(function (id) {
    $('#' + id).addEventListener('change', function (e) {
      state[{ fLote: 'lote', fPlanta: 'planta', fTipo: 'tipo' }[id]] = e.target.value;
      if (id === 'fLote' && e.target.value !== 'all') setPlan(+e.target.value <= 4 ? '3-4' : '10-11', null);
      if (id === 'fPlanta' && e.target.value !== 'all') setPlan(null, e.target.value === 'PB' ? 'planta-baja' : 'planta-alta');
      renderLotes(); renderUnits();
    });
  });
  var EST = { consultar: ['Consultar disponibilidad', 'Ask for availability'], disponible: ['Disponible', 'Available'], reservado: ['Reservado', 'Reserved'], vendido: ['Vendido', 'Sold'], alquilado: ['Alquilado', 'Leased'] };
  function uid(u) { return 'L' + u.lote + '-' + (u.n < 10 ? '0' : '') + u.n; }
  function renderUnits() {
    var list = D.unidades.filter(function (u) {
      return (state.lote === 'all' || String(u.lote) === String(state.lote)) && (state.planta === 'all' || u.planta === state.planta) && (state.tipo === 'all' || u.tipo === state.tipo);
    });
    $('#uCount').textContent = list.length + ' ' + t(list.length === 1 ? 'local' : 'locales', list.length === 1 ? 'unit' : 'units') + (list.length < D.unidades.length ? t(' de ', ' of ') + D.unidades.length : '');
    var LIM = 12, more = $('#uMore'), filtered = state.lote !== 'all' || state.planta !== 'all' || state.tipo !== 'all';
    var shown = (state.all || filtered) ? list : list.slice(0, LIM);
    more.style.display = shown.length >= list.length ? 'none' : '';
    more.innerHTML = t('Ver los ', 'See all ') + list.length + t(' locales', ' units');
    $('#units').innerHTML = shown.map(function (u) {
      var e = EST[u.estado] || EST.consultar, id = uid(u), m = moduleOf(u.lote);
      var msg = t('Hola, quiero consultar por el local ' + id + ' (' + tipoName(u.tipo) + ', ' + (u.planta === 'PB' ? 'planta baja' : 'planta alta') + ') de Añelo Plaza Shopping.',
                  'Hi, I would like to ask about unit ' + id + ' (' + tipoName(u.tipo) + ', ' + (u.planta === 'PB' ? 'ground floor' : 'upper floor') + ') at Añelo Plaza Shopping.');
      return '<article class="unit"><div class="uid">' + id + '</div>' +
        '<div class="umeta">' + tipoName(u.tipo) + ' · ' + (u.planta === 'PB' ? t('Planta baja', 'Ground floor') : t('Planta alta', 'Upper floor')) +
        (u.m2 ? ' · ' + fmt(u.m2) + ' m²' : '') + '<br>' + t('Entrega ', 'Delivery ') + ym(m.entrega) + '</div>' +
        (u.estado === 'consultar' ? '' : '<div class="ust ' + u.estado + '">' + e[lang === 'en' ? 1 : 0] + '</div>') +
        (u.estado === 'vendido' || u.estado === 'alquilado' ? '' : '<a href="' + waLink(msg) + '" target="_blank" rel="noopener" data-unit="' + id + '">' + t('Consultar', 'Enquire') + ' <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>') +
        '</article>';
    }).join('');
    $$('#units a[data-unit]').forEach(function (a) { a.addEventListener('click', function () { $('#fLoc').value = a.dataset.unit; }); });
  }

  /* ---------- Estado de obra ---------- */
  var MEST = { proxima: ['Próxima entrega', 'Next delivery', 'tag-adv'], programada: ['Programada', 'Scheduled', 'tag-opp'], entregada: ['Entregada', 'Delivered', 'tag-done'], ejecucion: ['En ejecución', 'In progress', 'tag-adv'] };
  function renderObra() {
    $('#timeline').innerHTML = D.obra.modulos.map(function (m) {
      var e = MEST[m.estado] || MEST.programada;
      var tag = e[2] === 'tag-opp' ? '<span class="tag tag-opp" style="color:#8CC0DC">' : '<span class="tag ' + e[2] + '"' + (e[2] === 'tag-adv' ? ' style="color:#B9C6CD"' : '') + '>';
      return '<div class="tl ' + m.estado + ' rv in"><div class="tm">' + t('Módulo ', 'Module ') + m.modulo + '</div><h4>' + t('Lote ', 'Lot ') + m.lote + '</h4>' +
        '<div class="td">' + t('Entrega ', 'Delivery ') + ym(m.entrega, true) + '</div>' + tag + e[lang === 'en' ? 1 : 0] + '</span></div>';
    }).join('');
    $('#obraUpd').textContent = t('Última actualización: ', 'Last update: ') + ym(D.obra.actualizado, true);
    var figs = $$('#obraGrid figure'), dates = [];
    figs.forEach(function (f) { if (dates.indexOf(f.dataset.date) < 0) dates.push(f.dataset.date); });
    dates.sort().reverse();
    if (!$('#obraTabs').dataset.cur) $('#obraTabs').dataset.cur = dates[0];
    var cur = $('#obraTabs').dataset.cur;
    $('#obraTabs').innerHTML = '<button type="button" data-d="all" aria-pressed="' + (cur === 'all') + '">' + t('Todas', 'All') + '</button>' +
      dates.map(function (d) { var p = d.split('-'); return '<button type="button" data-d="' + d + '" aria-pressed="' + (cur === d) + '">' + (+p[2]) + ' ' + MES[lang][+p[1] - 1] + ' ' + p[0] + '</button>'; }).join('');
    $$('#obraTabs button').forEach(function (b) { b.addEventListener('click', function () { $('#obraTabs').dataset.cur = b.dataset.d; filterObra(); renderObra(); }); });
    filterObra();
  }
  function filterObra() {
    var cur = $('#obraTabs').dataset.cur || 'all';
    $$('#obraGrid figure').forEach(function (f) { var h = cur !== 'all' && f.dataset.date !== cur; f.classList.toggle('hide', h); if (!h) setImg($('img', f)); });
  }
  bindLB($('#obraGrid'), 'figure');

  /* ---------- Mapa (Leaflet embebido · Esri con fallback OSM) ---------- */
  var mapEl = $('#map');
  function initMap() {
    if (!window.L) return;
    var U = D.ubicacion, ll = [U.lat, U.lng];
    var Z = U.zoom || 17;
    var map = L.map('map', { scrollWheelZoom: false, zoomControl: true, attributionControl: true }).setView(ll, Z);
    // Si el contenedor cambia de tamaño (login, layout, rotación), Leaflet debe recalcular y volver a centrar el pin
    var recenter = function () { map.invalidateSize({ pan: false }); map.setView(ll, map.getZoom(), { animate: false }); };
    if ('ResizeObserver' in window) { var rz = 0; new ResizeObserver(function () { if (rz++) recenter(); }).observe(mapEl); }
    setTimeout(recenter, 250);
    var esri = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Tiles © Esri' });
    var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' });
    var errs = 0; esri.on('tileerror', function () { if (++errs === 3) { map.removeLayer(esri); osm.addTo(map); } });
    esri.addTo(map);
    var pin = L.divIcon({ className: '', html: '<div class="aps-pin">' + document.getElementById('pinLeaf').innerHTML + '</div>', iconSize: [40, 40], iconAnchor: [20, 20] });
    L.marker(ll, { icon: pin }).addTo(map).bindPopup('<b>Añelo Plaza Shopping</b><br>Añelo, Neuquén' + (U.aproximada ? '<br><i>' + t('Ubicación aproximada', 'Approximate location') + '</i>' : ''));
    window.__apsMap = map;
  }
  if ('IntersectionObserver' in window) {
    var mo = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { initMap(); mo.disconnect(); } }, { rootMargin: '400px 0px' });
    mo.observe(mapEl);
  } else initMap();
  $('#gmaps').href = 'https://www.google.com/maps/dir/?api=1&destination=' + D.ubicacion.lat + ',' + D.ubicacion.lng;

  /* ---------- Brochure (PDF embebido) ---------- */
  (function () {
    var el = document.getElementById('bro-b64'), b64 = el.textContent.trim(), url = null;
    function blobUrl() {
      if (url) return url;
      var bin = atob(b64), n = bin.length, u8 = new Uint8Array(n);
      for (var i = 0; i < n; i++) u8[i] = bin.charCodeAt(i);
      url = URL.createObjectURL(new Blob([u8], { type: 'application/pdf' })); return url;
    }
    ['broDl', 'broView'].forEach(function (id) {
      var a = $('#' + id);
      a.href = '#brochure';
      a.addEventListener('click', function (e) { if (!b64) return; a.href = blobUrl(); });
    });
  })();

  /* ---------- Formulario ---------- */
  var form = $('#ctForm'), out = $('#fMsgOut');
  function formMsg() {
    var f = form.elements, intr = f.interes.options[f.interes.selectedIndex].textContent;
    return [t('Hola, quiero información sobre Añelo Plaza Shopping.', 'Hi, I would like information about Añelo Plaza Shopping.'),
      t('Nombre: ', 'Name: ') + f.nombre.value, t('Teléfono: ', 'Phone: ') + f.telefono.value, 'Email: ' + f.email.value,
      f.empresa.value ? t('Empresa/rubro: ', 'Company: ') + f.empresa.value : '', t('Interés: ', 'Interest: ') + intr,
      f.local.value ? t('Local: ', 'Unit: ') + f.local.value : '', f.mensaje.value].filter(Boolean).join('\n');
  }
  function valid() {
    var f = form.elements, ok = f.nombre.value.trim() && f.telefono.value.trim() && /\S+@\S+\.\S+/.test(f.email.value);
    out.className = 'f-msg' + (ok ? '' : ' err');
    out.textContent = ok ? '' : t('Completá nombre, teléfono y un email válido.', 'Please fill in name, phone and a valid email.');
    return ok;
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault(); if (!valid()) return;
    window.open(waLink(formMsg()), '_blank', 'noopener');
    out.textContent = t('Abrimos WhatsApp con tu consulta. ¡Gracias!', 'We opened WhatsApp with your enquiry. Thank you!');
  });
  $('#ctMail').addEventListener('click', function () {
    if (!valid()) return;
    location.href = 'mailto:' + C.email + '?subject=' + encodeURIComponent('Consulta web · Añelo Plaza Shopping') + '&body=' + encodeURIComponent(formMsg());
  });

  /* ---------- Reveal ---------- */
  var rv = $$('.rv');
  if ('IntersectionObserver' in window) {
    var ro = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    rv.forEach(function (el) { ro.observe(el); });
  } else rv.forEach(function (el) { el.classList.add('in'); });

  function renderAll() { renderContact(); renderLotes(); setPlan(null, null); renderTipos(); renderFilters(); renderUnits(); renderObra(); }
  setLang(lang);
  requestAnimationFrame(function () { requestAnimationFrame(function () { document.body.classList.remove('no-anim'); }); });
})();
