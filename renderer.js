const $ = (id) => document.getElementById(id);
let watching = false;
let cfg = {};
let sessionRenamed = 0;
let lang = 'en';

// ---- i18n ----
const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k;
function applyLang(l) {
  lang = I18N[l] ? l : 'en';
  const rtl = lang === 'fa';
  document.documentElement.lang = lang;
  document.documentElement.dir = rtl ? 'rtl' : 'ltr';
  document.body.classList.toggle('rtl', rtl);
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  $('langLabel').textContent = rtl ? 'EN' : 'FA';
  // live-state strings that depend on watching
  $('status').textContent = watching ? t('live') : t('idle');
  $('showcaseLiveText').textContent = watching ? t('liveShort') : t('idleShort');
  $('toggleLabel').textContent = watching ? t('watching') : t('startWatching');
  preview();
  positionPill(); positionSegPill();
}

// ---- cursor-follow spotlight ----
const spot = $('spotlight');
let spotTimer = null;
window.addEventListener('pointermove', (e) => {
  spot.style.setProperty('--mx', e.clientX + 'px');
  spot.style.setProperty('--my', e.clientY + 'px');
  spot.classList.add('on');
  clearTimeout(spotTimer);
  spotTimer = setTimeout(() => spot.classList.remove('on'), 2500);
});

// ---- window controls ----
$('min').onclick = () => window.api.winMin();
$('max').onclick = () => window.api.winMax();
$('close').onclick = () => window.api.winClose();

// ---- tabs ----
const tabs = [...document.querySelectorAll('.tab')];
const panels = [...document.querySelectorAll('.panel')];
let activeTab = 0;
let unread = 0;

function positionPill() {
  const t = tabs[activeTab];
  $('tabPill').style.width = t.offsetWidth + 'px';
  $('tabPill').style.transform = `translateX(${t.offsetLeft - 6}px)`;
}
function switchTab(i) {
  if (i === activeTab) return;
  activeTab = i;
  tabs.forEach((t, k) => {
    t.classList.toggle('active', k === i);
    t.setAttribute('aria-selected', k === i ? 'true' : 'false');
  });
  panels.forEach((p, k) => {
    p.classList.remove('leave-left');
    if (k === i) p.classList.add('active');
    else { if (k < i) p.classList.add('leave-left'); p.classList.remove('active'); }
  });
  positionPill();
  if (i === 2) { unread = 0; updateBadge(); }
  if (i === 1) refreshSeq();
}
tabs.forEach((t, i) => (t.onclick = () => switchTab(i)));
window.addEventListener('resize', positionPill);

function updateBadge() { $('logBadge').classList.toggle('show', unread > 0); }

// ---- pattern chips ----
document.querySelectorAll('.chip').forEach((c) => {
  c.onclick = () => {
    const inp = $('pattern');
    const t = c.dataset.token;
    const s = inp.selectionStart ?? inp.value.length;
    const e = inp.selectionEnd ?? inp.value.length;
    inp.value = inp.value.slice(0, s) + t + inp.value.slice(e);
    inp.focus();
    inp.setSelectionRange(s + t.length, s + t.length);
    saveAll();
  };
});

// ---- persistence ----
function collect() {
  return {
    pattern: $('pattern').value,
    mode: cfg.mode,
    x: $('xVal').value,
    y: $('yVal').value,
    fixedY: $('fixedY').value,
    partsPerEp: $('partsPerEp').value,
    xPad: $('xPad').value,
    yPad: $('yPad').value,
  };
}
async function saveAll() {
  cfg = await window.api.saveConfig(collect());
  preview();
  refreshSeq();
}

['pattern', 'xVal', 'yVal', 'fixedY', 'partsPerEp', 'xPad', 'yPad'].forEach((id) => {
  $(id).oninput = saveAll;
});

// ---- mode segmented control ----
function applyModeUI() {
  const nested = cfg.mode === 'nested';
  document.querySelectorAll('.nested-only').forEach((el) => (el.hidden = !nested));
  document.querySelectorAll('.single-only').forEach((el) => (el.hidden = nested));
  document.querySelectorAll('.seg-opt').forEach((b) => b.classList.toggle('active', b.dataset.mode === cfg.mode));
  positionSegPill();
}
function positionSegPill() {
  const active = document.querySelector('.seg-opt.active');
  if (!active) return;
  $('segPill').style.width = active.offsetWidth + 'px';
  $('segPill').style.transform = `translateX(${active.offsetLeft - 5}px)`;
}
document.querySelectorAll('.seg-opt').forEach((b) => {
  b.onclick = async () => {
    cfg.mode = b.dataset.mode;
    applyModeUI();
    await saveAll();
  };
});

// ---- pad helper (mirror of main.js) ----
const pad = (n, w) => String(n).padStart(Math.max(1, +w || 1), '0');

