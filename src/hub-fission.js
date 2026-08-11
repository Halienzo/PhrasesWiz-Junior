// ===== hub-fission.js — Word Fission Mission · 词性裂变 =====

function renderFission() {
  var batch = getFissionBatch(HUB.fission.batchId);
  if (!batch) return '<div class="empty-state"><div class="big">⚠️</div>批次数据未找到</div>';

  var state = HUB.fission;
  var isExam = state.mode === 'exam';
  var submitted = state.submitted;

  var html = '';

  // 得分面板
  if (!isExam || submitted) {
    var total = batch.count;
    var correct = 0;
    batch.questions.forEach(function(q) {
      if (state.answers[q.no] && checkFillAnswer(state.answers[q.no], q.answer)) correct++;
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
    var typed = state.answers[q.no] || '';
    var isCorrect = checkFillAnswer(typed, q.answer);
    var showResult = state.showAnswer[q.no] || submitted;
    var locked = state.mode === 'instant' && showResult;

    html += '<div class="fission-card' + (showResult ? (isCorrect ? ' fission-correct' : ' fission-wrong') : '') + '" id="fq-' + q.no + '">';
    html += '<div class="fission-head">';
    html += '<span class="q-num">[' + q.no + ']</span>';

    // 把句子中的 ______ 替换为输入框
    var parts = q.sentence.split(/(_+)/g);
    html += '<span class="q-sentence">';
    parts.forEach(function(part) {
      if (/^_+$/.test(part)) {
        var cls = 'fission-input' + (locked ? (isCorrect ? ' correct' : ' wrong') : '');
        var val = esc(typed);
        var ro = locked ? ' readonly' : '';
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
  var batch = getFissionBatch(HUB.fission.batchId);
  var q = batch.questions.find(function(x) { return x.no === qNo; });
  if (!q) return;

  HUB.fission.answers[qNo] = value;
  if (!value || !value.trim()) return; // 空输入不判定

  HUB.fission.showAnswer[qNo] = true;
  var isCorrect = checkFillAnswer(value, q.answer);

  // 记录进度
  var progress = loadHubProgress(PROGRESS_KEYS.fission);
  if (!progress[HUB.fission.batchId]) progress[HUB.fission.batchId] = {};
  progress[HUB.fission.batchId][qNo] = isCorrect ? 'ok' : 'wrong';
  saveHubProgress(PROGRESS_KEYS.fission, progress);

  // 刷新该题
  refreshFissionCard(qNo);
}

function refreshFissionCard(qNo) {
  var card = document.getElementById('fq-' + qNo);
  if (!card) { renderMain(); return; }

  var batch = getFissionBatch(HUB.fission.batchId);
  var q = batch.questions.find(function(x) { return x.no === qNo; });
  if (!q) return;

  var typed = HUB.fission.answers[qNo] || '';
  var isCorrect = checkFillAnswer(typed, q.answer);
  var showResult = HUB.fission.showAnswer[qNo];
  var locked = HUB.fission.mode === 'instant' && showResult;

  // 更新 input class
  var inp = card.querySelector('.fission-input');
  if (inp) {
    inp.className = 'fission-input' + (locked ? (isCorrect ? ' correct' : ' wrong') : '');
    if (locked) inp.readOnly = true;
  }

  // 更新 card class
  card.className = 'fission-card' + (showResult ? (isCorrect ? ' fission-correct' : ' fission-wrong') : '');

  // 更新反馈
  var fbEl = card.querySelector('.q-feedback');
  if (showResult) {
    var fbHtml = '';
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
  var panel = document.querySelector('.score-panel');
  if (!panel) return;
  var batch = getFissionBatch(HUB.fission.batchId);
  var state = HUB.fission;
  var correct = 0;
  batch.questions.forEach(function(q) {
    if (state.answers[q.no] && checkFillAnswer(state.answers[q.no], q.answer)) correct++;
  });
  panel.innerHTML = '<span class="score-label">得分：</span>' +
    '<span class="score-value">' + correct + ' / ' + batch.count + '</span>' +
    '<span class="score-pct">（' + Math.round(correct / batch.count * 100) + '%）</span>';
}

function handleFissionSubmit() {
  var state = HUB.fission;
  state.submitted = true;

  var batch = getFissionBatch(state.batchId);
  var progress = loadHubProgress(PROGRESS_KEYS.fission);
  if (!progress[state.batchId]) progress[state.batchId] = {};
  batch.questions.forEach(function(q) {
    var typed = state.answers[q.no] || '';
    progress[state.batchId][q.no] = checkFillAnswer(typed, q.answer) ? 'ok' : 'wrong';
  });
  saveHubProgress(PROGRESS_KEYS.fission, progress);

  renderMain();
}
