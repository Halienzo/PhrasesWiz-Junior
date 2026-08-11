// ===== hub-core.js — 全局状态 + 路由 + 公共工具 =====
// 无畏无瑕 Hub — Fearless & Flawless
// SPA 路由: hub → mole / fission / phrases

// ---------- 全局应用状态 ----------
const HUB = {
  // 当前视图: 'hub' | 'mole' | 'fission' | 'phrases'
  view: 'hub',

  // Find the Mole 状态
  mole: {
    batchId: 1,
    mode: 'instant',     // 'instant' | 'exam'
    answers: {},         // { qNo: 'A' }
    submitted: false,    // 考试模式是否已交卷
    showAnswer: {},      // 即时模式每题是否已作答 { qNo: true }
  },

  // Word Fission Mission 状态
  fission: {
    batchId: 1,
    mode: 'instant',     // 'instant' | 'exam'
    answers: {},         // { qNo: 'typed_value' }
    submitted: false,
    showAnswer: {},      // { qNo: true }
  },
};

// ---------- 进度存储 ----------
const PROGRESS_KEYS = {
  mole: 'ftm_progress_v1',
  fission: 'wfm_progress_v1',
};

function loadHubProgress(key) {
  try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { return {}; }
}
function saveHubProgress(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

// ---------- DOM 快捷引用 ----------
function $(id) { return document.getElementById(id); }

// ---------- 公共工具函数 ----------
const RE_ELL = /…/g;
const RE_DOTS = /\.{2,}/g;
const RE_WS = /\s+/g;

function normalize(s) {
  return (s || '').toString().trim().toLowerCase()
    .replace(RE_ELL, '...').replace(RE_DOTS, '...').replace(RE_WS, ' ');
}

function esc(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 检查词形填空答案（不区分大小写，空格容错）
function checkFillAnswer(input, answer) {
  const ni = normalize(input);
  if (!ni || !answer) return false;
  const na = normalize(answer);
  return ni === na;
}

// 获取数据引用（由 build.js 内嵌到全局变量）
function getPosData() { return window.POS_DATA; }
function getMcData() { return window.MC_DATA; }

function getMoleBatch(id) { return getMcData().batches.find(b => b.id === id); }
function getFissionBatch(id) { return getPosData().batches.find(b => b.id === id); }

// ---------- 顶栏渲染 ----------
function renderTopBar() {
  const bar = $('topBar');
  if (!bar) return;
  if (HUB.view === 'hub') {
    bar.className = 'topbar topbar-hub';
    bar.innerHTML = '<span class="topbar-brand-mini">无畏无瑕</span><span class="topbar-spacer"></span><button class="icon-btn" id="themeBtn" title="深色模式">🌙</button>';
  } else {
    const themes = {
      mole: 'topbar-mole',
      fission: 'topbar-fission',
      phrases: 'topbar-phrases',
    };
    const icons = { mole: '🕵️', fission: '⚛️', phrases: '✨' };
    const titles = {
      mole: 'Find the Mole · 单刀营救',
      fission: 'Word Fission Mission · 词性裂变',
      phrases: 'PhrasesWiz Junior · 短语精灵',
    };
    bar.className = 'topbar ' + (themes[HUB.view] || 'topbar-phrases');
    let html = '<button class="btn-back" id="btnBackHub">← Hub</button>';
    html += '<span class="topbar-title">' + (icons[HUB.view] || '') + ' ' + (titles[HUB.view] || '') + '</span>';
    html += '<span class="topbar-spacer"></span>';

    if (HUB.view === 'mole' || HUB.view === 'fission') {
      const data = HUB.view === 'mole' ? getMcData() : getPosData();
      const state = HUB.view === 'mole' ? HUB.mole : HUB.fission;
      html += '<div class="batch-tabs">';
      data.batches.forEach(b => {
        html += '<button class="batch-tab' + (b.id === state.batchId ? ' active' : '') + '" data-batch="' + b.id + '">' + b.shortTitle + '</button>';
      });
      html += '</div><span class="topbar-spacer"></span>';
      html += '<button class="btn-mode' + (state.mode === 'instant' ? ' active' : '') + '" data-hubmode="instant">⚡ 即时</button>';
      html += '<button class="btn-mode' + (state.mode === 'exam' ? ' active' : '') + '" data-hubmode="exam">📝 考试</button>';
    }

    html += '<button class="icon-btn" id="themeBtn" title="深色模式">🌙</button>';
    bar.innerHTML = html;
  }
  syncThemeBtn();
}

function syncThemeBtn() {
  const btn = $('themeBtn');
  if (btn) {
    const cur = document.documentElement.getAttribute('data-theme');
    btn.textContent = cur === 'dark' ? '☀️' : '🌙';
  }
}

// ---------- 主内容路由 ----------
function renderMain() {
  renderTopBar();
  const main = $('mainContent');
  if (!main) return;
  switch (HUB.view) {
    case 'hub': main.innerHTML = renderHub(); break;
    case 'mole': main.innerHTML = renderMole(); break;
    case 'fission': main.innerHTML = renderFission(); break;
    case 'phrases': renderPhrasesView(); return;
  }
  bindMainEvents();
}

// ===== 全局 click 事件委托 =====
document.addEventListener('click', e => {
  const t = e.target.closest('button, .hub-card');
  if (!t) return;

  // Hub 卡片 → 进入板块
  if (t.classList.contains('hub-card')) {
    HUB.view = t.dataset.view;
    renderMain();
    return;
  }

  // 返回 Hub
  if (t.id === 'btnBackHub' || t.classList.contains('btn-back')) {
    HUB.view = 'hub';
    renderMain();
    return;
  }

  // 批次切换
  if (t.classList.contains('batch-tab')) {
    const batchId = parseInt(t.dataset.batch, 10);
    if (HUB.view === 'mole') { HUB.mole.batchId = batchId; HUB.mole.answers = {}; HUB.mole.showAnswer = {}; HUB.mole.submitted = false; }
    if (HUB.view === 'fission') { HUB.fission.batchId = batchId; HUB.fission.answers = {}; HUB.fission.showAnswer = {}; HUB.fission.submitted = false; }
    renderMain();
    return;
  }

  // 模式切换
  if (t.classList.contains('btn-mode')) {
    const mode = t.dataset.hubmode;
    if (HUB.view === 'mole') { HUB.mole.mode = mode; HUB.mole.answers = {}; HUB.mole.showAnswer = {}; HUB.mole.submitted = false; }
    if (HUB.view === 'fission') { HUB.fission.mode = mode; HUB.fission.answers = {}; HUB.fission.showAnswer = {}; HUB.fission.submitted = false; }
    renderMain();
    return;
  }

  // Mole 选项点击
  if (t.classList.contains('mole-opt')) {
    handleMoleOption(t);
    return;
  }

  // Mole 交卷
  if (t.classList.contains('btn-mole-submit')) {
    handleMoleSubmit();
    return;
  }

  // Fission 交卷
  if (t.classList.contains('btn-fission-submit')) {
    handleFissionSubmit();
    return;
  }

  // 主题切换
  if (t.id === 'themeBtn') {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('vp79_theme', next);
    syncThemeBtn();
    return;
  }
});

// ===== Fission 输入事件（change + focusout 触发即时判定）=====
document.addEventListener('change', e => {
  if (HUB.view !== 'fission') return;
  if (!e.target.classList.contains('fission-input')) return;
  if (HUB.fission.mode !== 'instant') return;
  const qNo = parseInt(e.target.dataset.qno, 10);
  handleFissionCheck(qNo, e.target.value);
});

document.addEventListener('focusout', e => {
  if (HUB.view !== 'fission') return;
  if (!e.target.classList.contains('fission-input')) return;
  if (HUB.fission.mode !== 'instant') return;
  const qNo = parseInt(e.target.dataset.qno, 10);
  handleFissionCheck(qNo, e.target.value);
});

// ===== 主题初始化 =====
(function() {
  const savedTheme = localStorage.getItem('vp79_theme');
  if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
})();

// ===== 初始渲染（由 app.js 拼接后控制，此处不自动调用）=====
// renderMain() will be called after all JS modules are loaded
