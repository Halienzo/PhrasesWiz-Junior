// ===== hub-home.js — Hub 首页渲染 =====

function renderHub() {
  const moleCount = getMcData().totalQuestions;
  const moleBatches = getMcData().batchCount;
  const fissionCount = getPosData().totalQuestions;
  const fissionBatches = getPosData().batchCount;
  const phrasesCount = window.PHRASES_DATA.meta.totalPhrases;
  const phrasesSemesters = window.PHRASES_DATA.meta.semesterCount;

  return '<div class="hub-container">' +
    '<div class="hub-brand">' +
      '<div class="brand-main">' +
        '<span class="brand-cn">无畏无瑕</span>' +
      '</div>' +
      '<div class="brand-en">Fearless &amp; Flawless</div>' +
      '<div class="brand-motto">' +
        '<p class="motto-cn">"胆大心细不怕难，满分就在下一关。"</p>' +
        '<p class="motto-en">"Bold and careful, that\'s the way, perfect score is here to stay."</p>' +
      '</div>' +
    '</div>' +
    '<div class="hub-cards">' +
      // Card 1: Find the Mole
      '<div class="hub-card hub-card-mole" data-view="mole">' +
        '<div class="card-icon mole-icon"><span class="icon-inner">🕵️</span></div>' +
        '<div class="card-title">Find the Mole</div>' +
        '<div class="card-subtitle">单刀营救</div>' +
        '<div class="card-desc">云南省中考单项选择题型专项训练</div>' +
        '<div class="card-stats">' + moleBatches + ' 批次 · ' + moleCount + ' 题</div>' +
      '</div>' +
      // Card 2: Word Fission Mission
      '<div class="hub-card hub-card-fission" data-view="fission">' +
        '<div class="card-icon fission-icon"><span class="icon-inner">⚛️</span></div>' +
        '<div class="card-title">Word Fission Mission</div>' +
        '<div class="card-subtitle">词性裂变</div>' +
        '<div class="card-desc">云南省中考单句词形填空专项训练</div>' +
        '<div class="card-stats">' + fissionBatches + ' 批次 · ' + fissionCount + ' 题</div>' +
      '</div>' +
      // Card 3: PhrasesWiz Junior
      '<div class="hub-card hub-card-phrases" data-view="phrases">' +
        '<div class="card-icon phrases-icon"><span class="icon-inner">✨</span></div>' +
        '<div class="card-title">PhrasesWiz Junior</div>' +
        '<div class="card-subtitle">短语精灵</div>' +
        '<div class="card-desc">初中英语动词短语系统学习（7-9 年级）</div>' +
        '<div class="card-stats">' + phrasesSemesters + ' 学期 · ' + phrasesCount + ' 短语</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

// bindMainEvents — Hub 首页无额外绑定需求，由全局委托处理卡片点击
function bindMainEvents() {
  // Hub 首页的卡片 click 由 hub-core.js 的全局事件委托处理
  // Mole/Fission 的特有事件绑定由各模块 render 函数内部的 DOM 操作处理
}
