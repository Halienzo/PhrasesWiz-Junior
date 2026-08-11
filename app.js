
// app.js — 平台应用逻辑（注入到 index.html 的 <script> 中）
// 注意: 本文件是真正的 JS 源码，正则反斜杠原样保留，不经过模板字符串消费。

// ===== 状态 =====
const state = {
  semId: DATA.semesters[0].id,
  mode: 'learn',
  unitFilter: 'all',
  posFilter: 'all',
  diffFilter: 'all',
  search: '',
  shuffle: false,
  onlyWrong: false,
  flashIdx: 0,
  flashFlipped: false,
  pdfType: 'fill',
  pdfTraining: 'all',
  pdfOnlyWrong: false,
  sidebarOpen: false,
  pitfallCatFilter: 'all',
  pitfallSearch: '',
  pitfallShowAnswers: {},
};

const PROGRESS_KEY = 'vp79_progress_v1';
let progress = loadProgress();

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; } catch (e) { return {}; }
}
function saveProgress() { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); }

function sem() { return DATA.semesters.find(s => s.id === state.semId); }

// ===== 容错比对 =====
const RE_ELL = /\u2026/g;
const RE_DOTS = /\.{2,}/g;
const RE_WS = /\s+/g;
const RE_LSQ = /[\u2018\u2019]/g;
const RE_LDQ = /[\u201c\u201d]/g;
const RE_FLP = /\uff08/g;
const RE_FRP = /\uff09/g;
const RE_SLA = /[/\uff0f]/;
const RE_SBCSB = /\\bsb\\b/g;
const RE_SBSTH = /\\bsth\\b/g;
const RE_UND = /_/g;

function normalize(s) {
  return (s || '').toString().trim().toLowerCase()
    .replace(RE_ELL, '...').replace(RE_DOTS, '...').replace(RE_WS, ' ')
    .replace(RE_LSQ, "'").replace(RE_LDQ, '"')
    .replace(RE_FLP, '(').replace(RE_FRP, ')')
    .replace(RE_SBCSB, '_').replace(RE_SBSTH, '_');
}
function checkAnswer(input, answers) {
  if (!Array.isArray(answers)) answers = [answers];
  const ni = normalize(input);
  if (!ni) return false;
  for (const a of answers) {
    const opts = a.split(RE_SLA).map(x => normalize(x));
    for (const o of opts) {
      if (o === ni) return true;
      if (o.replace(RE_UND, '').trim() === ni.replace(RE_UND, '').trim()) return true;
    }
  }
  return false;
}

// ===== 高亮渲染 =====
function renderSegments(segs) {
  if (!segs) return '';
  if (typeof segs === 'string') return esc(segs);
  return segs.map(s => {
    if (s.type === 'phrase') return '<span class="hl-phrase">' + esc(s.text) + '</span>';
    if (s.type === 'be') return '<span class="hl-be">' + esc(s.text) + '</span>';
    return esc(s.text);
  }).join('');
}
function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// ===== 顶部导航 =====
function renderHeader() {
  const semTabs = document.getElementById('semTabs');
  semTabs.innerHTML = DATA.semesters.map(s =>
    '<button class="sem-tab' + (s.id === state.semId ? ' active' : '') + '" data-sem="' + s.id + '">' + s.short + '</button>'
  ).join('');

  const modes = [
    ['learn', '📚 学习'],
    ['fill', '✍ 填空测试'],
    ['en2cn', '🔁 看英写中'],
    ['cn2en', '🔁 看中写英'],
    ['pitfalls', '🔍 考点辨析'],
    ['flash', '🃏 闪卡'],
    ['pdf', '📄 导出PDF'],
  ];
  const mt = document.getElementById('modeTabs');
  mt.innerHTML = modes.map(m =>
    '<button class="mode-tab' + (state.mode === m[0] ? ' active' : '') + '" data-mode="' + m[0] + '">' + m[1] + '</button>'
  ).join('');

  updateProgressMini();
}

function updateProgressMini() {
  const s = sem();
  const mkey = s.id + '_m';
  const mastered = (progress[mkey] || {})._c || 0;
  const total = s.phraseCount;
  const pct = total ? Math.round(mastered / total * 100) : 0;
  document.getElementById('progressMini').textContent = '已掌握 ' + mastered + '/' + total + ' (' + pct + '%)';
}

// ===== 侧边栏 =====
function renderSidebarInner() {
  const s = sem();
  const units = ['all'];
  s.phrases.forEach(p => { if (p.unit && !units.includes(p.unit)) units.push(p.unit); });
  const posList = ['all', '动词短语', '名词短语', '副词短语', '介词短语', '连词短语', '形容词短语', '限定词短语', '其他'];
  const diffs = ['all', 1, 2, 3];

  let html = '<div class="sidebar"><h4>单元</h4>';
  html += units.map(u => '<button class="filter-btn' + (state.unitFilter === u ? ' active' : '') + '" data-unit="' + esc(u) + '">' + (u === 'all' ? '全部' : esc(u)) + '</button>').join('');
  html += '<h4>词性</h4>' + posList.map(p => '<button class="filter-btn' + (state.posFilter === p ? ' active' : '') + '" data-pos="' + p + '">' + p + '</button>').join('');
  html += '<h4>难度</h4>' + diffs.map(d => '<button class="filter-btn' + (state.diffFilter === d ? ' active' : '') + '" data-diff="' + d + '">' + (d === 'all' ? '全部' : '⭐'.repeat(d)) + '</button>').join('');
  html += '<h4>统计</h4><div style="font-size:12px;color:var(--text-muted)">短语 ' + s.phraseCount + ' 条<br>训练题 ' + s.questionCount + ' 题</div>';
  html += '</div>';
  return html;
}