function preview() {
  const y = cfg.mode === 'single' ? cfg.fixedY : cfg.y;
  const name = (cfg.pattern || '')
    .replace(/\{x\}/g, pad(cfg.x, cfg.xPad))
    .replace(/\{y\}/g, pad(y, cfg.yPad));
  const el = $('preview');
  const next = name + '.mkv';
  if (el.textContent !== next) {
    el.textContent = next;
    el.classList.remove('flip'); void el.offsetWidth; el.classList.add('flip');
  }
  if ($('mX')) $('mX').textContent = pad(cfg.x, cfg.xPad);
  if ($('mY')) $('mY').textContent = pad(y, cfg.yPad);
  if ($('mMode')) $('mMode').textContent = cfg.mode === 'nested' ? t('metaNest') : t('metaSeq');
  if ($('statNext')) $('statNext').textContent = pad(cfg.x, cfg.xPad);
}

// ---- toast ----
let toastTimer = null;
function showToast(name) {
  const t = $('toast');
  $('toastName').textContent = name;
  t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

async function refreshSeq() {
  const seq = $('seq');
  if (!seq) return;
  const list = await window.api.previewSeq(6);
  seq.innerHTML = '';
  list.forEach((n, i) => {
    const d = document.createElement('div');
    d.className = 'seq-item';
    d.style.animationDelay = (i * 40) + 'ms';
    d.innerHTML = `<span class="seq-i">${i + 1}</span><span class="seq-n">${n}.mkv</span>`;
    seq.appendChild(d);
  });
}

// ---- init ----
async function init() {
  cfg = await window.api.getConfig();
  $('folder').value = cfg.folder || '';
  $('pattern').value = cfg.pattern;
  $('xVal').value = cfg.x;
  $('yVal').value = cfg.y;
  $('fixedY').value = cfg.fixedY;
  $('partsPerEp').value = cfg.partsPerEp;
  $('xPad').value = cfg.xPad;
  $('yPad').value = cfg.yPad;
  applyModeUI();
  applyLang(cfg.lang || 'en');
  preview();
  refreshSeq();
  if (!$('log').children.length) addLog(t('noActivity'), 'empty');
}

$('langBtn').onclick = async () => {
  applyLang(lang === 'fa' ? 'en' : 'fa');
  // refresh empty-log placeholder text if present
  const empty = $('log').querySelector('.empty');
  if (empty) empty.textContent = t('noActivity');
  cfg = await window.api.saveConfig({ lang });
};

$('pick').onclick = async () => { $('folder').value = await window.api.pickFolder(); };

$('resetCounter').onclick = async () => {
  const c = await window.api.resetCounter();
  cfg.x = c.x; cfg.y = c.y;
  $('xVal').value = c.x; $('yVal').value = c.y;
  bumpCounter();
  preview();
  refreshSeq();
};

$('clearLog').onclick = () => { $('log').innerHTML = ''; addLog(t('noActivity'), 'empty'); };

async function toggleWatch() {
  const btn = $('toggle');
  if (!watching) {
    await saveAll();
    const ok = await window.api.startWatch();
    if (ok) {
      watching = true;
      btn.classList.add('on');
      btn.setAttribute('aria-checked', 'true');
      $('orb').classList.add('live');
      $('toggleLabel').textContent = t('watching');
      $('statePill').classList.add('live');
      $('status').textContent = t('live');
      $('showcaseLive').classList.add('on');
      $('showcaseLiveText').textContent = t('liveShort');
    }
  } else {
    await window.api.stopWatch();
    watching = false;
    btn.classList.remove('on');
    btn.setAttribute('aria-checked', 'false');
    $('orb').classList.remove('live');
    $('toggleLabel').textContent = t('startWatching');
    $('statePill').classList.remove('live');
    $('status').textContent = t('idle');
    $('showcaseLive').classList.remove('on');
    $('showcaseLiveText').textContent = t('idleShort');
  }
}
$('toggle').onclick = toggleWatch;
$('toggle').onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleWatch(); } };

function bumpCounter() {
  const el = $('xVal');
  el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
}

function addLog(msg, cls) {
  const log = $('log');
  const empty = log.querySelector('.empty');
  if (empty) empty.remove();
  const d = document.createElement('div');
  d.className = 'line' + (cls ? ' ' + cls : '');
  d.textContent = msg;
  log.appendChild(d);
  log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
  if (cls !== 'empty' && activeTab !== 2) { unread++; updateBadge(); }
}

window.api.onLog((m) => {
  const c = /error|invalid/i.test(m) ? 'err' : /renamed|→/.test(m) ? 'ok' : '';
  addLog(m, c);
});
window.api.onCounter((c) => {
  cfg.x = c.x; cfg.y = c.y;
  $('xVal').value = c.x; $('yVal').value = c.y;
  bumpCounter(); preview(); refreshSeq();
  if (c.to) showToast(c.to);
  if (typeof c.session === 'number') {
    sessionRenamed = c.session;
    const s = $('statRenamed');
    s.textContent = sessionRenamed;
    s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump');
  }
});

init();
positionPill();
