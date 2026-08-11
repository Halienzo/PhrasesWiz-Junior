# 无畏无瑕 Hub 三板块架构 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 `index.html`（PhrasesWiz Junior 单板块）升级为包含 Hub 首页 + 三大板块（Find the Mole / Word Fission Mission / PhrasesWiz Junior）的 SPA 单文件 HTML 系统。

**Architecture:** `build.js` 解析三个数据源 (verb phrases 7-9.txt, pos.txt, mc.txt) → 结构化 JSON → 嵌入 `index.html`。前端通过 `STATE.view` 在 hub/mole/fission/phrases 四个视图间切换，事件通过顶层委托分发。

**Tech Stack:** Vanilla JS + CSS（零依赖），Node.js 构建脚本，localStorage 进度持久化。

---

## 文件清单

| 文件 | 操作 | 说明 |
|---|---|---|
| `build.js` | 修改 | 扩展为三步解析流水线，备份原文件 |
| `template.js` | 重写 | Hub 骨架 HTML/CSS |
| `src/hub-core.js` | 新建 | 全局 STATE + 路由调度 + 公共工具函数 |
| `src/hub-home.js` | 新建 | Hub 首页渲染（品牌区 + 三卡片） |
| `src/hub-mole.js` | 新建 | Find the Mole 板块（选择题 UI + 交互） |
| `src/hub-fission.js` | 新建 | Word Fission Mission 板块（填空题 UI + 交互） |
| `app.js` | 修改 | 适配 Hub 嵌入，增加 phrases 视图入口 |
| `index.html` | 覆盖 | 构建产出（原文件备份为 `index_backup.html`） |
| `cn-mapping.js` | 不变 | 中文对应词映射 |
| `pitfalls-data.json` | 不变 | 考点辨析数据 |
| `data.json` | 不变 | 短语解析结果（构建时重新生成） |

---

### Task 1: 备份原文件 + 创建 `src/` 目录

**Files:**
- Create: `src/` 目录
- Backup: `index.html` → `index_backup.html`
- Backup: `build.js` → `build_backup.js`

- [ ] **Step 1: 备份并创建目录**

```bash
cp index.html index_backup.html
cp build.js build_backup.js
mkdir -p src
```

- [ ] **Step 2: 提交**

```bash
git add index_backup.html build_backup.js
git commit -m "chore: backup originals before Hub upgrade"
```

---

### Task 2: 扩展 build.js — 解析 pos.txt

**Files:**
- Modify: `build.js` — 在现有解析逻辑之后，phrase 解析之前，添加 pos.txt 解析函数

- [ ] **Step 1: 在 build.js 顶部区域（require 之后、SEMESTERS 定义之前）插入解析函数**

在 `const CN_MAPPING = require('./cn-mapping');` 之后插入：

```js
// ===== pos.txt 解析器 =====
function parsePosTxt(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const text = raw.replace(/\r\n?/g, '\n');
  const batches = [];

  // 按 "专项训练（N）" 拆分
  const batchRegex = /云南省中考单句词形填空专项训练（(\d+)）([\s\S]*?)(?=云南省中考单句词形填空专项训练（\d+）|$)/g;
  let bm;
  while ((bm = batchRegex.exec(text)) !== null) {
    const batchId = parseInt(bm[1], 10);
    const block = bm[2].trim();

    // 提取考点描述
    const descMatch = block.match(/考点设置[参考：:\s]*([\s\S]*?)(?=\d+\.\s)/);
    const description = descMatch ? descMatch[1].trim().replace(/\n+/g, ' ') : '';

    // 提取题目: \d+\. 句子 (hint)
    const questions = [];
    const qRegex = /(\d+)\.\s+(.+?)\((\w+)\)/g;
    let qm;
    while ((qm = qRegex.exec(block)) !== null) {
      questions.push({
        no: parseInt(qm[1], 10),
        sentence: qm[2].trim().replace(/\s+/g, ' '),
        hint: qm[3].trim(),
      });
    }

    // 提取答案块
    const ansBlockMatch = block.match(/答案[：:\s]*([\s\S]*?)$/);
    const ansBlock = ansBlockMatch ? ansBlockMatch[1] : '';
    // 匹配 "1. relaxing" 或 "1.relaxing"
    const ansRegex = /(\d+)[.\s、]+(\S+)/g;
    const ansMap = {};
    let am;
    while ((am = ansRegex.exec(ansBlock)) !== null) {
      ansMap[parseInt(am[1], 10)] = am[2].trim();
    }

    // 组装
    const qs = questions.map(q => ({
      ...q,
      answer: ansMap[q.no] || '',
    }));

    // 考点归类（从 description 提取）
    const catMap = parsePosCategories(description);
    qs.forEach(q => {
      q.category = catMap[q.no] || '';
    });

    batches.push({
      id: batchId,
      title: `云南省中考单句词形填空专项训练（${batchId}）`,
      shortTitle: `训练${batchId}`,
      description,
      questions: qs,
      count: qs.length,
    });
  }

  return {
    batches,
    totalQuestions: batches.reduce((s, b) => s + b.count, 0),
    batchCount: batches.length,
  };
}

// 从考点描述解析各题考点归类
function parsePosCategories(desc) {
  const map = {};
  // 匹配 "1-5. 词性转换（动词-形容词）" 等
  const re = /(\d+)-(\d+)[.\s、]+(.+?)(?=\d+-\d+|\s*$)/g;
  let m;
  while ((m = re.exec(desc)) !== null) {
    const start = parseInt(m[1], 10);
    const end = parseInt(m[2], 10);
    const cat = m[3].trim();
    for (let i = start; i <= end; i++) {
      map[i] = cat;
    }
  }
  return map;
}
```

- [ ] **Step 2: 在 build.js 主流程中调用解析器**

在 `const data = { semesters: [], meta: {} };` 之前添加：

```js
// 解析 pos.txt
const posData = parsePosTxt(path.join(__dirname, 'pos.txt'));
console.log('=== pos.txt 解析报告 ===');
console.log('批次数:', posData.batchCount, '(预期 4)');
console.log('题目总数:', posData.totalQuestions, '(预期 100)');
posData.batches.forEach(b => {
  console.log(`  [训练${b.id}] ${b.title}: ${b.count} 题`);
  const missingAns = b.questions.filter(q => !q.answer);
  if (missingAns.length) console.log(`    ⚠ 无答案题号: ${missingAns.map(q => q.no).join(', ')}`);
});
```

- [ ] **Step 3: 验证解析 — 先只跑 pos 解析确认数据正确**

```bash
node -e "
const fs = require('fs');
const path = require('path');
// 临时内联 parsePosTxt 函数运行测试
" 2>&1 | head -20
```

改为直接运行完整 build.js 看 pos 部分输出：

```bash
cd E:\Verb_Phrases_7-9 && node build.js 2>&1 | head -30
```

Expected: 批次 4，题目 100，无缺失答案。

- [ ] **Step 4: 提交**

```bash
git add build.js
git commit -m "feat(build): add pos.txt parser for Word Fission Mission"
```

---

### Task 3: 扩展 build.js — 解析 mc.txt

**Files:**
- Modify: `build.js` — 在 pos 解析器之后添加 mc.txt 解析函数

- [ ] **Step 1: 在 build.js 中 pos 解析函数之后插入 mc 解析函数**