function filteredPhrases() {
  const s = sem();
  return s.phrases.filter(p => {
    if (state.unitFilter !== 'all' && p.unit !== state.unitFilter) return false;
    if (state.posFilter !== 'all' && p.posCategory !== state.posFilter) return false;
    if (state.diffFilter !== 'all' && p.difficulty !== state.diffFilter) return false;
    if (state.search) {
      const q = state.search.toLowerCase();
      if (!p.phrase.toLowerCase().includes(q) && !(p.basic && p.basic.cn.includes(state.search)) && !p.pos.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

// ===== 学习模式 =====
function renderLearn() {
  const list = filteredPhrases();
  let html = '<button class="filter-toggle" id="filterToggle">🎛 筛选' + (state.unitFilter !== 'all' || state.posFilter !== 'all' || state.diffFilter !== 'all' ? ' ·' : '') + '</button>';
  if (state.sidebarOpen) html += '<div class="sidebar-backdrop" id="sidebarBackdrop"></div>';
  html += '<div class="layout">';
  html += '<aside class="sidebar-wrap' + (state.sidebarOpen ? ' open' : '') + '" id="sidebarWrap">' + renderSidebarInner() + '</aside>';
  html += '<div class="content">';
  if (!list.length) { html += '<div class="empty-state"><div class="big">🔍</div>无匹配短语</div></div>'; return html + '</div></div>'; }
  list.forEach(p => {
    const mkey = sem().id + '_m';
    const mastered = (progress[mkey] || {})[p.num];
    html += '<div class="phrase-card" id="pc-' + p.num + '">';
    html += '<div class="phrase-head">';
    html += '<span class="phrase-num">' + p.num + '.</span>';
    html += '<span class="phrase-word">' + renderPhraseName(p.phrase) + '</span>';
    html += '<span class="tag">' + esc(p.pos) + '</span>';
    html += '<span class="stars">' + '⭐'.repeat(p.difficulty) + '</span>';
    html += '<div class="card-actions">';
    html += '<button class="act-speak" data-text="' + esc(p.phrase) + '" title="朗读">🔊</button>';
    html += '<button class="act-master' + (mastered ? ' mastered' : '') + '" data-num="' + p.num + '">' + (mastered ? '✓ 已掌握' : '标记掌握') + '</button>';
    html += '</div></div>';
    if (p.usageNote) {
      html += '<div class="usage-note">💡 ' + esc(p.usageNote) + '</div>';
    }
    // 考点辨析徽章
    if (window.PITFALLS) {
      const relPits = getPhrasePitfalls(sem().id, p.num);
      if (relPits.length) {
        html += '<div class="pit-badges">🔗 考点：';
        relPits.forEach(pid => {
          const pit = getPitfallById(pid);
          if (pit) html += '<span class="pit-badge" data-pitid="' + pid + '">' + esc(pit.title.length > 18 ? pit.title.slice(0,18) + '...' : pit.title) + '</span>';
        });
        html += '</div>';
      }
    }
    if (p.basic) {
      html += '<div class="example example-basic">';
      html += '<div class="example-label">🔹 初级例句 (' + esc(p.basic.structure) + ')</div>';
      html += '<div class="example-cn">' + renderSegments(p.basic.cnSegments) + '</div>';
      html += '<div class="example-en">' + renderSegments(p.basic.segments) + '</div>';
      html += '</div>';
    }
    if (p.posCategory === '动词短语' && !/^be\b/i.test(p.phrase)) {
      html += '<div style="margin-top:6px">' + renderVerbForms(p.phrase) + '</div>';
    }
    if (p.advanced) {
      html += '<details class="adv-details"><summary>🔸 晋级例句 (' + esc(p.advanced.structure) + ') — 点击展开</summary>';
      html += '<div class="example example-adv">';
      html += '<div class="example-cn">' + renderSegments(p.advanced.cnSegments) + '</div>';
      html += '<div class="example-en">' + renderSegments(p.advanced.segments) + '</div>';
      html += '</div>';
      if (p.vocab && p.vocab.length) {
        html += '<div class="vocab-line">' + p.vocab.map(v => '<span class="vocab-word">' + esc(v.word) + '</span><span class="vocab-pos">' + esc(v.pos) + '</span>' + esc(v.cn)).join(' ｜ ') + '</div>';
      }
      html += '</details>';
    }
    html += '</div>';
  });
  html += '</div>';
  return html;
}

function toggleMaster(num) {
  const mkey = sem().id + '_m';
  if (!progress[mkey]) progress[mkey] = { _c: 0 };
  if (progress[mkey][num]) { delete progress[mkey][num]; progress[mkey]._c = (progress[mkey]._c || 0) - 1; }
  else { progress[mkey][num] = 1; progress[mkey]._c = (progress[mkey]._c || 0) + 1; }
  if (progress[mkey]._c < 0) progress[mkey]._c = 0;
  saveProgress();
  const btn = document.querySelector('.act-master[data-num="' + num + '"]');
  if (btn) { btn.className = 'act-master' + (progress[mkey][num] ? ' mastered' : ''); btn.textContent = progress[mkey][num] ? '✓ 已掌握' : '标记掌握'; }
  updateProgressMini();
}

// ===== 填空测试 =====
function renderFill() {
  const s = sem();
  let html = '<div class="test-toolbar no-print">';
  html += '<label><input type="checkbox" id="shuffleCb" ' + (state.shuffle ? 'checked' : '') + '> 乱序</label>';
  html += '<label><input type="checkbox" id="onlyWrongCb" ' + (state.onlyWrong ? 'checked' : '') + '> 只练错题</label>';
  html += '<button class="primary act-grade-fill">批改全部</button>';
  html += '<button class="act-reset-fill">重置</button>';
  html += '<span class="score" id="fillScore"></span>';
  html += '</div>';
  s.trainings.forEach(t => {
    let qs = t.questions.slice();
    if (state.shuffle) qs = shuffle(qs);
    if (state.onlyWrong) {
      const wk = s.id + '_w_' + t.title;
      const wrong = progress[wk] || {};
      qs = qs.filter(q => wrong[q.no]);
    }
    if (!qs.length) return;
    html += '<div class="training-block"><div class="training-title">' + esc(t.title) + ' · ' + esc(t.units) + ' (' + qs.length + '题)</div>';
    qs.forEach(q => {
      const tid = t.title.replace(/[^a-z0-9]/gi, '');
      const id = 'fill-' + s.id + '-' + tid + '-' + q.no;
      html += '<div class="q-row" id="row-' + id + '">';
      html += '<span class="q-num">' + q.no + '.</span>';
      html += '<div class="q-body">';
      const parts = q.sentence.split(/(_+)/);
      html += '<div class="q-sentence">';
      let blankIdx = 0;
      parts.forEach(part => {
        if (/^_+$/.test(part)) {
          html += '<input type="text" class="q-input" data-qid="' + id + '" data-blank="' + blankIdx + '" placeholder="____">';
          blankIdx++;
        } else {
          html += esc(part);
        }
      });
      html += ' <span class="q-hint">（' + esc(q.hint_cn) + '）</span></div>';
      html += '<div class="q-feedback" id="fb-' + id + '"></div>';
      html += '<button class="q-grade-btn act-grade-single-fill" data-qid="' + id + '">✓ 批改</button>';
      html += '</div></div>';
    });
    html += '</div>';
  });
  return html;
}

// 逐题批改填空（按钮或 Enter 键触发）
function gradeSingleFill(qid) {
  const s = sem();
  const inputs = document.querySelectorAll('input[data-qid="' + qid + '"]');
  if (!inputs.length) return;
  // 如果已经批改过，跳过（防重复）
  const fb = document.getElementById('fb-' + qid);
  if (fb && fb.textContent) return;
  // 查找题目数据
  let question = null, training = null;
  for (const t of s.trainings) {
    const tid = t.title.replace(/[^a-z0-9]/gi, '');
    for (const q of t.questions) {
      if (('fill-' + s.id + '-' + tid + '-' + q.no) === qid) { question = q; training = t; break; }
    }
    if (question) break;
  }
  if (!question) return;
  // 判断是否全空（不做题就批改 → 不给答案，只提示）
  var allEmpty = true;
  inputs.forEach(function(inp) { if (inp.value.trim()) allEmpty = false; });
  if (allEmpty) {
    toast('请先填写答案再批改');
    return;
  }
  var wk = s.id + '_w_' + training.title;
  if (!progress[wk]) progress[wk] = {};
  var allOk = true;
  inputs.forEach(function(inp, i) {
    var ans = question.answers[i] || question.answers[0];
    var ok = checkAnswer(inp.value, ans);
    inp.classList.remove('correct', 'wrong', 'correct-anim', 'wrong-anim');
    inp.classList.add(ok ? 'correct' : 'wrong');
    if (ok) { animateCorrect(inp); } else { animateWrong(inp); allOk = false; }
  });
  if (allOk) {
    fb.className = 'q-feedback ok fadeInUp'; fb.textContent = '✓ 正确';
    delete progress[wk][question.no];
    playCorrectSound();
  } else {
    fb.className = 'q-feedback bad fadeInUp';
    fb.innerHTML = '✗ 正确答案：<span class="ans">' + esc(question.answers.join(' / ')) + '</span>';
    progress[wk][question.no] = 1;
    playWrongSound();
  }
  saveProgress();
  updateFillScore();
}
function updateFillScore() {
  var correct = 0, total = 0;
  document.querySelectorAll('.q-feedback').forEach(function(fb) {
    if (fb.textContent) { total++; if (fb.classList.contains('ok')) correct++; }
  });
  var sc = document.getElementById('fillScore');
  if (sc && total) sc.textContent = '得分：' + correct + ' / ' + total + ' (' + Math.round(correct / total * 100) + '分)';
}

function gradeFill() {
  const s = sem();
  let correct = 0, total = 0, skipped = 0;
  s.trainings.forEach(t => {
    const qs = t.questions;
    const wk = s.id + '_w_' + t.title;
    if (!progress[wk]) progress[wk] = {};
    const tid = t.title.replace(/[^a-z0-9]/gi, '');
    qs.forEach(q => {
      const id = 'fill-' + s.id + '-' + tid + '-' + q.no;
      // 跳过已批改的题
      const fb = document.getElementById('fb-' + id);
      if (fb && fb.textContent) { skipped++; return; }
      const inputs = document.querySelectorAll('input[data-qid="' + id + '"]');
      if (!inputs.length) return;
      total++;
      let allOk = true;
      inputs.forEach((inp, i) => {
        const ans = q.answers[i] || q.answers[0];
        const ok = checkAnswer(inp.value, ans);
        inp.classList.remove('correct', 'wrong', 'correct-anim', 'wrong-anim');
        inp.classList.add(ok ? 'correct' : 'wrong');
        if (ok) { animateCorrect(inp); } else { animateWrong(inp); allOk = false; }
      });
      if (allOk) {
        correct++;
        fb.className = 'q-feedback ok fadeInUp'; fb.textContent = '✓ 正确';
        delete progress[wk][q.no];
        playCorrectSound();
      } else {
        fb.className = 'q-feedback bad fadeInUp';
        fb.innerHTML = '✗ 正确答案：<span class="ans">' + esc(q.answers.join(' / ')) + '</span>';
        progress[wk][q.no] = 1;
        playWrongSound();
      }
    });
  });
  saveProgress();
  const sc = document.getElementById('fillScore');
  const msg = total ? ('批改完成：' + correct + '/' + total + (skipped ? '（' + skipped + '题已批）' : '')) : '所有题目已批改';
  if (sc && total) sc.textContent = '得分：' + correct + ' / ' + total + ' (' + Math.round(correct / total * 100) + '分)';
  toast(msg);
}

function resetFill() {
  document.querySelectorAll('input.q-input').forEach(i => { i.value = ''; i.classList.remove('correct', 'wrong', 'correct-anim', 'wrong-anim'); });
  document.querySelectorAll('.q-feedback').forEach(f => { f.textContent = ''; f.className = 'q-feedback'; });
  const sc = document.getElementById('fillScore'); if (sc) sc.textContent = '';
}

// ===== 看英写中（自评模式） =====
function renderEn2Cn() {
  const s = sem();
  let list = filteredPhrases();
  if (state.shuffle) list = shuffle(list);
  if (state.onlyWrong) {
    const wk = s.id + '_d_en2cn';
    const wrong = progress[wk] || {};
    list = list.filter(p => wrong[p.num]);
  }
  let html = '<div class="test-toolbar no-print">';
  html += '<label><input type="checkbox" id="shuffleCb" ' + (state.shuffle ? 'checked' : '') + '> 乱序</label>';
  html += '<label><input type="checkbox" id="onlyWrongCb" ' + (state.onlyWrong ? 'checked' : '') + '> 只练错题</label>';
  html += '<span class="score" id="dictScore"></span>';
  html += '</div>';
  html += '<div style="font-size:13px;color:var(--text-muted);margin-bottom:10px">看英文写出中文释义，点击「显示参考」核对后自评对错。</div>';
  if (!list.length) { html += '<div class="empty-state"><div class="big">🎉</div>无错题，全部掌握！</div>'; return html; }
  list.forEach(p => {
    const id = 'en2cn-' + p.num;
    html += '<div class="dict-row">';
    html += '<div class="dict-prompt"><span class="pw">' + renderPhraseName(p.phrase) + '</span> <button class="act-speak" data-text="' + esc(p.phrase) + '" style="padding:2px 6px">🔊</button>';
    html += '<div style="font-size:12px;color:var(--text-muted)">' + esc(p.pos) + '</div></div>';
    html += '<input type="text" class="dict-input" placeholder="输入中文释义">';
    html += '<div class="dict-fb" id="dfb-' + id + '"><button class="act-show-ref" data-num="' + p.num + '">显示参考</button></div>';
    html += '</div>';
  });
  return html;
}

function showRef(num) {
  const s = sem();
  const p = s.phrases.find(x => x.num === num);
  const fb = document.getElementById('dfb-en2cn-' + num);
  if (!p || !fb) return;
  fb.innerHTML = '<span style="color:var(--orange)">参考：' + renderPhraseName(p.phrase) + '</span> — ' + esc(p.basic.cn) +
    '<br><button class="act-mark-dict" data-mode="en2cn" data-num="' + num + '" data-ok="1" style="padding:2px 8px;margin-top:4px">✓ 对</button> ' +
    '<button class="act-mark-dict" data-mode="en2cn" data-num="' + num + '" data-ok="0" style="padding:2px 8px;margin-top:4px">✗ 错</button>';
}

function markDict(mode, num, ok) {
  const s = sem();
  const wk = s.id + '_d_' + mode;
  if (!progress[wk]) progress[wk] = {};
  if (ok) delete progress[wk][num]; else progress[wk][num] = 1;
  saveProgress();
  // 音效
  if (ok) { playCorrectSound(); } else { playWrongSound(); }
  // 输入框颜色动画（在 fb 同行的 dict-row 中查找 input）
  const fb = document.getElementById('dfb-' + mode + '-' + num);
  if (fb) {
    fb.classList.add('fadeInUp');
    fb.addEventListener('animationend', function() { fb.classList.remove('fadeInUp'); }, { once: true });
    const row = fb.closest('.dict-row');
    if (row) {
      const inp = row.querySelector('input.dict-input');
      if (inp) {
        inp.classList.remove('correct', 'wrong', 'correct-anim', 'wrong-anim');
        inp.classList.add(ok ? 'correct' : 'wrong');
        if (ok) { animateCorrect(inp); } else { animateWrong(inp); }
      }
    }
  }
  toast(ok ? '已标记正确' : '已加入错题本');
}

// ===== 看中写英 =====
function renderCn2En() {
  const s = sem();
  let list = filteredPhrases();
  if (state.shuffle) list = shuffle(list);
  if (state.onlyWrong) {
    const wk = s.id + '_d_cn2en';
    const wrong = progress[wk] || {};
    list = list.filter(p => wrong[p.num]);
  }
  let html = '<div class="test-toolbar no-print">';
  html += '<label><input type="checkbox" id="shuffleCb" ' + (state.shuffle ? 'checked' : '') + '> 乱序</label>';
  html += '<label><input type="checkbox" id="onlyWrongCb" ' + (state.onlyWrong ? 'checked' : '') + '> 只练错题</label>';
  html += '<button class="primary act-grade-cn2en">批改全部</button>';
  html += '<button class="act-reset-cn2en">重置</button>';
  html += '<span class="score" id="dictScore"></span>';
  html += '</div>';
  html += '<div style="font-size:13px;color:var(--text-muted);margin-bottom:10px">根据中文例句写出对应的英文短语。</div>';
  if (!list.length) { html += '<div class="empty-state"><div class="big">🎉</div>无错题，全部掌握！</div>'; return html; }
  list.forEach(p => {
    const id = 'cn2en-' + p.num;
    html += '<div class="dict-row" style="flex-direction:column;align-items:stretch">';
    html += '<div style="margin-bottom:6px"><span style="color:var(--text-muted);font-size:13px">题' + p.num + ' · ' + esc(p.pos) + ' · ' + '⭐'.repeat(p.difficulty) + '</span></div>';
    html += '<div style="font-size:15px;margin-bottom:6px">' + esc(p.basic.cn) + '</div>';
    html += '<input type="text" class="dict-input cn2en-input" data-pnum="' + p.num + '" style="max-width:400px" placeholder="输入英文短语">';
    html += '<div class="dict-fb" id="dfb-' + id + '"></div>';
    html += '<button class="q-grade-btn act-grade-single-cn2en" data-pnum="' + p.num + '" style="align-self:flex-end;margin-top:4px">✓ 批改</button>';
    html += '</div>';
  });
  return html;
}

function gradeCn2En() {
  const s = sem();
  let correct = 0, total = 0, skipped = 0;
  const wk = s.id + '_d_cn2en';
  if (!progress[wk]) progress[wk] = {};
  document.querySelectorAll('input.cn2en-input').forEach(inp => {
    const pnum = parseInt(inp.dataset.pnum);
    const fb = document.getElementById('dfb-cn2en-' + pnum);
    if (fb && fb.innerHTML) { skipped++; return; }
    const p = s.phrases.find(x => x.num === pnum);
    if (!p) return;
    total++;
    const ok = checkAnswer(inp.value, p.phrase);
    inp.classList.remove('correct', 'wrong', 'correct-anim', 'wrong-anim');
    inp.classList.add(ok ? 'correct' : 'wrong');
    if (ok) { animateCorrect(inp); playCorrectSound(); }
    else { animateWrong(inp); playWrongSound(); }
    if (ok) { correct++; fb.className = 'dict-fb fadeInUp'; fb.innerHTML = '<span style="color:var(--ok)">✓ 正确</span>'; delete progress[wk][pnum]; }
    else { fb.className = 'dict-fb fadeInUp'; fb.innerHTML = '<span style="color:var(--danger)">✗ 正确：<span style="color:var(--orange);font-weight:600">' + renderPhraseName(p.phrase) + '</span></span>'; progress[wk][pnum] = 1; }
  });
  saveProgress();
  const sc = document.getElementById('dictScore');
  const msg = total ? ('批改完成：' + correct + '/' + total + (skipped ? '（' + skipped + '题已批）' : '')) : '所有题目已批改';
  if (sc && total) sc.textContent = '得分：' + correct + ' / ' + total;
  toast(msg);
}
function gradeSingleCn2En(pnum) {
  const s = sem();
  const inp = document.querySelector('input.cn2en-input[data-pnum="' + pnum + '"]');
  if (!inp) return;
  const fb = document.getElementById('dfb-cn2en-' + pnum);
  if (fb && fb.innerHTML) return;
  if (!inp.value.trim()) { toast('请先填写答案再批改'); return; }
  const p = s.phrases.find(x => x.num === pnum);
  if (!p) return;
  const wk = s.id + '_d_cn2en';
  if (!progress[wk]) progress[wk] = {};
  const ok = checkAnswer(inp.value, p.phrase);
  inp.classList.remove('correct', 'wrong', 'correct-anim', 'wrong-anim');
  inp.classList.add(ok ? 'correct' : 'wrong');
  if (ok) { animateCorrect(inp); playCorrectSound(); }
  else { animateWrong(inp); playWrongSound(); }
  if (ok) { fb.className = 'dict-fb fadeInUp'; fb.innerHTML = '<span style="color:var(--ok)">✓ 正确</span>'; delete progress[wk][pnum]; }
  else { fb.className = 'dict-fb fadeInUp'; fb.innerHTML = '<span style="color:var(--danger)">✗ 正确：<span style="color:var(--orange);font-weight:600">' + renderPhraseName(p.phrase) + '</span></span>'; progress[wk][pnum] = 1; }
  saveProgress();
  updateCn2EnScore();
}
function updateCn2EnScore() {
  var correct = 0, total = 0;
  document.querySelectorAll('.dict-fb').forEach(function(fb) {
    if (fb.innerHTML) { total++; if (fb.innerHTML.indexOf('✓ 正确') !== -1) correct++; }
  });
  var sc = document.getElementById('dictScore');
  if (sc && total) sc.textContent = '得分：' + correct + ' / ' + total;
}

function resetCn2En() {
  document.querySelectorAll('input.cn2en-input').forEach(i => { i.value = ''; i.classList.remove('correct', 'wrong', 'correct-anim', 'wrong-anim'); });
  document.querySelectorAll('.dict-fb').forEach(f => { f.innerHTML = ''; f.className = 'dict-fb'; });
  const sc = document.getElementById('dictScore'); if (sc) sc.textContent = '';
}

// ===== 闪卡 =====
function renderFlash() {
  let list = filteredPhrases();
  if (!list.length) return '<div class="empty-state"><div class="big">🔍</div>无匹配短语</div>';
  if (state.flashIdx >= list.length) state.flashIdx = 0;
  const p = list[state.flashIdx];
  let html = '<div class="flashcard-wrap no-print">';
  html += '<div style="font-size:14px;color:var(--text-muted)">' + (state.flashIdx + 1) + ' / ' + list.length + ' · ' + sem().short + '</div>';
  html += '<div class="flashcard" id="flashcard"><div class="fc-inner">';
  html += '<div class="fc-face"><div class="fc-word">' + renderPhraseName(p.phrase) + '</div><div class="fc-meta">点击翻面看中文 · ' + esc(p.pos) + '</div></div>';
  html += '<div class="fc-face fc-back"><div class="fc-cn">' + renderSegments(p.basic.cnSegments || p.basic.cn) + '</div>';
  if (p.basic && p.basic.segments) {
    html += '<div class="fc-en">' + renderSegments(p.basic.segments) + '</div>';
  }
  html += '<div class="fc-meta">' + esc(p.pos) + ' · ' + '⭐'.repeat(p.difficulty) + '</div></div>';
  html += '</div></div>';
  html += '<div class="fc-actions">';
  html += '<button class="act-speak" data-text="' + esc(p.phrase) + '">🔊 朗读</button>';
  html += '<button class="act-flash-prev">‹ 上一张</button>';
  html += '<button class="primary act-flash-next">认识，下一张 ›</button>';
  html += '</div>';
  html += '<div style="font-size:12px;color:var(--text-muted);margin-top:10px">快捷键: <span class="kbd">Space</span> 翻面 · <span class="kbd">←</span><span class="kbd">→</span> 切换</div>';
  html += '</div>';
  return html;
}
function flipFlash() { state.flashFlipped = !state.flashFlipped; const c = document.getElementById('flashcard'); if (c) c.classList.toggle('flipped'); }
function nextFlash(d) { state.flashIdx += d; if (state.flashIdx < 0) state.flashIdx = 0; state.flashFlipped = false; renderAppBody(); }

// ===== PDF 导出 =====
function renderPdf() {
  let html = '<div class="pdf-panel no-print">';
  html += '<h3>📄 导出 PDF 训练材料</h3>';
  html += '<div class="pdf-hint">选择卷型后点击「生成 PDF」，在弹出的打印对话框中选择「另存为 PDF」。当前学期：' + sem().name + '</div>';
  const opts = [
    ['fill', '填空训练卷', '汉译英填空题，含题号、空格、中文提示，留手写空间'],
    ['ans', '填空卷答案', '对应填空卷的标准答案'],
    ['list', '短语清单表（英译汉）', '英文短语|词性|初级英文例句|中文(留白) 表格'],
    ['list-cn', '短语清单表（汉译英）', '中文释义|词性|初级中文例句|英文(留白) 表格'],
    ['examples', '例句学习材料', '短语+初级例句+晋级例句+生词'],
  ];
  html += '<div class="pdf-options">';
  opts.forEach(o => {
    html += '<div class="pdf-opt' + (state.pdfType === o[0] ? ' active' : '') + '" data-pdf="' + o[0] + '">';
    html += '<label><input type="radio" name="pdftype" value="' + o[0] + '" ' + (state.pdfType === o[0] ? 'checked' : '') + '> ' + o[1] + '</label>';
    html += '<div style="font-size:12px;color:var(--text-muted);margin-top:4px">' + o[2] + '</div>';
    html += '</div>';
  });
  html += '</div>';
  // 训练范围选择
  const curSem = sem();
  if (curSem && curSem.trainings) {
    html += '<div style="margin-top:10px;font-size:13px;font-weight:700">训练范围：</div>';
    html += '<div class="pdf-options">';
    html += '<div class="pdf-opt' + (state.pdfTraining === 'all' ? ' active' : '') + '" data-pdf-training="all"><label><input type="radio" name="pdfTraining" value="all" ' + (state.pdfTraining === 'all' ? 'checked' : '') + '> 全部</label></div>';
    curSem.trainings.forEach((t, i) => {
      html += '<div class="pdf-opt' + (state.pdfTraining === i ? ' active' : '') + '" data-pdf-training="' + i + '"><label><input type="radio" name="pdfTraining" value="' + i + '" ' + (state.pdfTraining === i ? 'checked' : '') + '> ' + esc(t.title) + '</label></div>';
    });
    html += '</div>';
  }
  html += '<div style="margin-top:8px"><label><input type="checkbox" id="pdfOnlyWrongCb" ' + (state.pdfOnlyWrong ? 'checked' : '') + '> 仅打印错题</label></div>';
  html += '<button class="primary act-gen-pdf">🖨 生成 PDF（打印）</button>';
  html += '<div class="pdf-hint">提示：打印时建议关闭页眉页脚，纸张选 A4。</div>';
  html += '</div>';
  return html;
}

function generatePdf() {
  const s = sem();
  const pa = document.getElementById('printArea');
  let html = '';

  // ── 错题短语集合（供 list / examples 过滤） ──
  function getWrongPhraseSet() {
    const set = new Set();
    Object.keys(progress).forEach(k => {
      if ((k.startsWith(s.id + '_w_') || k === s.id + '_d_en2cn' || k === s.id + '_d_cn2en')) {
        const d = progress[k] || {};
        Object.keys(d).forEach(n => { if (n !== '_c' && !isNaN(parseInt(n)) && d[n]) set.add(parseInt(n)); });
      }
    });
    return set;
  }

  // ── 短语过滤（训练范围 + 错题） ──
  var phrases = s.phrases;
  if (state.pdfTraining !== 'all' && s.trainings) {
    var tRef = s.trainings[parseInt(state.pdfTraining)];
    if (tRef) {
      var tUnits = tRef.units.split(',').map(function(u) { return u.trim(); });
      phrases = phrases.filter(function(p) {
        return tUnits.some(function(u) { return p.unit && p.unit.indexOf(u) !== -1; });
      });
    }
  }
  if (state.pdfOnlyWrong) {
    var wset = getWrongPhraseSet();
    phrases = phrases.filter(function(p) { return wset.has(p.num); });
  }

  // ── 训练过滤（填空卷用） ──
  var trainings = s.trainings;
  if (state.pdfTraining !== 'all') {
    var ti = parseInt(state.pdfTraining);
    if (s.trainings[ti]) trainings = [s.trainings[ti]];
  }
  if (state.pdfOnlyWrong) {
    trainings = trainings.map(function(t) {
      var wk = s.id + '_w_' + t.title;
      var w = progress[wk] || {};
      var nos = Object.keys(w).filter(function(k) { return k !== '_c' && w[k]; }).map(Number);
      return { title: t.title, units: t.units, questions: t.questions.filter(function(q) { return nos.indexOf(q.no) !== -1; }) };
    }).filter(function(t) { return t.questions.length > 0; });
  }

  if (state.pdfType === 'fill' || state.pdfType === 'wrong-fill') {
    var fillTitle = state.pdfType === 'wrong-fill' ? s.name + ' 错题·填空训练' : s.name + ' 汉译英填空训练';
    html += '<div class="print-sheet"><div class="print-h1">' + fillTitle + '</div><div class="print-h2">姓名：______  日期：______</div>';
    if (!trainings.length) html += '<div style="text-align:center;padding:40px;color:#999">该筛选条件下无题目</div>';
    trainings.forEach(function(t) {
      html += '<div style="margin:14px 0 8px;font-weight:700">' + esc(t.title) + ' · ' + esc(t.units) + '</div>';
      t.questions.forEach(function(q) {
        var parts = q.sentence.split(/(_+)/);
        html += '<div class="print-q"><span class="n">' + q.no + '.</span>';
        parts.forEach(function(part) { if (/^_+$/.test(part)) html += '<span class="blank"></span>'; else html += esc(part); });
        html += '<span class="print-hint">（' + esc(q.hint_cn) + '）</span></div>';
      });
    });
    html += '</div>';
  } else if (state.pdfType === 'ans') {
    html += '<div class="print-sheet print-ans-sheet"><div class="print-h1">' + s.name + ' 填空训练 · 参考答案</div>';
    if (!trainings.length) html += '<div style="text-align:center;padding:40px;color:#999">该筛选条件下无题目</div>';
    trainings.forEach(function(t) {
      html += '<div style="margin:14px 0 8px;font-weight:700">' + esc(t.title) + ' · ' + esc(t.units) + '</div>';
      t.questions.forEach(function(q) {
        html += '<div class="print-q"><span class="n">' + q.no + '.</span><span class="print-ans">' + esc(q.answers.join(' ... ')) + '</span></div>';
      });
    });
    html += '</div>';
  } else if (state.pdfType === 'list') {
    html += '<div class="print-sheet"><div class="print-h1">' + s.name + ' 短语清单</div>';
    html += '<table class="print-table"><thead><tr><th style="width:38px">编号</th><th>英文短语</th><th>词性</th><th>初级英文例句</th><th style="width:72px">中文</th></tr></thead><tbody>';
    if (!phrases.length) html += '<tr><td colspan="5" style="text-align:center;color:#999;padding:20px">该筛选条件下无短语</td></tr>';
    phrases.forEach(function(p) {
      html += '<tr><td>' + p.num + '</td><td class="pw">' + renderPhraseName(p.phrase) + '</td><td>' + esc(p.pos) + '</td><td>' + renderSegmentsPhraseHighlight(p.basic ? p.basic.segments : null) + '</td><td></td></tr>';
    });
    html += '</tbody></table></div>';
  } else if (state.pdfType === 'list-cn') {
    html += '<div class="print-sheet"><div class="print-h1">' + s.name + ' 短语清单（汉译英）</div>';
    html += '<table class="print-table"><thead><tr><th style="width:38px">编号</th><th>中文释义</th><th>词性</th><th>初级中文例句</th><th style="width:96px">英文</th></tr></thead><tbody>';
    if (!phrases.length) html += '<tr><td colspan="5" style="text-align:center;color:#999;padding:20px">该筛选条件下无短语</td></tr>';
    phrases.forEach(function(p) {
      html += '<tr><td>' + p.num + '</td><td class="pw">' + renderCnPhraseHighlight(p.basic ? p.basic.cnSegments : null) + '</td><td>' + esc(p.pos) + '</td><td>' + renderSegmentsPhraseHighlight(p.basic ? p.basic.cnSegments : null) + '</td><td></td></tr>';
    });
    html += '</tbody></table></div>';
  } else if (state.pdfType === 'examples') {
    var CHUNK_SIZE = 3;
    for (var ci = 0; ci < phrases.length; ci += CHUNK_SIZE) {
      var chunk = phrases.slice(ci, ci + CHUNK_SIZE);
      var isLastSheet = ci + CHUNK_SIZE >= phrases.length;
      html += '<div class="print-sheet"' + (isLastSheet ? ' style="page-break-after:auto"' : '') + '>';
      chunk.forEach(function(p, i) {
        html += '<div class="print-phrase-block">';
        html += '<div><span style="color:#999">' + p.num + '. </span><span class="pw">' + renderPhraseName(p.phrase) + '</span> <span style="color:#666;font-size:12px">' + esc(p.pos) + '</span></div>';
        if (p.basic) html += '<div class="ex">' + renderCnSegmentsHighlight(p.basic.cnSegments) + '<br>' + renderSegmentsPhraseHighlight(p.basic.segments) + '</div>';
        if (p.advanced) {
          html += '<div class="ex" style="margin-top:6px"><span style="color:#228B22;font-size:12px">晋级例句：</span><br>' + renderCnSegmentsHighlight(p.advanced.cnSegments) + '<br>' + renderSegmentsPhraseHighlight(p.advanced.segments) + '</div>';
        }
        if (p.vocab && p.vocab.length) {
          html += '<div class="vocab">生词：' + p.vocab.map(function(v) { return v.word + ' ' + v.pos + '. ' + v.cn; }).join(' | ') + '</div>';
        }
        html += '</div>';
        if (i < chunk.length - 1) {
          html += '<hr style="border:none;border-top:1px dashed #ddd;margin:8px 0">';
        }
      });
      html += '</div>';
    }
  }
  pa.innerHTML = html;
  pa.style.display = 'block';
  document.querySelector('main').style.display = 'none';
  window.print();
  setTimeout(function() { pa.style.display = 'none'; document.querySelector('main').style.display = ''; }, 500);
}

function renderSegmentsPlain(segs) {
  if (!segs) return '';
  return segs.map(s => s.text).join('');
}

// ===== 考点辨析（Pitfalls）模块 =====

// 构建短语→考点反向索引
let _pitIndex = null;
function buildPitIndex() {
  if (_pitIndex) return _pitIndex;
  _pitIndex = {};
  if (!window.PITFALLS || !PITFALLS.pitfalls) return _pitIndex;
  PITFALLS.pitfalls.forEach(pit => {
    if (!pit.phrases) return;
    pit.phrases.forEach(ph => {
      const key = ph.semId + ':' + ph.num;
      if (!_pitIndex[key]) _pitIndex[key] = [];
      _pitIndex[key].push(pit.id);
    });
  });
  return _pitIndex;
}

function getPhrasePitfalls(semId, num) {
  const idx = buildPitIndex();
  const key = semId + ':' + num;
  return idx[key] || [];
}

function getPitfallById(id) {
  if (!window.PITFALLS) return null;
  // Check grammarPrimer
  if (PITFALLS.grammarPrimer && PITFALLS.grammarPrimer.id === id) return PITFALLS.grammarPrimer;
  return (PITFALLS.pitfalls || []).find(p => p.id === id) || null;
}

function renderPitfalls() {
  const cats = PITFALLS.meta ? PITFALLS.meta.categories : [];
  let filtered = PITFALLS.pitfalls || [];

  // Category filter
  if (state.pitfallCatFilter !== 'all') {
    filtered = filtered.filter(p => p.category === state.pitfallCatFilter);
  }
  // Search
  if (state.pitfallSearch) {
    const q = state.pitfallSearch.toLowerCase();
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.includes(q)) ||
      p.category.includes(q) ||
      (p.comparison || []).some(c => (c.phrase || '').toLowerCase().includes(q) || (c.meaning || '').includes(q))
    );
  }

  const counts = {};
  PITFALLS.pitfalls.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });

  let html = '<div class="pitfalls-layout">';

  // ── 左侧分类导航 ──
  html += '<div class="pitfalls-cats">';
  html += '<h4>考点分类</h4>';
  html += '<button class="pitfalls-cat-btn' + (state.pitfallCatFilter === 'all' ? ' active' : '') + '" data-pitcat="all">全部考点<span class="pitfalls-cat-count">' + PITFALLS.pitfalls.length + '</span></button>';
  cats.forEach(cat => {
    const c = counts[cat] || 0;
    const isGrammar = cat.indexOf('语法基础') !== -1;
    html += '<button class="pitfalls-cat-btn' + (state.pitfallCatFilter === cat ? ' active' : '') + (isGrammar ? ' grammar-cat' : '') + '" data-pitcat="' + esc(cat) + '">' + esc(cat) + '<span class="pitfalls-cat-count">' + c + '</span></button>';
  });
  html += '</div>';

  // ── 右侧内容区 ──
  html += '<div class="pitfalls-content">';

  // 搜索
  html += '<div class="pitfalls-search"><input type="text" id="pitfallSearchBox" placeholder="🔍 搜索考点、短语、关键词..." value="' + esc(state.pitfallSearch) + '"></div>';
  html += '<div class="pitfalls-stats">共 ' + filtered.length + ' 个考点' + (state.pitfallCatFilter !== 'all' ? '（已筛选: ' + state.pitfallCatFilter + '）' : '') + '</div>';

  // ── 语法基础模块：介词后接成分 ──
  if ((state.pitfallCatFilter === 'all' || state.pitfallCatFilter.indexOf('语法基础') !== -1) && !state.pitfallSearch) {
    const gp = PITFALLS.grammarPrimer;
    if (gp) {
      html += '<div class="grammar-primer" id="grammarPrep">';
      html += '<h2>📖 ' + esc(gp.title) + '</h2>';
      html += '<p style="font-size:14px;color:var(--text-muted);margin:6px 0">' + esc(gp.summary) + '</p>';

      // 核心原理
      html += '<div class="principle-rule">';
      html += '<strong>核心规则：</strong>' + esc(gp.principle.rule);
      html += '</div>';
      html += '<div class="why-not">⚠ ' + esc(gp.principle.whyNotToDo) + '</div>';

      // 五种类型
      html += '<div class="five-types"><h3 style="font-size:16px;margin:0 0 10px">介词后可接的五种名词性成分</h3>';
      (gp.fiveTypes || []).forEach((ft, fi) => {
        html += '<details class="type-card"' + (fi === 0 ? ' open' : '') + '>';
        html += '<summary style="cursor:pointer;font-weight:700;font-size:15px">' + (fi + 1) + '. ' + esc(ft.label) + '</summary>';
        html += '<div class="type-explain">' + esc(ft.explain) + '</div>';
        html += '<div class="type-examples">';
        (ft.examples || []).forEach(ex => {
          html += '<div class="type-ex">';
          html += '<span class="ex-phrase">' + esc(ex.phrase) + '</span>';
          html += '<span class="ex-from">← ' + esc(ex.from) + '</span>';
          html += '<span class="ex-analysis">' + esc(ex.analysis) + '</span>';
          html += '</div>';
        });
        html += '</div></details>';
      });
      html += '</div>';

      // 口诀
      html += '<div class="key-takeaway">💡 ' + esc(gp.keyTakeaway) + '</div>';

      // 易混介词辨析
      html += '<div class="confusable-box"><h4>⚠ 高频混淆：to（介词）vs to（不定式符号）</h4>';
      (gp.confusablePrepositions || []).forEach(cp => {
        html += '<p style="font-size:13px;margin:4px 0"><strong>' + esc(cp.pair) + '</strong></p>';
        html += '<p style="font-size:13px;color:var(--text-muted)">' + esc(cp.how) + '</p>';
        html += '<p style="font-size:13px">验证短语：' + (cp.testPhrases || []).map(t => '<code>' + esc(t) + '</code>').join('、') + '</p>';
      });
      html += '</div>';

      html += '</div>'; // .grammar-primer
    }
  }

  // ── 考点卡片 ──
  filtered.forEach(pit => {
    html += '<div class="pitfall-card" id="pit-' + pit.id + '">';
    html += '<div class="pit-title">' + esc(pit.title) + '</div>';
    html += '<span class="pit-category">' + esc(pit.category) + '</span>';
    html += '<span class="pit-diff">' + '⭐'.repeat(pit.difficulty || 1) + '</span>';

    // 关联短语
    if (pit.phrases && pit.phrases.length) {
      html += '<div class="pit-rels">📎 关联短语：';
      pit.phrases.forEach((ph, i) => {
        if (i > 0) html += '、';
        const semName = (DATA.semesters.find(s => s.id === ph.semId) || {}).short || ph.semId;
        html += '<a onclick="jumpToPhrase(\'' + ph.semId + '\',' + ph.num + ')">' + semName + '#' + ph.num + '</a>';
      });
      html += '</div>';
    }

    // 对比表
    if (pit.comparison && pit.comparison.length) {
      html += '<table class="pit-compare"><thead><tr><th>短语</th><th>词性</th><th>含义</th><th>用法/例句</th></tr></thead><tbody>';
      pit.comparison.forEach(c => {
        html += '<tr>';
        html += '<td class="comp-phrase">' + esc(c.phrase || '') + '</td>';
        html += '<td class="comp-pos">' + esc(c.pos || '') + (c.prep ? ' <b>' + esc(c.prep) + '</b>' : '') + '</td>';
        html += '<td>' + esc(c.meaning || '') + (c.note ? '<br><span style="font-size:11px;color:var(--text-muted)">' + esc(c.note) + '</span>' : '') + '</td>';
        html += '<td class="comp-usage">' + (c.usage ? esc(c.usage) + '<br>' : '') + '<span style="font-size:11px;color:var(--text-muted)">' + esc(c.eg || '') + '</span></td>';
        html += '</tr>';
      });
      html += '</tbody></table>';
    }

    // 常见错误
    if (pit.commonMistakes && pit.commonMistakes.length) {
      html += '<div class="pit-mistakes">';
      pit.commonMistakes.forEach(m => {
        html += '<div class="mistake-row">';
        if (m.wrong) {
          html += '<div class="wrong-box"><span class="label">❌ 常见错误</span><div>' + esc(m.wrong) + '</div></div>';
        }
        if (m.right) {
          html += '<div class="right-box"><span class="label">✅ 正确写法</span><div>' + esc(m.right) + '</div></div>';
        }
        if (m.explain) {
          html += '<div class="explain" style="flex-basis:100%">💡 ' + esc(m.explain) + '</div>';
        }
        html += '</div>';
      });
      html += '</div>';
    }

    // 典型出题
    if (pit.testExample) {
      const te = pit.testExample;
      const ansShown = state.pitfallShowAnswers[pit.id];
      html += '<div class="pit-test">';
      html += '<div class="test-label">📝 典型出题（' + esc(te.type || '选择题') + '）</div>';
      html += '<div class="test-question">' + esc(te.question || '') + '</div>';
      if (te.options) {
        html += '<div class="test-options">' + te.options.map(o => esc(o)).join('&emsp;') + '</div>';
      }
      html += '<button class="test-show-btn" data-pitid="' + pit.id + '">' + (ansShown ? '隐藏答案' : '显示答案与解析') + '</button>';
      html += '<div class="test-answer' + (ansShown ? ' show' : '') + '" id="ta-' + pit.id + '">';
      html += '<div class="correct-ans">✅ 答案：' + esc(te.answer || '') + '</div>';
      if (te.explain) html += '<div class="test-explain">💡 ' + esc(te.explain) + '</div>';
      html += '</div>';
      html += '</div>';
    }

    html += '</div>'; // .pitfall-card
  });

  if (!filtered.length) {
    html += '<div class="empty-state"><div class="big">🔍</div>无匹配考点</div>';
  }

  html += '</div></div>'; // .pitfalls-content / .pitfalls-layout
  return html;
}

function renderSegmentsPhraseHighlight(segs) {
  if (!segs) return '';
  return segs.map(s => {
    if (s.type === 'phrase') {
      return '<em><u>' + esc(s.text) + '</u></em>';
    }
    if (s.type === 'be') {
      return '<span style="color:#87CEEB">(' + esc(s.text) + ')</span>';
    }
    return esc(s.text);
  }).join('');
}

function renderPhraseName(name) {
  return esc(name).replace(/\bbe\b/gi, '<span style="color:#87CEEB">(be)</span>');
}

function renderCnPhraseHighlight(segs) {
  if (!segs) return '';
  return segs.filter(s => s.type === 'phrase').map(s => '<em><u>' + esc(s.text) + '</u></em>').join('');
}

// ===== 不规则动词形态词典 =====
const VERB_FORMS = {
  take:{s:'takes',past:'took',pp:'taken',ing:'taking'}, make:{s:'makes',past:'made',pp:'made',ing:'making'},
  go:{s:'goes',past:'went',pp:'gone',ing:'going'}, get:{s:'gets',past:'got',pp:'got',ing:'getting'},
  look:{s:'looks',past:'looked',pp:'looked',ing:'looking'}, put:{s:'puts',past:'put',pp:'put',ing:'putting'},
  come:{s:'comes',past:'came',pp:'come',ing:'coming'}, play:{s:'plays',past:'played',pp:'played',ing:'playing'},
  have:{s:'has',past:'had',pp:'had',ing:'having'}, do:{s:'does',past:'did',pp:'done',ing:'doing'},
  work:{s:'works',past:'worked',pp:'worked',ing:'working'}, fall:{s:'falls',past:'fell',pp:'fallen',ing:'falling'},
  cut:{s:'cuts',past:'cut',pp:'cut',ing:'cutting'}, turn:{s:'turns',past:'turned',pp:'turned',ing:'turning'},
  drop:{s:'drops',past:'dropped',pp:'dropped',ing:'dropping'}, run:{s:'runs',past:'ran',pp:'run',ing:'running'},
  try:{s:'tries',past:'tried',pp:'tried',ing:'trying'}, give:{s:'gives',past:'gave',pp:'given',ing:'giving'},
  keep:{s:'keeps',past:'kept',pp:'kept',ing:'keeping'}, set:{s:'sets',past:'set',pp:'set',ing:'setting'},
  let:{s:'lets',past:'let',pp:'let',ing:'letting'}, leave:{s:'leaves',past:'left',pp:'left',ing:'leaving'},
  bring:{s:'brings',past:'brought',pp:'brought',ing:'bringing'}, break:{s:'breaks',past:'broke',pp:'broken',ing:'breaking'},
  carry:{s:'carries',past:'carried',pp:'carried',ing:'carrying'}, catch:{s:'catches',past:'caught',pp:'caught',ing:'catching'},
  choose:{s:'chooses',past:'chose',pp:'chosen',ing:'choosing'}, draw:{s:'draws',past:'drew',pp:'drawn',ing:'drawing'},
  drive:{s:'drives',past:'drove',pp:'driven',ing:'driving'}, eat:{s:'eats',past:'ate',pp:'eaten',ing:'eating'},
  feel:{s:'feels',past:'felt',pp:'felt',ing:'feeling'}, find:{s:'finds',past:'found',pp:'found',ing:'finding'},
  fly:{s:'flies',past:'flew',pp:'flown',ing:'flying'}, forget:{s:'forgets',past:'forgot',pp:'forgotten',ing:'forgetting'},
  hang:{s:'hangs',past:'hung',pp:'hung',ing:'hanging'}, hear:{s:'hears',past:'heard',pp:'heard',ing:'hearing'},
  help:{s:'helps',past:'helped',pp:'helped',ing:'helping'}, hold:{s:'holds',past:'held',pp:'held',ing:'holding'},
  know:{s:'knows',past:'knew',pp:'known',ing:'knowing'}, lead:{s:'leads',past:'led',pp:'led',ing:'leading'},
  learn:{s:'learns',past:'learned',pp:'learned',ing:'learning'}, lend:{s:'lends',past:'lent',pp:'lent',ing:'lending'},
  lose:{s:'loses',past:'lost',pp:'lost',ing:'losing'}, mean:{s:'means',past:'meant',pp:'meant',ing:'meaning'},
  meet:{s:'meets',past:'met',pp:'met',ing:'meeting'}, pay:{s:'pays',past:'paid',pp:'paid',ing:'paying'},
  read:{s:'reads',past:'read',pp:'read',ing:'reading'}, ride:{s:'rides',past:'rode',pp:'ridden',ing:'riding'},
  rise:{s:'rises',past:'rose',pp:'risen',ing:'rising'}, say:{s:'says',past:'said',pp:'said',ing:'saying'},
  see:{s:'sees',past:'saw',pp:'seen',ing:'seeing'}, sell:{s:'sells',past:'sold',pp:'sold',ing:'selling'},
  send:{s:'sends',past:'sent',pp:'sent',ing:'sending'}, shut:{s:'shuts',past:'shut',pp:'shut',ing:'shutting'},
  sing:{s:'sings',past:'sang',pp:'sung',ing:'singing'}, sit:{s:'sits',past:'sat',pp:'sat',ing:'sitting'},
  sleep:{s:'sleeps',past:'slept',pp:'slept',ing:'sleeping'}, speak:{s:'speaks',past:'spoke',pp:'spoken',ing:'speaking'},
  stand:{s:'stands',past:'stood',pp:'stood',ing:'standing'}, swim:{s:'swims',past:'swam',pp:'swum',ing:'swimming'},
  teach:{s:'teaches',past:'taught',pp:'taught',ing:'teaching'}, tell:{s:'tells',past:'told',pp:'told',ing:'telling'},
  think:{s:'thinks',past:'thought',pp:'thought',ing:'thinking'}, throw:{s:'throws',past:'threw',pp:'thrown',ing:'throwing'},
  wake:{s:'wakes',past:'woke',pp:'woken',ing:'waking'}, wear:{s:'wears',past:'wore',pp:'worn',ing:'wearing'},
  win:{s:'wins',past:'won',pp:'won',ing:'winning'}, write:{s:'writes',past:'wrote',pp:'written',ing:'writing'},
  drink:{s:'drinks',past:'drank',pp:'drunk',ing:'drinking'}, grow:{s:'grows',past:'grew',pp:'grown',ing:'growing'},
  hit:{s:'hits',past:'hit',pp:'hit',ing:'hitting'}, spend:{s:'spends',past:'spent',pp:'spent',ing:'spending'},
  stick:{s:'sticks',past:'stuck',pp:'stuck',ing:'sticking'}, lay:{s:'lays',past:'laid',pp:'laid',ing:'laying'},
  die:{s:'dies',past:'died',pp:'died',ing:'dying'}, lie:{s:'lies',past:'lay',pp:'lain',ing:'lying'}
};

function deriveVerb(word) {
  var w = word.toLowerCase();
  if (VERB_FORMS[w]) return VERB_FORMS[w];
  var s, past, pp, ing;
  if (/[sxz]|[cs]h$/.test(w) || /[^aeiou]o$/.test(w)) s = w + 'es';
  else if (w.slice(-1) === 'y' && !/[aeiou]y$/i.test(w)) s = w.slice(0,-1) + 'ies';
  else s = w + 's';
  if (/e$/.test(w) && !/ee$/.test(w)) { past = w + 'd'; pp = w + 'd'; }
  else if (w.slice(-1) === 'y' && !/[aeiou]y$/i.test(w)) { past = w.slice(0,-1) + 'ied'; pp = w.slice(0,-1) + 'ied'; }
  else { past = w + 'ed'; pp = w + 'ed'; }
  if (/e$/.test(w) && !/ee$/.test(w)) ing = w.slice(0,-1) + 'ing';
  else ing = w + 'ing';
  return { s: s, past: past, pp: pp, ing: ing };
}

function renderVerbForms(phrase) {
  var parts = phrase.split(/\s+/);
  var firstWord = parts[0];
  var rest = parts.slice(1).join(' ');
  var f = deriveVerb(firstWord);
  var prog = 'am/is/are ' + f.ing + (rest ? ' ' + rest : '');
  var perf = 'have/has ' + f.pp + (rest ? ' ' + rest : '');
  var html = '<details class="verb-forms-details"><summary>📖 动词形态变化</summary>';
  html += '<table class="verb-forms-table">';
  html += '<tr><td>动词常态在现在（原形）</td><td class="vfw">' + esc(phrase) + '</td></tr>';
  html += '<tr><td>动词常态在现在（三单）</td><td class="vfw">' + esc(f.s + (rest ? ' ' + rest : '')) + '</td></tr>';
  html += '<tr><td>动词常态在过去（一般过去式）</td><td class="vfw">' + esc(f.past + (rest ? ' ' + rest : '')) + '</td></tr>';
  html += '<tr><td>动词进行态在现在（现在进行式）</td><td class="vfw">' + esc(prog) + '</td></tr>';
  html += '<tr><td>动词完成态在现在（现在完成式）</td><td class="vfw">' + esc(perf) + '</td></tr>';
  html += '</table></details>';
  return html;
}

function renderCnSegmentsHighlight(segs) {
  if (!segs) return '';
  return segs.map(function(s) {
    if (s.type === 'phrase') return '<em><u>' + esc(s.text) + '</u></em>';
    return esc(s.text);
  }).join('');
}

// ===== 工具 =====
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2000); }
function speak(text) {
  if (!('speechSynthesis' in window)) { toast('浏览器不支持语音'); return; }
  speechSynthesis.cancel();
  // 预加载 voices（避免首次调用时 voices 为空导致静默失败）
  if (!speechSynthesis.getVoices().length) {
    speechSynthesis.addEventListener('voiceschanged', function() {}, { once: true });
  }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US'; u.rate = 0.9; u.volume = 1;
  // Chrome 修复：cancel() 后需延迟 speak()，避免竞态条件导致无声
  setTimeout(function() { speechSynthesis.speak(u); }, 50);
}

