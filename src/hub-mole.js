// ===== hub-mole.js — Find the Mole · 单刀营救 =====

function renderMole() {
  const batch = getMoleBatch(HUB.mole.batchId);
  if (!batch) return '<div class="empty-state"><div class="big">⚠️</div>批次数据未找到</div>';

  const progress = loadHubProgress(PROGRESS_KEYS.mole);
  const state = HUB.mole;
  const isExam = state.mode === 'exam';
  const submitted = state.submitted;

  var html = '';

  // 得分面板
  if (!isExam || submitted) {
    var total = batch.count;
    var correct = 0;
    batch.questions.forEach(function(q) {
      if (state.answers[q.no] && state.answers[q.no] === q.answer) correct++;
    });
    html += '<div class="score-panel">' +
      '<span class="score-label">得分：</span>' +
      '<span class="score-value">' + correct + ' / ' + total + '</span>' +
      '<span class="score-pct">（' + Math.round(correct / total * 100) + '%）</span>' +
    '</div>';
  }

  // 题目列表
  html += '<div class="questions-list">';
  batch.questions.forEach(function(q) {
    var selected = state.answers[q.no] || '';
    var isCorrect = selected === q.answer;
    var showResult = state.showAnswer[q.no] || submitted;
    var locked = !isExam && showResult;

    html += '<div class="mole-card' + (showResult ? (isCorrect ? ' mole-correct' : ' mole-wrong') : '') + '" id="mq-' + q.no + '">';
    html += '<div class="mole-head">' +
      '<span class="q-num">[' + q.no + ']</span>' +
      '<span class="q-stem">' + esc(q.stem) + '</span>' +
    '</div>';
    html += '<div class="mole-options">';
    q.options.forEach(function(opt) {
      var cls = 'mole-opt';
      if (locked) {
        if (opt.label === q.answer) cls += ' mole-ans-correct';
        else if (opt.label === selected && !isCorrect) cls += ' mole-ans-wrong';
      } else if (selected === opt.label) {
        cls += ' mole-selected';
      }
      var disabled = locked ? ' disabled' : '';
      html += '<button class="' + cls + '" data-qno="' + q.no + '" data-opt="' + opt.label + '"' + disabled + '>' +
        '<span class="opt-label">' + opt.label + '</span>' +
        '<span class="opt-text">' + esc(opt.text) + '</span>' +
      '</button>';
    });
    html += '</div>';

    // 反馈
    if (showResult) {
      if (isCorrect) {
        html += '<div class="q-feedback ok">✓ 正确！</div>';
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
  var opt = q.options.find(function(o) { return o.label === label; });
  return opt ? esc(opt.text) : '';
}

function handleMoleOption(t) {
  if (HUB.view !== 'mole') return;
  var qNo = parseInt(t.dataset.qno, 10);
  var opt = t.dataset.opt;
  var state = HUB.mole;
  var batch = getMoleBatch(state.batchId);
  var q = batch.questions.find(function(x) { return x.no === qNo; });
  if (!q) return;

  // 即时模式：锁定后不可更改
  if (state.mode === 'instant' && state.showAnswer[qNo]) return;

  state.answers[qNo] = opt;

  if (state.mode === 'instant') {
    state.showAnswer[qNo] = true;
    // 记录进度
    var progress = loadHubProgress(PROGRESS_KEYS.mole);
    if (!progress[state.batchId]) progress[state.batchId] = {};
    progress[state.batchId][qNo] = opt === q.answer ? 'ok' : 'wrong';
    saveHubProgress(PROGRESS_KEYS.mole, progress);
  }

  // 局部刷新该题卡片
  refreshMoleCard(qNo);
}

function refreshMoleCard(qNo) {
  var card = document.getElementById('mq-' + qNo);
  if (!card) { renderMain(); return; }

  var batch = getMoleBatch(HUB.mole.batchId);
  var q = batch.questions.find(function(x) { return x.no === qNo; });
  if (!q) return;

  var state = HUB.mole;
  var selected = state.answers[qNo] || '';
  var isCorrect = selected === q.answer;
  var showResult = state.showAnswer[qNo];
  var locked = state.mode === 'instant' && showResult;

  // 重建选项区域
  var optsHtml = '';
  q.options.forEach(function(opt) {
    var cls = 'mole-opt';
    if (locked) {
      if (opt.label === q.answer) cls += ' mole-ans-correct';
      else if (opt.label === selected && !isCorrect) cls += ' mole-ans-wrong';
    } else if (selected === opt.label) {
      cls += ' mole-selected';
    }
    var disabled = locked ? ' disabled' : '';
    optsHtml += '<button class="' + cls + '" data-qno="' + qNo + '" data-opt="' + opt.label + '"' + disabled + '>' +
      '<span class="opt-label">' + opt.label + '</span>' +
      '<span class="opt-text">' + esc(opt.text) + '</span>' +
    '</button>';
  });

  var optsEl = card.querySelector('.mole-options');
  if (optsEl) optsEl.innerHTML = optsHtml;

  // 更新卡片 class
  card.className = 'mole-card' + (showResult ? (isCorrect ? ' mole-correct' : ' mole-wrong') : '');

  // 更新反馈
  var fbEl = card.querySelector('.q-feedback');
  if (showResult) {
    var fbHtml = '';
    if (isCorrect) {
      fbHtml = '<div class="q-feedback ok">✓ 正确！</div>';
    } else {
      fbHtml = '<div class="q-feedback bad">✗ 错误！正确答案是 ' + q.answer + '. ' + getOptionText(q, q.answer) + '</div>';
    }
    if (fbEl) fbEl.outerHTML = fbHtml;
    else card.insertAdjacentHTML('beforeend', fbHtml);
  }

  updateMoleScore();
}

function updateMoleScore() {
  var panel = document.querySelector('.score-panel');
  if (!panel) return;
  var batch = getMoleBatch(HUB.mole.batchId);
  var state = HUB.mole;
  var correct = 0;
  batch.questions.forEach(function(q) {
    if (state.answers[q.no] && state.answers[q.no] === q.answer) correct++;
  });
  panel.innerHTML = '<span class="score-label">得分：</span>' +
    '<span class="score-value">' + correct + ' / ' + batch.count + '</span>' +
    '<span class="score-pct">（' + Math.round(correct / batch.count * 100) + '%）</span>';
}

function handleMoleSubmit() {
  var state = HUB.mole;
  state.submitted = true;

  var batch = getMoleBatch(state.batchId);
  var progress = loadHubProgress(PROGRESS_KEYS.mole);
  if (!progress[state.batchId]) progress[state.batchId] = {};
  batch.questions.forEach(function(q) {
    var selected = state.answers[q.no];
    progress[state.batchId][q.no] = (selected && selected === q.answer) ? 'ok' : 'wrong';
  });
  saveHubProgress(PROGRESS_KEYS.mole, progress);

  renderMain();
}