```js
// ===== mc.txt 解析器 =====
function parseMcTxt(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const text = raw.replace(/\r\n?/g, '\n');
  const batches = [];

  // 按 "专项训练（N）" 拆分
  const batchRegex = /云南省中考单选专项训练（(\d+)）([\s\S]*?)(?=云南省中考单选专项训练（\d+）|$)/g;
  let bm;
  while ((bm = batchRegex.exec(text)) !== null) {
    const batchId = parseInt(bm[1], 10);
    let block = bm[2].trim();

    // 提取考点描述
    const descMatch = block.match(/考点[分布设置参考]*[：:\s]*([\s\S]*?)(?=\d+\.\s)/);
    const description = descMatch ? descMatch[1].trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ') : '';

    // 提取题目：按题号分割
    const questions = [];
    // 先把 block 按 "N. " 模式分割（题号+点+空格）
    const qParts = block.split(/\n(?=\d+\.\s)/);
    for (const part of qParts) {
      const qMatch = part.match(/^(\d+)\.\s+([\s\S]*?)(?=\n\s*(?:[A-D][.\s])|$)/);
      if (!qMatch) continue;
      const no = parseInt(qMatch[1], 10);
      let stemBody = qMatch[2].trim();

      // 提取选项 A. ... B. ... C. ... D. ...
      const options = [];
      const optRegex = /\n?\s*([A-D])[.\s]\s*([\s\S]*?)(?=\n?\s*[A-D][.\s]|$)/g;
      let om;
      let lastOptEnd = 0;
      while ((om = optRegex.exec(stemBody)) !== null) {
        options.push({ label: om[1], text: om[2].trim() });
        lastOptEnd = om.index + om[0].length;
      }

      // 如果没有匹配到标准 A/B/C/D 格式，尝试更宽松的匹配
      if (options.length === 0) {
        const looseOptRegex = /([A-D])[.\s、]\s*(\S[\s\S]*?)(?=\s*[A-D][.\s、]|$)/g;
        let lom;
        while ((lom = looseOptRegex.exec(stemBody)) !== null) {
          options.push({ label: lom[1], text: lom[2].trim().replace(/\n/g, ' ').replace(/\s+/g, ' ') });
        }
      }

      // 提取纯题干（去掉选项部分）
      let stem = stemBody;
      if (options.length > 0) {
        const firstOptIdx = stemBody.search(/\n\s*A[.\s]/);
        if (firstOptIdx > 0) {
          stem = stemBody.substring(0, firstOptIdx).trim();
        } else {
          // 选项可能在同一行
          const inlineOptIdx = stemBody.search(/\s{2,}A[.\s]/);
          if (inlineOptIdx > 0) {
            stem = stemBody.substring(0, inlineOptIdx).trim();
          }
        }
      }
      stem = stem.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

      questions.push({ no, stem, options });
    }

    // 提取答案
    const ansSection = block.match(/答案[：:\s]*([\s\S]*?)$/);
    const ansText = ansSection ? ansSection[1].replace(/\n/g, ' ').replace(/\s+/g, ' ') : '';

    const ansMap = {};
    // 格式1: "1-5. ABACB" 或 "1-5: ABACB" 或 "1—5：A A B C C"
    const rangeRegex = /(\d+)\s*[-—]\s*(\d+)[.\s:：、]*([A-D\s]+)/g;
    let rm;
    while ((rm = rangeRegex.exec(ansText)) !== null) {
      const start = parseInt(rm[1], 10);
      const end = parseInt(rm[2], 10);
      const letters = rm[3].replace(/\s/g, '').split('');
      for (let i = 0; i < letters.length && start + i <= end; i++) {
        ansMap[start + i] = letters[i];
      }
    }
    // 格式2: "1.A2.B3.C..." (连写无分隔)
    const tightRegex = /(\d+)[.\s、]*([A-D])/g;
    let tm;
    while ((tm = tightRegex.exec(ansText)) !== null) {
      const n = parseInt(tm[1], 10);
      if (!ansMap[n]) ansMap[n] = tm[2];
    }

    // 修正第2批第7题缺失题号的特殊情况（从原文直接补）
    if (batchId === 2 && !questions.find(q => q.no === 7)) {
      // 第7题题干以 "Among all the dresses..." 开头（无题号）
      const q7Match = block.match(/(?:^|\n)Among all the dresses in the shop[\s\S]*?(?=\n\s*\d+\.\s|\n\s*答案)/);
      if (q7Match) {
        const q7Text = q7Match[0].trim();
        const q7Options = [];
        const q7OptRegex = /([A-D])[.\s]\s*([\s\S]*?)(?=\s*[A-D][.\s]|$)/g;
        let o7m;
        while ((o7m = q7OptRegex.exec(q7Text)) !== null) {
          q7Options.push({ label: o7m[1], text: o7m[2].trim().replace(/\n/g, ' ').replace(/\s+/g, ' ') });
        }
        const stem7 = q7Text.split(/\n\s*A[.\s]/)[0].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        // 插入到正确位置
        questions.splice(6, 0, { no: 7, stem: stem7, options: q7Options });
      }
    }

    // 组装最终题目列表
    const qs = questions.map(q => ({
      ...q,
      answer: ansMap[q.no] || '',
    }));

    batches.push({
      id: batchId,
      title: `云南省中考单选专项训练（${batchId}）`,
      shortTitle: `训练${batchId}`,
      description,
      questions: qs,
      count: qs.length,
    });
  }

  return {
    batches,
    totalQuestions: batches.reduce((s, b) => s + b.count, 0),
    batchCount: batches.length,
  };
}
```

- [ ] **Step 2: 在 build.js 主流程中调用 mc 解析器**

在 pos 解析调用之后添加：

```js
// 解析 mc.txt
const mcData = parseMcTxt(path.join(__dirname, 'mc.txt'));
console.log('\n=== mc.txt 解析报告 ===');
console.log('批次数:', mcData.batchCount, '(预期 8)');
console.log('题目总数:', mcData.totalQuestions, '(预期 80)');
mcData.batches.forEach(b => {
  console.log(`  [训练${b.id}] ${b.title}: ${b.count} 题`);
  const missingAns = b.questions.filter(q => !q.answer);
  const missingOpts = b.questions.filter(q => q.options.length < 4);
  if (missingAns.length) console.log(`    ⚠ 无答案题号: ${missingAns.map(q => q.no).join(', ')}`);
  if (missingOpts.length) console.log(`    ⚠ 选项不足4个题号: ${missingOpts.map(q => q.no).join(', ')}`);
});
```

- [ ] **Step 3: 运行 build.js 验证 mc 解析**

```bash
cd E:\Verb_Phrases_7-9 && node build.js 2>&1
```

Expected: 批次 8，题目 80，所有题有答案且选项为 4 个。

- [ ] **Step 4: 提交**

```bash
git add build.js
git commit -m "feat(build): add mc.txt parser for Find the Mole"
```

---

### Task 4: 创建 src/hub-core.js — 全局状态 + 路由调度 + 工具函数

**Files:**
- Create: `src/hub-core.js`

这个文件是应用的大脑——定义全局 STATE、视图路由、公共工具函数。**注意：此文件不含 PhrasesWiz 的现有 state 属性**，那些保留在 app.js 的名称为 `state` 的变量中（局部作用域）。

- [ ] **Step 1: 创建 src/hub-core.js**