// ===== 音效（Web Audio API 合成，无需外部文件） =====
function playCorrectSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    [523, 659].forEach(function(freq, i) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.18);
    });
  } catch(e) { /* audio not available */ }
}
function playWrongSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.linearRampToValueAtTime(200, now + 0.25);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch(e) { /* audio not available */ }
}

// ===== 动画触发 =====
function animateCorrect(el) {
  el.classList.add('correct-anim');
  el.addEventListener('animationend', function() { el.classList.remove('correct-anim'); }, { once: true });
}
function animateWrong(el) {
  el.classList.add('wrong-anim');
  el.addEventListener('animationend', function() { el.classList.remove('wrong-anim'); }, { once: true });
}

// ===== 渲染分发 =====
function renderAppBody() {
  const body = document.getElementById('appBody');
  let html = '';
  if (state.mode === 'learn') html = renderLearn();
  else if (state.mode === 'fill') html = renderFill();
  else if (state.mode === 'en2cn') html = renderEn2Cn();
  else if (state.mode === 'cn2en') html = renderCn2En();
  else if (state.mode === 'pitfalls') html = renderPitfalls();
  else if (state.mode === 'flash') html = renderFlash();
  else if (state.mode === 'pdf') html = renderPdf();
  body.innerHTML = html;
  // 工具栏
  const sc = document.getElementById('shuffleCb'); if (sc) sc.onchange = e => { state.shuffle = e.target.checked; renderAppBody(); };
  const ow = document.getElementById('onlyWrongCb'); if (ow) ow.onchange = e => { state.onlyWrong = e.target.checked; renderAppBody(); };
  const pow = document.getElementById('pdfOnlyWrongCb'); if (pow) pow.onchange = e => { state.pdfOnlyWrong = e.target.checked; renderAppBody(); };
  // 侧边栏筛选（手机端选择后自动收起抽屉）
  const closeDrawerIfMobile = () => { if (window.innerWidth <= 768) state.sidebarOpen = false; };
  document.querySelectorAll('.filter-btn[data-unit]').forEach(b => b.onclick = () => { state.unitFilter = b.dataset.unit; closeDrawerIfMobile(); renderAppBody(); });
  document.querySelectorAll('.filter-btn[data-pos]').forEach(b => b.onclick = () => { state.posFilter = b.dataset.pos; closeDrawerIfMobile(); renderAppBody(); });
  document.querySelectorAll('.filter-btn[data-diff]').forEach(b => b.onclick = () => { state.diffFilter = parseInt(b.dataset.diff); closeDrawerIfMobile(); renderAppBody(); });
  // 填空测试：Enter 触发逐题批改
  document.querySelectorAll('input.q-input').forEach(function(inp) {
    inp.addEventListener('keydown', function(e) {
      if (e.code === 'Enter') { e.preventDefault(); gradeSingleFill(this.dataset.qid); }
    });
  });
  // 看中写英：Enter 触发逐题批改
  document.querySelectorAll('input.cn2en-input').forEach(function(inp) {
    inp.addEventListener('keydown', function(e) {
      if (e.code === 'Enter') { e.preventDefault(); gradeSingleCn2En(parseInt(this.dataset.pnum)); }
    });
  });
}

// ===== 考点辨析交互 =====
function toggleTestAnswer(pitId) {
  state.pitfallShowAnswers[pitId] = !state.pitfallShowAnswers[pitId];
  const ta = document.getElementById('ta-' + pitId);
  if (ta) ta.classList.toggle('show');
  const btn = document.querySelector('.test-show-btn[data-pitid="' + pitId + '"]');
  if (btn) btn.textContent = state.pitfallShowAnswers[pitId] ? '隐藏答案' : '显示答案与解析';
}

function navigateToPitfall(pitId) {
  // After switching to pitfalls mode, scroll to the specific pitfall
  state.pitfallShowAnswers = {};
  setTimeout(() => {
    const el = document.getElementById('pit-' + pitId);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.style.boxShadow = '0 0 0 3px var(--accent)'; setTimeout(() => { el.style.boxShadow = ''; }, 2000); }
  }, 200);
}

// 从考点辨析跳转到学习卡片
function jumpToPhrase(semId, num) {
  state.semId = semId;
  state.mode = 'learn';
  state.unitFilter = 'all';
  state.posFilter = 'all';
  state.diffFilter = 'all';
  state.search = '';
  state.sidebarOpen = false;
  renderAll();
  setTimeout(() => {
    const el = document.getElementById('pc-' + num);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.style.boxShadow = '0 0 0 3px var(--orange)'; setTimeout(() => { el.style.boxShadow = ''; }, 2000); }
  }, 300);
}
// Expose to global scope for onclick in rendered HTML
window.jumpToPhrase = jumpToPhrase;