```js
// ===== hub-core.js — 全局状态 + 路由 + 公共工具 =====

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

// ---------- DOM 引用 ----------
function $(id) { return document.getElementById(id); }

// ---------- 公共工具函数 ----------
const RE_ELL = /\u2026/g;
const RE_DOTS = /\.{2,}/g;
const RE_WS = /\s+/g;

function normalize(s) {
  return (s || '').toString().trim().toLowerCase()
    .replace(RE_ELL, '...').replace(RE_DOTS, '...').replace(RE_WS, ' ');
}

function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// 检查词形填空答案（不区分大小写，空格容错）
function checkFillAnswer(input, answer) {
  const ni = normalize(input);
  if (!ni || !answer) return false;
  const na = normalize(answer);
  return ni === na;
}

// 获取 data 引用（由 build.js 内嵌到全局变量）
function getPosData() { return window.POS_DATA; }
function getMcData() { return window.MC_DATA; }

function getMoleBatch(id) { return getMcData().batches.find(b => b.id === id); }
function getFissionBatch(id) { return getPosData().batches.find(b => b.id === id); }

// ---------- 顶栏渲染 ----------
function renderTopBar() {
  const bar = $('topBar');
  if (HUB.view === 'hub') {
    bar.className = 'topbar-hub';
    bar.innerHTML = `
      <span class="topbar-brand-mini">无畏无瑕</span>
      <span class="topbar-spacer"></span>
      <button class="icon-btn" id="themeBtn" title="深色模式">🌙</button>
    `;
  } else {
    const themes = {
      mole: 'topbar-mole',
      fission: 'topbar-fission',
      phrases: 'topbar-phrases',
    };
    const icons = {
      mole: '🕵️',
      fission: '⚛️',
      phrases: '✨',
    };
    const titles = {
      mole: 'Find the Mole · 单刀营救',
      fission: 'Word Fission Mission · 词性裂变',
      phrases: 'PhrasesWiz Junior · 短语精灵',
    };
    bar.className = 'topbar ' + (themes[HUB.view] || '');
    let html = '<button class="btn-back" id="btnBackHub">← Hub</button>';
    html += '<span class="topbar-title">' + (icons[HUB.view] || '') + ' ' + titles[HUB.view] + '</span>';
    html += '<span class="topbar-spacer"></span>';

    // 批次选择器（仅 mole/fission）
    if (HUB.view === 'mole' || HUB.view === 'fission') {
      const data = HUB.view === 'mole' ? getMcData() : getPosData();
      const state = HUB.view === 'mole' ? HUB.mole : HUB.fission;
      html += '<div class="batch-tabs">';
      data.batches.forEach(b => {
        html += '<button class="batch-tab' + (b.id === state.batchId ? ' active' : '') + '" data-batch="' + b.id + '">' + b.shortTitle + '</button>';
      });
      html += '</div>';
      html += '<span class="topbar-spacer"></span>';
      html += '<button class="btn-mode' + (state.mode === 'instant' ? ' active' : '') + '" data-hubmode="instant">⚡ 即时</button>';
      html += '<button class="btn-mode' + (state.mode === 'exam' ? ' active' : '') + '" data-hubmode="exam">📝 考试</button>';
    }

    html += '<button class="icon-btn" id="themeBtn" title="深色模式">🌙</button>';
    bar.innerHTML = html;
  }
  // 更新 theme 按钮状态
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
  const main = $('mainContent');
  renderTopBar();
  switch (HUB.view) {
    case 'hub': main.innerHTML = renderHub(); break;
    case 'mole': main.innerHTML = renderMole(); break;
    case 'fission': main.innerHTML = renderFission(); break;
    case 'phrases': renderPhrasesView(); return; // phrases 有独立的渲染路径
  }
  bindMainEvents();
}

// ---------- 全局事件委托 ----------
document.addEventListener('click', e => {
  const t = e.target.closest('button, .hub-card');
  if (!t) return;

  // Hub 卡片点击
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

  // 主题切换（Hub + 板块）
  if (t.id === 'themeBtn') {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('vp79_theme', next);
    syncThemeBtn();
    return;
  }
});

// ===== 主题初始化 =====
(function() {
  const savedTheme = localStorage.getItem('vp79_theme');
  if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
})();

// ===== 初始渲染 =====
renderMain();
```

- [ ] **Step 2: 提交**

```bash
git add src/hub-core.js
git commit -m "feat: add hub-core — global state, routing, and shared utilities"
```

---

### Task 5: 创建 src/hub-home.js — Hub 首页

**Files:**
- Create: `src/hub-home.js`

- [ ] **Step 1: 创建 src/hub-home.js**

```js
// ===== hub-home.js — Hub 首页渲染 =====

function renderHub() {
  const moleCount = getMcData().totalQuestions;
  const moleBatches = getMcData().batchCount;
  const fissionCount = getPosData().totalQuestions;
  const fissionBatches = getPosData().batchCount;
  const phrasesCount = window.PHRASES_DATA.meta.totalPhrases;
  const phrasesSemesters = window.PHRASES_DATA.meta.semesterCount;

  return `
<div class="hub-container">
  <div class="hub-brand">
    <div class="brand-main">
      <span class="brand-cn">无畏无瑕</span>
    </div>
    <div class="brand-en">Fearless &amp; Flawless</div>
    <div class="brand-motto">
      <p class="motto-cn">"胆大心细不怕难，满分就在下一关。"</p>
      <p class="motto-en">"Bold and careful, that's the way, perfect score is here to stay."</p>
    </div>
  </div>

  <div class="hub-cards">
    <!-- Card 1: Find the Mole -->
    <div class="hub-card hub-card-mole" data-view="mole">
      <div class="card-icon mole-icon">
        <span class="icon-inner">🕵️</span>
      </div>
      <div class="card-title">Find the Mole</div>
      <div class="card-subtitle">单刀营救</div>
      <div class="card-desc">云南省中考单项选择题型专项训练</div>
      <div class="card-stats">${moleBatches} 批次 · ${moleCount} 题</div>
    </div>

    <!-- Card 2: Word Fission Mission -->
    <div class="hub-card hub-card-fission" data-view="fission">
      <div class="card-icon fission-icon">
        <span class="icon-inner">⚛️</span>
      </div>
      <div class="card-title">Word Fission Mission</div>
      <div class="card-subtitle">词性裂变</div>
      <div class="card-desc">云南省中考单句词形填空专项训练</div>
      <div class="card-stats">${fissionBatches} 批次 · ${fissionCount} 题</div>
    </div>

    <!-- Card 3: PhrasesWiz Junior -->
    <div class="hub-card hub-card-phrases" data-view="phrases">
      <div class="card-icon phrases-icon">
        <span class="icon-inner">✨</span>
      </div>
      <div class="card-title">PhrasesWiz Junior</div>
      <div class="card-subtitle">短语精灵</div>
      <div class="card-desc">初中英语动词短语系统学习（7-9 年级）</div>
      <div class="card-stats">${phrasesSemesters} 学期 · ${phrasesCount} 短语</div>
    </div>
  </div>
</div>`;
}

// 绑定 main 区域的事件（Hub 首页无需额外绑定，卡片 click 由全局委托处理）
function bindMainEvents() {
  // Hub 页面没有需要绑定的输入事件
  // Mole/Fission/Phrases 各自在渲染时绑定
}

// ===== Mole 输入事件委托 =====
document.addEventListener('input', e => {
  if (HUB.view !== 'fission') return;
  if (!e.target.classList.contains('fission-input')) return;
  if (HUB.fission.mode !== 'instant') return;
  // 即时模式：失焦时判定
});

document.addEventListener('change', e => {
  if (HUB.view !== 'fission') return;
  if (!e.target.classList.contains('fission-input')) return;
  if (HUB.fission.mode !== 'instant') return;
  const qNo = parseInt(e.target.dataset.qno, 10);
  handleFissionCheck(qNo, e.target.value);
});

// ===== Fission 失焦判定 =====
document.addEventListener('focusout', e => {
  if (HUB.view !== 'fission') return;
  if (!e.target.classList.contains('fission-input')) return;
  if (HUB.fission.mode !== 'instant') return;
  const qNo = parseInt(e.target.dataset.qno, 10);
  handleFissionCheck(qNo, e.target.value);
});
```

- [ ] **Step 2: 提交**

```bash
git add src/hub-home.js
git commit -m "feat: add hub-home — branding section + three panel cards"
```

---

### Task 6: 创建 src/hub-mole.js — Find the Mole 板块

**Files:**
- Create: `src/hub-mole.js`