function renderAll() {
  renderHeader();
  renderAppBody();
}

// ===== 事件委托（替代内联 onclick） =====
document.addEventListener('click', e => {
  // 侧边栏遮罩点击（手机端关闭抽屉）
  if (e.target.classList && e.target.classList.contains('sidebar-backdrop')) {
    state.sidebarOpen = false; renderAppBody(); return;
  }
  const t = e.target.closest('button, .pdf-opt, .flashcard, .sem-tab, .mode-tab');
  if (!t) return;
  if (t.id === 'filterToggle') { state.sidebarOpen = !state.sidebarOpen; renderAppBody(); return; }
  if (t.classList.contains('act-speak')) { speak(t.dataset.text); return; }
  if (t.classList.contains('act-master')) { toggleMaster(parseInt(t.dataset.num)); return; }
  if (t.classList.contains('act-grade-fill')) { gradeFill(); return; }
  if (t.classList.contains('act-grade-single-fill')) { gradeSingleFill(t.dataset.qid); return; }
  if (t.classList.contains('act-reset-fill')) { resetFill(); return; }
  if (t.classList.contains('act-show-ref')) { showRef(parseInt(t.dataset.num)); return; }
  if (t.classList.contains('act-mark-dict')) { markDict(t.dataset.mode, parseInt(t.dataset.num), t.dataset.ok === '1'); return; }
  if (t.classList.contains('act-grade-cn2en')) { gradeCn2En(); return; }
  if (t.classList.contains('act-grade-single-cn2en')) { gradeSingleCn2En(parseInt(t.dataset.pnum)); return; }
  if (t.classList.contains('act-reset-cn2en')) { resetCn2En(); return; }
  if (t.classList.contains('act-flash-prev')) { nextFlash(-1); return; }
  if (t.classList.contains('act-flash-next')) { nextFlash(1); return; }
  if (t.classList.contains('act-gen-pdf')) { generatePdf(); return; }
  if (t.classList.contains('pdf-opt')) {
    if (t.dataset.pdfTraining !== undefined) {
      state.pdfTraining = t.dataset.pdfTraining === 'all' ? 'all' : parseInt(t.dataset.pdfTraining);
      renderAppBody(); return;
    }
    state.pdfType = t.dataset.pdf; renderAppBody(); return;
  }
  if (t.id === 'flashcard') { flipFlash(); return; }
  if (t.classList.contains('sem-tab')) { state.semId = t.dataset.sem; state.unitFilter = 'all'; state.flashIdx = 0; state.sidebarOpen = false; state.pitfallCatFilter = 'all'; state.pitfallSearch = ''; state.pitfallShowAnswers = {}; renderAll(); return; }
  if (t.classList.contains('mode-tab')) { state.mode = t.dataset.mode; state.flashIdx = 0; state.sidebarOpen = false; state.pitfallCatFilter = 'all'; renderAll(); return; }
  // Pitfalls: category filter
  if (t.classList.contains('pitfalls-cat-btn')) { state.pitfallCatFilter = t.dataset.pitcat; state.pitfallShowAnswers = {}; renderAppBody(); return; }
  // Pitfalls: test answer toggle
  if (t.classList.contains('test-show-btn')) { toggleTestAnswer(t.dataset.pitid); return; }
  // Pitfalls: badge click on learning card
  if (t.classList.contains('pit-badge')) { state.mode = 'pitfalls'; state.pitfallCatFilter = 'all'; state.sidebarOpen = false; navigateToPitfall(t.dataset.pitid); renderAll(); return; }
});