- [ ] **Step 1: 创建 src/hub-mole.js**

```js
// ===== hub-mole.js — Find the Mole · 单刀营救 =====

function renderMole() {
  const batch = getMoleBatch(HUB.mole.batchId);
  if (!batch) return '<div class="empty-state"><div class="big">⚠️</div>批次数据未找到</div>';

  const progress = loadHubProgress(PROGRESS_KEYS.mole);
  const state = HUB.mole;
  const isExam = state.mode === 'exam';
  const submitted = state.submitted;

  let html = '';

  // 得分面板
  if (!isExam || submitted) {
    const total = batch.count;
    let correct = 0;
    batch.questions.forEach(q => {
      if (state.answers[q.no] && state.answers[q.no] === q.answer) correct++;
    });
    html += '<div class="score-panel">';
    html += '<span class="score-label">得分：</span>';
    html += '<span class="score-value">' + correct + ' / ' + total + '</span>';
    html += '<span class="score-pct">（' + Math.round(correct / total * 100) + '%）</span>';
    html += '</div>';
  }

  // 题目列表
  html += '<div class="questions-list">';
  batch.questions.forEach(q => {
    const selected = state.answers[q.no] || '';
    const isCorrect = selected === q.answer;
    const showResult = state.showAnswer[q.no] || submitted;
    const locked = !isExam && showResult;

    html += '<div class="mole-card' + (showResult ? (isCorrect ? ' mole-correct' : ' mole-wrong') : '') + '" id="mq-' + q.no + '">';
    html += '<div class="mole-head">';
    html += '<span class="q-num">[' + q.no + ']</span>';
    html += '<span class="q-stem">' + esc(q.stem) + '</span>';
    html += '</div>';
    html += '<div class="mole-options">';
    q.options.forEach(opt => {
      let cls = 'mole-opt';
      if (locked) {
        if (opt.label === q.answer) cls += ' mole-ans-correct';
        else if (opt.label === selected && !isCorrect) cls += ' mole-ans-wrong';
      } else if (selected === opt.label) {
        cls += ' mole-selected';
      }
      const disabled = locked ? ' disabled' : '';
      html += '<button class="' + cls + '" data-qno="' + q.no + '" data-opt="' + opt.label + '"' + disabled + '>';
      html += '<span class="opt-label">' + opt.label + '</span>';
      html += '<span class="opt-text">' + esc(opt.text) + '</span>';
      html += '</button>';
    });
    html += '</div>';

    // 反馈（即时模式）
    if (showResult && !isExam) {
      if (isCorrect) {
        html += '<div class="q-feedback ok">✓ 正确！</div>';
      } else {
        html += '<div class="q-feedback bad">✗ 错误！正确答案是 ' + q.answer + '. ' + getOptionText(q, q.answer) + '</div>';
      }
    }
    // 反馈（考试模式交卷后）
    if (submitted) {
      if (!selected) {
        html += '<div class="q-feedback bad">✗ 未作答！正确答案是 ' + q.answer + '. ' + getOptionText(q, q.answer) + '</div>';
      } else if (isCorrect) {
        html += '<div class="q-feedback ok">✓ 正确</div>';
      } else {
        html += '<div class="q-feedback bad">✗ 错误！正确答案是 ' + q.answer + '. ' + getOptionText(q, q.answer) + '</div>';
      }
    }

    html += '</div>';
  });
  html += '</div>';

  // 考试模式：交卷按钮
  if (isExam && !submitted) {
    html += '<div class="submit-bar"><button class="btn-submit btn-mole-submit">📝 交卷</button></div>';
  }

  return html;
}

function getOptionText(q, label) {
  const opt = q.options.find(o => o.label === label);
  return opt ? esc(opt.text) : '';
}

function handleMoleOption(t) {
  if (HUB.view !== 'mole') return;
  const qNo = parseInt(t.dataset.qno, 10);
  const opt = t.dataset.opt;
  const state = HUB.mole;
  const batch = getMoleBatch(state.batchId);
  const q = batch.questions.find(x => x.no === qNo);
  if (!q) return;

  // 即时模式：锁定后不可更改
  if (state.mode === 'instant' && state.showAnswer[qNo]) return;

  state.answers[qNo] = opt;

  if (state.mode === 'instant') {
    state.showAnswer[qNo] = true;
    // 记录进度
    const progress = loadHubProgress(PROGRESS_KEYS.mole);
    if (!progress[state.batchId]) progress[state.batchId] = {};
    progress[state.batchId][qNo] = opt === q.answer ? 'ok' : 'wrong';
    saveHubProgress(PROGRESS_KEYS.mole, progress);
  }

  // 局部刷新该题卡片
  refreshMoleCard(qNo);
}

function refreshMoleCard(qNo) {
  const card = document.getElementById('mq-' + qNo);
  if (!card) { renderMain(); return; }

  const batch = getMoleBatch(HUB.mole.batchId);
  const q = batch.questions.find(x => x.no === qNo);
  if (!q) return;

  const state = HUB.mole;
  const selected = state.answers[qNo] || '';
  const isCorrect = selected === q.answer;
  const showResult = state.showAnswer[qNo];
  const locked = state.mode === 'instant' && showResult;

  // 重建选项区域
  let optsHtml = '';
  q.options.forEach(opt => {
    let cls = 'mole-opt';
    if (locked) {
      if (opt.label === q.answer) cls += ' mole-ans-correct';
      else if (opt.label === selected && !isCorrect) cls += ' mole-ans-wrong';
    } else if (selected === opt.label) {
      cls += ' mole-selected';
    }
    const disabled = locked ? ' disabled' : '';
    optsHtml += '<button class="' + cls + '" data-qno="' + qNo + '" data-opt="' + opt.label + '"' + disabled + '>';
    optsHtml += '<span class="opt-label">' + opt.label + '</span>';
    optsHtml += '<span class="opt-text">' + esc(opt.text) + '</span>';
    optsHtml += '</button>';
  });

  const optsEl = card.querySelector('.mole-options');
  if (optsEl) optsEl.innerHTML = optsHtml;

  // 更新卡片 class
  card.className = 'mole-card' + (showResult ? (isCorrect ? ' mole-correct' : ' mole-wrong') : '');

  // 更新反馈
  let fbEl = card.querySelector('.q-feedback');
  if (showResult) {
    let fbHtml = '';
    if (isCorrect) {
      fbHtml = '<div class="q-feedback ok">✓ 正确！</div>';
    } else {
      fbHtml = '<div class="q-feedback bad">✗ 错误！正确答案是 ' + q.answer + '. ' + getOptionText(q, q.answer) + '</div>';
    }
    if (fbEl) fbEl.outerHTML = fbHtml;
    else card.insertAdjacentHTML('beforeend', fbHtml);
  }

  // 更新得分面板
  updateMoleScore();
}

function updateMoleScore() {
  const panel = document.querySelector('.score-panel');
  if (!panel) return;
  const batch = getMoleBatch(HUB.mole.batchId);
  const state = HUB.mole;
  let correct = 0;
  batch.questions.forEach(q => {
    if (state.answers[q.no] && state.answers[q.no] === q.answer) correct++;
  });
  panel.innerHTML = '<span class="score-label">得分：</span>'
    + '<span class="score-value">' + correct + ' / ' + batch.count + '</span>'
    + '<span class="score-pct">（' + Math.round(correct / batch.count * 100) + '%）</span>';
}

function handleMoleSubmit() {
  const state = HUB.mole;
  state.submitted = true;

  // 记录进度
  const batch = getMoleBatch(state.batchId);
  const progress = loadHubProgress(PROGRESS_KEYS.mole);
  if (!progress[state.batchId]) progress[state.batchId] = {};
  batch.questions.forEach(q => {
    const selected = state.answers[q.no];
    progress[state.batchId][q.no] = (selected && selected === q.answer) ? 'ok' : 'wrong';
  });
  saveHubProgress(PROGRESS_KEYS.mole, progress);

  renderMain();
}
```