// ===== 顶部控件（仅在独立运行或 phrases 视图激活时绑定）=====
(function() {
  var searchBox = document.getElementById('searchBox');
  if (searchBox) {
    searchBox.addEventListener('input', function(e) { state.search = e.target.value; if (state.mode === 'learn' || state.mode === 'flash' || state.mode === 'en2cn' || state.mode === 'cn2en') renderAppBody(); });
  }
})();

document.addEventListener('input', e => {
  if (e.target.id === 'pitfallSearchBox') { state.pitfallSearch = e.target.value; state.pitfallShowAnswers = {}; renderAppBody(); }
});

// 主题按钮（仅独立运行时绑定，Hub 核心已处理）
(function() {
  if (typeof HUB !== 'undefined') return;
  var themeBtn = document.getElementById('themeBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function() {
      var cur = document.documentElement.getAttribute('data-theme');
      var next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      themeBtn.textContent = next === 'dark' ? '☀️' : '🌙';
      localStorage.setItem('vp79_theme', next);
    });
  }
})();

// 主题初始化（仅在独立运行时，Hub 核心已处理）
(function() {
  if (typeof HUB !== 'undefined') return;
  var savedTheme = localStorage.getItem('vp79_theme');
  if (savedTheme) { document.documentElement.setAttribute('data-theme', savedTheme); }
})();