- [ ] **Step 2: 提交**

```bash
git add src/hub-mole.js
git commit -m "feat: add hub-mole — Find the Mole multiple-choice UI + interaction"
```

---

### Task 7: 创建 src/hub-fission.js — Word Fission Mission 板块

**Files:**
- Create: `src/hub-fission.js`

- [ ] **Step 1: 创建 src/hub-fission.js**

```js
// ===== hub-fission.js — Word Fission Mission · 词性裂变 =====

function renderFission() {
  const batch = getFissionBatch(HUB.fission.batchId);
  if (!batch) return '<div class="empty-state"><div class="big">⚠️</div>批次数据未找到</div>';

  const state = HUB.fission;
  const isExam = state.mode === 'exam';
  const submitted = state.submitted;

  let html = '';

  // 得分面板
  if (!isExam || submitted) {
    const total = batch.count;
    let correct = 0;
    batch.questions.forEach(q => {
      if (state.answers[q.no] && checkFillAnswer(state.answers[q.no], q.answer)) correct++;
    });
    html += '<div class="score-panel">';
    html += '<span class="score-label">得分：</span>';
    html += '<span class="score-value">' + correct + ' / ' + total + '</span>';
    html += '<span class="score-pct">（' + Math.round(correct / total * 100) + '%）</span>';
    html += '</div>';
  }

  // 题目列表
  html += '<div class="questions-list">';
  batch.questions.forEach(q => {
    const typed = state.answers[q.no] || '';
    const isCorrect = checkFillAnswer(typed, q.answer);
    const showResult = state.showAnswer[q.no] || submitted;
    const locked = state.mode === 'instant' && showResult;

    html += '<div class="fission-card' + (showResult ? (isCorrect ? ' fission-correct' : ' fission-wrong') : '') + '" id="fq-' + q.no + '">';
    html += '<div class="fission-head">';
    html += '<span class="q-num">[' + q.no + ']</span>';
    // 把句子中的 ______ 替换为输入框
    const parts = q.sentence.split(/(_+)/g);
    html += '<span class="q-sentence">';
    parts.forEach((part, i) => {
      if (/^_+$/.test(part)) {
        const cls = 'fission-input' + (locked ? (isCorrect ? ' correct' : ' wrong') : '');
        const val = esc(typed);
        const ro = locked ? ' readonly' : '';
        html += '<input type="text" class="' + cls + '" data-qno="' + q.no + '" value="' + val + '"' + ro + ' placeholder="键入变形单词...">';
      } else {
        html += esc(part);
      }
    });
    html += ' <span class="q-hint">(' + esc(q.hint) + ')</span>';
    html += '</span>';
    html += '</div>';

    // 反馈
    if (showResult) {
      if (isCorrect) {
        html += '<div class="q-feedback ok">✓ ' + esc(q.answer) + '</div>';
      } else {
        html += '<div class="q-feedback bad">✗ 正确答案: <span class="ans">' + esc(q.answer) + '</span></div>';
      }
    }

    html += '</div>';
  });
  html += '</div>';

  // 考试模式：提交按钮
  if (isExam && !submitted) {
    html += '<div class="submit-bar"><button class="btn-submit btn-fission-submit">📝 提交批改</button></div>';
  }

  return html;
}

function handleFissionCheck(qNo, value) {
  if (HUB.view !== 'fission') return;
  const batch = getFissionBatch(HUB.fission.batchId);
  const q = batch.questions.find(x => x.no === qNo);
  if (!q) return;

  HUB.fission.answers[qNo] = value;
  if (!value.trim()) return; // 空输入不判定

  HUB.fission.showAnswer[qNo] = true;
  const isCorrect = checkFillAnswer(value, q.answer);

  // 记录进度
  const progress = loadHubProgress(PROGRESS_KEYS.fission);
  if (!progress[HUB.fission.batchId]) progress[HUB.fission.batchId] = {};
  progress[HUB.fission.batchId][qNo] = isCorrect ? 'ok' : 'wrong';
  saveHubProgress(PROGRESS_KEYS.fission, progress);

  // 刷新该题
  refreshFissionCard(qNo);
}

function refreshFissionCard(qNo) {
  const card = document.getElementById('fq-' + qNo);
  if (!card) { renderMain(); return; }

  const batch = getFissionBatch(HUB.fission.batchId);
  const q = batch.questions.find(x => x.no === qNo);
  if (!q) return;

  const typed = HUB.fission.answers[qNo] || '';
  const isCorrect = checkFillAnswer(typed, q.answer);
  const showResult = HUB.fission.showAnswer[qNo];
  const locked = HUB.fission.mode === 'instant' && showResult;

  // 更新 input class
  const inp = card.querySelector('.fission-input');
  if (inp) {
    inp.className = 'fission-input' + (locked ? (isCorrect ? ' correct' : ' wrong') : '');
    if (locked) inp.readOnly = true;
  }

  // 更新 card class
  card.className = 'fission-card' + (showResult ? (isCorrect ? ' fission-correct' : ' fission-wrong') : '');

  // 更新反馈
  let fbEl = card.querySelector('.q-feedback');
  if (showResult) {
    let fbHtml = '';
    if (isCorrect) {
      fbHtml = '<div class="q-feedback ok">✓ ' + esc(q.answer) + '</div>';
    } else {
      fbHtml = '<div class="q-feedback bad">✗ 正确答案: <span class="ans">' + esc(q.answer) + '</span></div>';
    }
    if (fbEl) fbEl.outerHTML = fbHtml;
    else card.insertAdjacentHTML('beforeend', fbHtml);
  }

  updateFissionScore();
}

function updateFissionScore() {
  const panel = document.querySelector('.score-panel');
  if (!panel) return;
  const batch = getFissionBatch(HUB.fission.batchId);
  const state = HUB.fission;
  let correct = 0;
  batch.questions.forEach(q => {
    if (state.answers[q.no] && checkFillAnswer(state.answers[q.no], q.answer)) correct++;
  });
  panel.innerHTML = '<span class="score-label">得分：</span>'
    + '<span class="score-value">' + correct + ' / ' + batch.count + '</span>'
    + '<span class="score-pct">（' + Math.round(correct / batch.count * 100) + '%）</span>';
}

function handleFissionSubmit() {
  const state = HUB.fission;
  state.submitted = true;

  const batch = getFissionBatch(state.batchId);
  const progress = loadHubProgress(PROGRESS_KEYS.fission);
  if (!progress[state.batchId]) progress[state.batchId] = {};
  batch.questions.forEach(q => {
    const typed = state.answers[q.no] || '';
    progress[state.batchId][q.no] = checkFillAnswer(typed, q.answer) ? 'ok' : 'wrong';
  });
  saveHubProgress(PROGRESS_KEYS.fission, progress);

  renderMain();
}
```

- [ ] **Step 2: 提交**

```bash
git add src/hub-fission.js
git commit -m "feat: add hub-fission — Word Fission Mission fill-in-blank UI + interaction"
```

---

### Task 8: 适配 app.js — PhrasesWiz Junior 嵌入 Hub

**Files:**
- Modify: `app.js` — 在文件头和尾部添加 Hub 集成代码

PhrasesWiz 的现有代码使用 `state`（小写局部变量）、`DATA`（全局）、`PROGRESS_KEY`（`vp79_progress_v1`）。需要做最小改动让它在 Hub 架构中作为 `phrases` 视图运行。

- [ ] **Step 1: 在 app.js 开头插入 Hub 入口包装**