// 快捷键（所有模式通用，保留）
document.addEventListener('keydown', function(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (typeof state === 'undefined') return;
  if (state.mode === 'flash') {
    if (e.code === 'Space') { e.preventDefault(); flipFlash(); }
    else if (e.code === 'ArrowRight') { nextFlash(1); }
    else if (e.code === 'ArrowLeft') { nextFlash(-1); }
  }
});

// ===== Hub 集成: PhrasesWiz Junior 作为 Hub 的一个视图 =====

// 设为全局引用（Hub 首页卡片统计需要）
window.PHRASES_DATA = DATA;

// renderPhrasesView — Hub 调用入口
function renderPhrasesView() {
  // Hub 顶栏（由 renderMain 调用 renderTopBar 后进入本函数）
  renderTopBar();
  // 重建 phrases 内部结构到 mainContent
  var main = document.getElementById('mainContent');
  if (!main) { renderAll(); return; }
  main.innerHTML = '<header>' +
    '<div class="header-row">' +
      '<span class="title"><span class="title-icon">✨</span><span class="title-main">Phrases</span><span class="title-wiz">Wiz</span><span class="title-junior">Junior</span><span class="title-cn">· 短语精灵</span></span>' +
      '<div class="sem-tabs" id="semTabs"></div>' +
      '<span class="spacer"></span>' +
      '<input type="text" class="search-box" id="searchBox" placeholder="🔍 搜索短语/中文/词性...">' +
      '<span class="progress-mini" id="progressMini"></span>' +
    '</div>' +
    '<div class="mode-tabs" id="modeTabs"></div>' +
  '</header>' +
  '<div id="appBody"></div>' +
  '<div class="toast" id="toast"></div>' +
  '<div class="print-area" id="printArea" style="display:none"></div>';
  // 运行 phrases 内部渲染
  renderAll();
}

// 仅在非 Hub 环境（独立运行时）自动初始化
// Hub 环境下由 hub-core.js 的 renderMain 驱动
if (typeof HUB === 'undefined') {
  renderAll();
}