在 `app.js` 第一行（`// app.js — 平台应用逻辑...` 注释之后）找到 `const state = {` 那一行，**不改现有代码逻辑**。在文件最末尾（`renderAll();` 调用之后）添加 Hub 集成函数。

先定位 app.js 末尾 `renderAll();` 后面的内容，确认没有更多代码：

```js
// 确认 app.js 最后几行是:
// renderAll();
// (无更多函数调用)
```

- [ ] **Step 2: 在 app.js 末尾（最后一行之后）添加 Hub 集成代码**

```js

// ===== Hub 集成: PhrasesWiz Junior 作为 Hub 的一个视图 =====

// 保存对原始 init 入口的引用，覆盖为 Hub 驱动
// renderAll() 被 renderAll → renderHeader + renderAppBody
// Hub 中由 renderPhrasesView() 触发

// 确保短语数据可通过全局访问（Hub core 引用）
window.PHRASES_DATA = DATA;

// 记录原始 renderAll 的逻辑（通过手动将其解构为 header + body）
function renderPhrasesView() {
  // 渲染 phrases 顶栏（复用 renderTopBar 已设置 topbar-phrases class）
  renderTopBar();
  // 渲染 phrases 内部内容
  renderAll();
  // phrases 的 renderHeader 会覆盖顶栏内容，所以需要在 renderAll 之后重新注入 Hub 返回按钮
  patchPhrasesHeader();
}

function patchPhrasesHeader() {
  // 在 phrases 的 header-row 最前面插入 Hub 返回按钮
  const headerRow = document.querySelector('.header-row');
  if (headerRow && !headerRow.querySelector('.btn-back')) {
    const backBtn = document.createElement('button');
    backBtn.className = 'btn-back icon-btn';
    backBtn.id = 'btnBackHub';
    backBtn.textContent = '← Hub';
    backBtn.style.cssText = 'margin-right:8px;font-size:14px;flex-shrink:0;';
    backBtn.addEventListener('click', function() {
      HUB.view = 'hub';
      renderMain();
    });
    headerRow.insertBefore(backBtn, headerRow.firstChild);
  }
}

// 全局引用 DATA（Phrases 代码期望 window.DATA 或直接使用 DATA）
// 注意: app.js 头部没有 `const DATA = ...` 声明，因为它由 build.js 以 <script>const DATA = ...</script> 方式注入
// 所以 DATA 已经是全局变量，无需额外处理。

// 初始不再自动调用 renderAll()——由 Hub 控制
// 移除 renderAll(); 改为仅在非 Hub 环境下自动渲染
// (Hub 环境由 renderMain → renderPhrasesView 触发)
```

- [ ] **Step 3: 禁用 app.js 的自动初始化**

将 app.js 最后的 `renderAll();` 替换为：

```js
// 仅在非 Hub 环境（独立运行时）自动初始化
// Hub 环境下由 hub-core.js 的 renderMain 驱动
if (typeof HUB === 'undefined') {
  renderAll();
}
```

- [ ] **Step 4: 确保 phrases 的 sem/mode tabs 点击不会破坏 Hub 顶栏**

在 app.js 的 `renderAll` 调用链中，`renderHeader()` 会重写 `#semTabs` 和 `#modeTabs` 的内容。因为 Hub 架构中的 `topBar` 和 phrases 的 `header` 是不同的 DOM 结构，需要让 phrases 使用自己的内部 header。

检查 template.js 需要给 phrases 视图提供独立的 header 容器。但当前架构是 topBar + mainContent 两层，phrases 的 header 需要嵌入到 mainContent 中。

**方案**：在 `renderPhrasesView` 中，先重置 `mainContent` 为包含 phrases 自有 header + appBody 的结构。

```js
function renderPhrasesView() {
  renderTopBar(); // Hub 顶栏（含返回按钮）
  // 重建 phrases 内部的 header + body
  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <header>
      <div class="header-row">
        <span class="title"><span class="title-icon">✨</span><span class="title-main">Phrases</span><span class="title-wiz">Wiz</span><span class="title-junior">Junior</span><span class="title-cn">· 短语精灵</span></span>
        <div class="sem-tabs" id="semTabs"></div>
        <span class="spacer"></span>
        <input type="text" class="search-box" id="searchBox" placeholder="🔍 搜索短语/中文/词性...">
        <span class="progress-mini" id="progressMini"></span>
      </div>
      <div class="mode-tabs" id="modeTabs"></div>
    </header>
    <div id="appBody"></div>
  `;
  // phrases 的 renderAll() 会填充 semTabs, modeTabs, appBody
  renderAll();
}
```

- [ ] **Step 5: 提交**

```bash
git add app.js
git commit -m "feat: adapt app.js — PhrasesWiz Junior Hub integration with entry wrapper"
```

---

### Task 9: 更新 template.js — Hub 骨架 + 全部新 CSS

**Files:**
- Modify: `template.js` — 完全重写 `buildHTML` 函数

- [ ] **Step 1: 重写 template.js**

`template.js` 现在接收 5 个参数：`buildHTML(phrasesJsonStr, posJsonStr, mcJsonStr, appJsStr, pitfallsJsonStr)` 并返回完整的 Hub HTML。

新的 `buildHTML()` 需要：

1. 保留所有现有 CSS（短语卡片、训练题、闪卡、PDF、考点辨析等）
2. 新增 Hub 首页 CSS（品牌区、卡片动效）
3. 新增顶栏系统 CSS（四个主题变体：hub/mole/fission/phrases）
4. 新增 Mole 板块 CSS（选项按钮、正确/错误高亮）
5. 新增 Fission 板块 CSS（输入框、反馈）
6. HTML 骨架改为 Hub 架构（`topBar` + `mainContent`）
7. 数据嵌入保持三个 `<script>` 标签

由于 template.js 长达 389 行，以下是关键修改区域的代码。**完整文件见 build.js 生成。**

在 template.js 的 CSS 块 `</style>` 之前，插入新 CSS：

```css
/* ===== Hub 首页 ===== */
.hub-container{max-width:960px;margin:0 auto;padding:20px 16px}
.hub-brand{text-align:center;padding:40px 20px 30px}
.brand-main{margin-bottom:8px}
.brand-cn{
  font-size:42px;font-weight:900;letter-spacing:4px;
  background:linear-gradient(135deg,#C8A84E 0%,#B8942E 50%,#D4AF37 100%);
  -webkit-background-clip:text;background-clip:text;
  -webkit-text-fill-color:transparent;color:transparent;
  animation:brandBreathe 4s ease-in-out infinite;
  text-shadow:none;
}
@keyframes brandBreathe{
  0%,100%{transform:scale(1);filter:drop-shadow(0 0 8px rgba(200,168,78,.4))}
  50%{transform:scale(1.04);filter:drop-shadow(0 0 20px rgba(184,148,46,.7))}
}
.brand-en{
  font-size:22px;font-style:italic;font-family:Georgia,"Times New Roman",serif;
  color:#B8942E;letter-spacing:1.5px;margin-bottom:20px;
  opacity:.9;
}
[data-theme="dark"] .brand-en{color:#D4AF37}
.brand-motto{margin-top:10px}
.motto-cn{
  font-size:18px;color:var(--text-muted);margin:0 0 6px;
  font-family:"Microsoft YaHei","PingFang SC",sans-serif;
}
.motto-en{
  font-size:15px;color:var(--text-muted);font-style:italic;
  font-family:Georgia,"Times New Roman",serif;margin:0;opacity:.8;
}

/* Hub 卡片网格 */
.hub-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;padding:0 10px 40px}
@media(max-width:900px){.hub-cards{grid-template-columns:repeat(2,1fr)}}
@media(max-width:600px){.hub-cards{grid-template-columns:1fr}}

.hub-card{
  background:var(--surface);border:2px solid var(--border);
  border-radius:16px;padding:28px 20px;text-align:center;
  cursor:pointer;transition:all .3s ease;
  position:relative;overflow:hidden;
}
.hub-card:hover{transform:translateY(-6px);box-shadow:0 12px 40px rgba(0,0,0,.15)}
.hub-card-mole:hover{border-color:#1a56db;box-shadow:0 12px 40px rgba(26,86,219,.25),0 0 60px rgba(6,182,212,.1)}
.hub-card-fission:hover{border-color:#7c3aed;box-shadow:0 12px 40px rgba(124,58,237,.25),0 0 60px rgba(16,185,129,.1)}
.hub-card-phrases:hover{border-color:#FF8C00;box-shadow:0 12px 40px rgba(255,140,0,.25),0 0 60px rgba(255,20,147,.1)}

.card-icon{font-size:56px;margin-bottom:12px;line-height:1;transition:transform .3s ease}
.hub-card:hover .card-icon{transform:scale(1.15)}
.mole-icon .icon-inner{animation:moleWiggle 1.5s ease-in-out infinite;display:inline-block}
@keyframes moleWiggle{0%,100%{transform:rotate(0) translateY(0)}25%{transform:rotate(-8deg) translateY(-3px)}75%{transform:rotate(8deg) translateY(-3px)}}
.fission-icon .icon-inner{animation:fissionSpin 2.5s linear infinite;display:inline-block}
@keyframes fissionSpin{0%{transform:rotate(0) scale(1)}50%{transform:rotate(180deg) scale(1.2)}100%{transform:rotate(360deg) scale(1)}}
.phrases-icon .icon-inner{animation:phrasesBounce 2s ease-in-out infinite;display:inline-block}
@keyframes phrasesBounce{0%,100%{transform:rotate(0) translateY(0)}25%{transform:rotate(90deg) translateY(-6px)}50%{transform:rotate(180deg) translateY(0)}75%{transform:rotate(270deg) translateY(-6px)}}

.card-title{font-size:19px;font-weight:800;margin-bottom:4px;color:var(--text)}
.card-subtitle{font-size:15px;font-weight:600;color:var(--text-muted);margin-bottom:10px}
.card-desc{font-size:13px;color:var(--text-muted);margin-bottom:8px;line-height:1.5}
.card-stats{font-size:12px;color:var(--text-muted);background:var(--tag-bg);display:inline-block;padding:3px 12px;border-radius:10px}

/* ===== 顶栏系统 ===== */
.topbar{position:sticky;top:0;z-index:100;padding:8px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;border-bottom:1px solid var(--border);box-shadow:var(--shadow);transition:background .3s,box-shadow .3s}
.topbar-hub{background:var(--surface);border-bottom:1px solid transparent;box-shadow:none}
.topbar-mole{background:linear-gradient(135deg,#1a2a4a 0%,#1a3a5c 100%);border-bottom-color:#1a56db;color:#e0e8f0}
.topbar-fission{background:linear-gradient(135deg,#2a1a4a 0%,#1a2a3a 100%);border-bottom-color:#7c3aed;color:#e0d8f0}
.topbar-phrases{background:var(--surface)}
[data-theme="dark"] .topbar-mole{background:linear-gradient(135deg,#0a1528 0%,#0f1f35 100%)}
[data-theme="dark"] .topbar-fission{background:linear-gradient(135deg,#150828 0%,#0f1528 100%)}
.topbar-spacer{flex:1;min-width:0}
.topbar-brand-mini{font-size:16px;font-weight:700;color:#B8942E;letter-spacing:2px}
.topbar-title{font-size:16px;font-weight:700;white-space:nowrap}
.btn-back{padding:4px 12px;font-size:13px;border-radius:6px;cursor:pointer;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);color:inherit}
.btn-back:hover{background:rgba(255,255,255,.25)}
.batch-tabs{display:flex;gap:4px;flex-wrap:wrap}
.batch-tab{padding:4px 10px;font-size:12px;border-radius:5px;cursor:pointer;background:transparent;border:1px solid rgba(255,255,255,.2);color:inherit;white-space:nowrap}
.batch-tab.active{background:rgba(255,255,255,.25);border-color:rgba(255,255,255,.4);font-weight:700}
.batch-tab:hover{background:rgba(255,255,255,.15)}
.btn-mode{padding:4px 10px;font-size:12px;border-radius:5px;cursor:pointer;background:transparent;border:1px solid rgba(255,255,255,.2);color:inherit}
.btn-mode.active{background:rgba(255,255,255,.3);border-color:rgba(255,255,255,.5);font-weight:700}
.btn-mode:hover{background:rgba(255,255,255,.2)}

@media(max-width:600px){
  .brand-cn{font-size:28px;letter-spacing:2px}
  .brand-en{font-size:17px}
  .motto-cn{font-size:15px}
  .motto-en{font-size:13px}
  .hub-card{padding:20px 14px}
  .card-title{font-size:16px}
  .topbar{padding:6px 10px;gap:6px}
  .topbar-title{font-size:14px}
  .batch-tab{padding:3px 7px;font-size:11px}
  .btn-mode{padding:3px 7px;font-size:11px}
}

/* ===== Mole 板块：选择题卡片 ===== */
.score-panel{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:10px 16px;margin:10px 0 16px;display:flex;align-items:center;gap:8px;font-size:14px}
.score-value{font-weight:800;color:var(--accent);font-size:18px}
.score-pct{color:var(--text-muted);font-size:13px}
.questions-list{max-width:900px;margin:0 auto}
.mole-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;margin-bottom:12px;transition:border-color .2s}
.mole-card.mole-correct{border-color:var(--ok);border-left:4px solid var(--ok)}
.mole-card.mole-wrong{border-color:var(--danger);border-left:4px solid var(--danger)}
.mole-head{display:flex;gap:8px;margin-bottom:10px}
.q-num{font-weight:700;color:var(--text-muted);min-width:32px;font-size:13px}
.q-stem{font-size:15px;line-height:1.6}
.mole-options{display:grid;grid-template-columns:1fr 1fr;gap:6px}
@media(max-width:600px){.mole-options{grid-template-columns:1fr}}
.mole-opt{
  display:flex;align-items:center;gap:8px;padding:8px 12px;
  border:1.5px solid var(--border);border-radius:8px;
  background:var(--surface);cursor:pointer;text-align:left;
  transition:all .15s;font-size:14px;
}
.mole-opt:hover:not(:disabled){border-color:var(--accent);background:rgba(26,115,232,.04)}
.mole-opt.mole-selected{border-color:var(--accent);background:rgba(26,115,232,.08);font-weight:600}
.mole-opt.mole-ans-correct{border-color:var(--ok);background:rgba(24,128,56,.1);font-weight:700}
.mole-opt.mole-ans-correct .opt-label{color:var(--ok)}
.mole-opt.mole-ans-wrong{border-color:var(--danger);background:rgba(217,48,37,.08)}
.mole-opt.mole-ans-wrong .opt-label{color:var(--danger)}
.mole-opt:disabled{cursor:default;opacity:.85}
.opt-label{font-weight:700;font-size:15px;min-width:22px;color:var(--accent)}
.opt-text{flex:1}

.submit-bar{text-align:center;padding:20px;margin-top:10px}
.btn-submit{padding:10px 32px;font-size:16px;font-weight:700;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;transition:all .2s}
.btn-submit:hover{opacity:.9;transform:scale(1.03);color:#fff}

/* ===== Fission 板块：填空题卡片 ===== */
.fission-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;margin-bottom:12px;transition:border-color .2s}
.fission-card.fission-correct{border-color:var(--ok);border-left:4px solid var(--ok)}
.fission-card.fission-wrong{border-color:var(--danger);border-left:4px solid var(--danger)}
.fission-head{display:flex;gap:6px;align-items:flex-start;flex-wrap:wrap}
.q-sentence{font-size:15px;line-height:2}
.q-hint{font-size:12px;color:var(--text-muted);white-space:nowrap}
.fission-input{
  font-family:inherit;font-size:14px;padding:4px 10px;
  border:1.5px solid var(--accent);border-radius:6px;
  background:var(--surface);color:var(--text);
  min-width:140px;max-width:200px;transition:all .15s;
}
.fission-input:focus{outline:none;box-shadow:0 0 0 3px rgba(26,115,232,.15)}
.fission-input.correct{border-color:var(--ok);background:rgba(24,128,56,.06)}
.fission-input.wrong{border-color:var(--danger);background:rgba(217,48,37,.06)}
.fission-input[readonly]{cursor:default}

/* ===== Phrases 板块 嵌入 Hub 后 header 适配 ===== */
/* phrases 内部 header 不再需要 sticky（Hub topBar 已经是 sticky） */
#mainContent > header{position:static;top:auto;z-index:auto;margin-bottom:16px;border-radius:var(--radius)}

/* ===== Hub 顶栏在 light 模式下的深色背景适配 ===== */
.topbar-mole .icon-btn,.topbar-mole .btn-mode,.topbar-mole .batch-tab,
.topbar-fission .icon-btn,.topbar-fission .btn-mode,.topbar-fission .batch-tab{
  color:#e0e8f0;
}
.topbar-mole .icon-btn:hover,.topbar-fission .icon-btn:hover{color:#fff}
```

- [ ] **Step 2: 更新 template.js 的 HTML body 骨架**

将 body 内容从旧的单一 header + appBody 替换为：

```html
<body>
<header id="topBar"></header>
<main id="mainContent"></main>
<div class="toast" id="toast"></div>
<div class="print-area" id="printArea" style="display:none"></div>

<script>
const PHRASES_DATA = ${phrasesJsonStr};
</script>
<script>
const POS_DATA = ${posJsonStr};
</script>
<script>
const MC_DATA = ${mcJsonStr};
</script>
<script>
const PITFALLS = ${pitfallsJsonStr};
</script>
<script>
${appJsStr}
</script>
</body>
```

- [ ] **Step 3: 更新 buildHTML 函数签名**

```js
function buildHTML(phrasesJsonStr, posJsonStr, mcJsonStr, appJsStr, pitfallsJsonStr) {
  // ... 完整 HTML 字符串 ...
}
```

- [ ] **Step 4: 提交**

```bash
git add template.js
git commit -m "feat: rewrite template.js — Hub skeleton with new CSS for all panels"
```

---

### Task 10: 更新 build.js — 串联所有模块

**Files:**
- Modify: `build.js` — 最后部分（生成 index.html 的代码）

- [ ] **Step 1: 替换 build.js 末尾的 HTML 生成代码**

将 build.js 中原来生成 index.html 的部分（约从 `fs.writeFileSync(path.join(__dirname, 'data.json'), ...)` 开始到最后），替换为：

```js
// 写出 data.json（保留用于调试/参考）
fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(data, null, 0), 'utf-8');
console.log('已写出 data.json, 大小:', (fs.statSync(path.join(__dirname, 'data.json')).size / 1024).toFixed(1), 'KB');

// ===== 生成 Hub HTML =====
const { buildHTML } = require('./template');

// 读取所有 JS 模块并按顺序拼接
const jsModules = [
  'src/hub-core.js',
  'src/hub-home.js',
  'src/hub-mole.js',
  'src/hub-fission.js',
];

let appJsStr = '';
for (const mod of jsModules) {
  const modPath = path.join(__dirname, mod);
  if (fs.existsSync(modPath)) {
    appJsStr += '\n// ===== ' + mod + ' =====\n';
    appJsStr += fs.readFileSync(modPath, 'utf-8') + '\n';
  } else {
    console.warn('⚠ 模块文件不存在: ' + mod);
  }
}

// 拼接原有 app.js（PhrasesWiz 现有逻辑）
const phrasesAppJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf-8');
appJsStr += '\n// ===== app.js (PhrasesWiz Junior 现有逻辑) =====\n';
appJsStr += phrasesAppJs;

const phrasesJsonStr = JSON.stringify(data);
const posJsonStr = JSON.stringify(posData);
const mcJsonStr = JSON.stringify(mcData);
const pitfallsJsonStr = fs.readFileSync(path.join(__dirname, 'pitfalls-data.json'), 'utf-8');

const html = buildHTML(phrasesJsonStr, posJsonStr, mcJsonStr, appJsStr, pitfallsJsonStr);
fs.writeFileSync(path.join(__dirname, 'index.html'), html, 'utf-8');
console.log('已写出 index.html (Hub 三板块), 大小:', (fs.statSync(path.join(__dirname, 'index.html')).size / 1024).toFixed(1), 'KB');
console.log('\n=== 构建完成 ===');
console.log('三大板块: Find the Mole (' + mcData.batchCount + '批), Word Fission Mission (' + posData.batchCount + '批), PhrasesWiz Junior (' + data.meta.semesterCount + '学期)');
```

- [ ] **Step 2: 运行完整构建**

```bash
cd E:\Verb_Phrases_7-9 && node build.js 2>&1
```

Expected: 成功输出 index.html，日志显示所有三个数据源的解析报告。

- [ ] **Step 3: 提交**

```bash
git add build.js
git commit -m "feat: update build.js — wire all modules + triple data sources into Hub HTML"
```

---

### Task 11: 验证 & 修复

- [ ] **Step 1: 用浏览器打开 index.html 验证 Hub 首页**

```bash
# 打开 index.html
start E:\Verb_Phrases_7-9\index.html
```

检查清单：
- [ ] Hub 品牌区显示正常（暗金色文字，呼吸动效）
- [ ] 三张卡片显示正常，悬停有动效
- [ ] 点击 Find the Mole 卡片 → 进入选择题界面
- [ ] 点击 Word Fission Mission 卡片 → 进入填空题界面
- [ ] 点击 PhrasesWiz Junior 卡片 → 进入短语精灵界面
- [ ] 每个板块的「← Hub」返回按钮有效
- [ ] 深色模式切换在所有页面有效
- [ ] Mole：点击选项即时判定，正确绿色/错误红色
- [ ] Mole：考试模式交卷功能正常
- [ ] Fission：输入单词失焦判定，正确绿色/错误红色
- [ ] Fission：考试模式提交批改正常
- [ ] Phrases：所有现有功能正常（学习、填空、闪卡、考点辨析、PDF导出）

- [ ] **Step 2: 排查并修复 JS 错误**

按浏览器 Console 报告逐一修复：
- 变量未定义 → 检查脚本加载顺序
- DOM 元素未找到 → 检查 ID 命名一致性
- 数据引用错误 → 检查 PHRASES_DATA/POS_DATA/MC_DATA 全局变量名

- [ ] **Step 3: 响应式测试**

- [ ] 缩小浏览器窗口到 600px 以下 → 验证卡片单列、顶栏适配
- [ ] Pad 尺寸 (~768px) → 验证两列卡片

- [ ] **Step 4: 最终提交**

```bash
git add -A
git commit -m "feat: Hub three-panel architecture — complete implementation"
```

---

## 总结

总共 11 个任务，5 个新文件 + 3 个修改文件。实现顺序严格线性依赖：

```
Task1(备份) → Task2(pos解析) → Task3(mc解析)
                                    ↓
Task4(hub-core) → Task5(hub-home) → Task6(hub-mole) → Task7(hub-fission)
                                                              ↓
                                              Task8(适配app.js)
                                                              ↓
                                              Task9(重写template.js)
                                                              ↓
                                              Task10(串联build.js)
                                                              ↓
                                              Task11(验证修复)
```
