// build.js — 解析 verb phrases 7-9.txt 为结构化 JSON
// 运行: node build.js
// 产出: data.json (内嵌到 index.html)

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'verb phrases 7-9.txt');
const raw = fs.readFileSync(SRC, 'utf-8');
// 归一化换行
const lines = raw.replace(/\r\n?/g, '\n').split('\n');

// 中文对应词映射表（用于在中文例句中高亮英文短语的对应中文）
const CN_MAPPING = require('./cn-mapping');

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
    // 匹配 "1. relaxing" 或 "1.relaxing" 或 "1 relaxing"
    // 答案可能连写（如 "1. relaxing2. moving"），用非贪婪捕获+前瞻截止到下一个数字
    const ansRegex = /(\d+)[.\s、]+(.+?)(?=\d+[.\s、]|$)/g;
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
  // 匹配 "1-5. 词性转换（动词→形容词）" 等
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
    const descMatch = block.match(/考点[^\n]*\n?([\s\S]*?)(?=\n?\d+\.\s)/);
    const description = descMatch ? descMatch[1].trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ') : '';

    // 提取题目：按题号分割
    const questions = [];
    const qParts = block.split(/\n(?=\d+\.\s*\S)/);
    for (const part of qParts) {
      const qMatch = part.match(/^(\d+)\.\s*([\s\S]*?)(?=\n\s*(?:[A-D][.\s])|$)/);
      if (!qMatch) continue;
      const no = parseInt(qMatch[1], 10);
      const stemBody = qMatch[2].trim();

      // Extract options from remainder (after stem, before next question or answer)
      let remainder = part.substring(qMatch[0].length);
      // Strip answer section from remainder to avoid false option matches
      const ansIdx = remainder.search(/\n\s*答案/);
      if (ansIdx >= 0) remainder = remainder.substring(0, ansIdx);
      const options = [];
      const optRegex = /\n?\s*([A-D])[.\s]\s*([\s\S]*?)(?=\n?\s*[A-D][.\s]|$)/g;
      let om;
      while ((om = optRegex.exec(remainder)) !== null) {
        options.push({ label: om[1], text: om[2].trim().replace(/\n/g, ' ').replace(/\s+/g, ' ') });
      }

      // Limit to 4 options (MC questions have exactly 4; prevents bleed from adjacent questions)
      if (options.length > 4) options.length = 4;
      if (options.length === 0) {
        const looseOptRegex = /([A-D])[.\s、]\s*(\S[\s\S]*?)(?=\s*[A-D][.\s、]|$)/g;
        let lom;
        while ((lom = looseOptRegex.exec(remainder)) !== null) {
          options.push({ label: lom[1], text: lom[2].trim().replace(/\n/g, ' ').replace(/\s+/g, ' ') });
        }
      }

      const stem = stemBody.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

      questions.push({ no, stem, options });
    }

    // Special case for training 2 question 7 (missing "7." prefix)
    if (batchId === 2 && !questions.find(q => q.no === 7)) {
      const q7Match = block.match(/(?:^|\n)(Among all the dresses in the shop[\s\S]*?)(?=\n\s*\d+\.\s*\S|\n\s*答案)/);
      if (q7Match) {
        const q7Text = q7Match[0].trim();
        const q7Options = [];
        const q7OptRegex = /([A-D])[.\s]\s*([\s\S]*?)(?=\s*[A-D][.\s]|$)/g;
        let o7m;
        while ((o7m = q7OptRegex.exec(q7Text)) !== null) {
          q7Options.push({ label: o7m[1], text: o7m[2].trim().replace(/\n/g, ' ').replace(/\s+/g, ' ') });
        }
        const stem7 = q7Text.split(/\n\s*A[.\s]/)[0].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        questions.splice(6, 0, { no: 7, stem: stem7, options: q7Options });
      }
    }

    // 提取答案
    const ansSection = block.match(/答案[：:\s]*([\s\S]*?)$/);
    const ansText = ansSection ? ansSection[1].replace(/\n/g, ' ').replace(/\s+/g, ' ') : '';

    const ansMap = {};
    // Format 1: "1-5. ABACB" or "1-5: ABACB" or "1—5：A A B C C"
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
    // Format 2: "1.A2.B3.C..." (tight concatenation without spacing)
    const tightRegex = /(\d+)[.\s、]*([A-D])/g;
    let tm;
    while ((tm = tightRegex.exec(ansText)) !== null) {
      const n = parseInt(tm[1], 10);
      if (!ansMap[n]) ansMap[n] = tm[2];
    }

    // 组装
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

// ---------- 学期定义（基于深度分析的行号） ----------
// 每个学期: 短语区 [phraseStart, phraseEnd) + 训练题区
// 训练题每个 section 的题目行/答案行（1-based）
const SEMESTERS = [
  {
    id: '7a', name: '七年级上册', short: '7上',
    phraseStart: 1, phraseEnd: 1000,
    trainings: [
      { title: '训练（1）', units: 'Starter U1-3 + U1-2', qLine: 1003, aLines: [1006] },
      { title: '训练（2）', units: 'U2-5', qLine: 1011, aLines: [1013] },
      { title: '训练（3）', units: 'U5-7', qLine: 1018, aLines: [1020] },
    ]
  },
  {
    id: '7b', name: '七年级下册', short: '7下',
    phraseStart: 1025, phraseEnd: 2472,
    trainings: [
      { title: '训练（1）', units: 'U1-3', qLine: 2475, aLines: [2478] },
      { title: '训练（2）', units: 'U3-4', qLine: 2483, aLines: [2486] },
      { title: '训练（3）', units: 'U5-6', qLine: 2491, aLines: [2495] },
      { title: '训练（4）', units: 'U7-8', qLine: 2500, aLines: [2503] },
    ]
  },
  {
    id: '8a', name: '八年级上册', short: '8上',
    phraseStart: 2509, phraseEnd: 3698,
    trainings: [
      { title: '训练（1）', units: 'U1-2', qLine: 3701, aLines: [3703] },
      { title: '训练（2）', units: 'U2-5', qLine: 3708, aLines: [3711] },
      { title: '训练（3）', units: 'U5-6', qLine: 3716, aLines: [3719] },
      { title: '训练（4）', units: 'U7-8', qLine: 3724, aLines: [3727] },
    ]
  },
  {
    id: '8b', name: '八年级下册', short: '8下',
    phraseStart: 3732, phraseEnd: 4885,
    trainings: [
      { title: '训练（1）', units: 'U1-2', qLine: 4888, aLines: [4891] },
      { title: '训练（2）', units: 'U3-4', qLine: 4896, aLines: [4899] },
      { title: '训练（3）', units: 'U5-6', qLine: 4904, aLines: [4906] },
      { title: '训练（4）', units: 'U7-8', qLine: 4911, aLines: [4914] },
    ]
  },
  {
    id: '9a', name: '九年级上册', short: '9上',
    phraseStart: 4919, phraseEnd: 5736,
    trainings: [
      { title: '训练（1）', units: 'U1-3', qLine: 5739, aLines: [5742] },
      { title: '训练（2）', units: 'U4-6', qLine: 5747, aLines: [5750] },
      { title: '训练（3）', units: 'U7-8', qLine: 5758, qMultiLine: true, qRange: [5758, 5792], aLines: [], aRange: [5797, 5832] },
    ]
  },
  {
    id: '9b', name: '九年级下册', short: '9下',
    phraseStart: 5835, phraseEnd: 6196,
    trainings: [
      { title: '训练（1）', units: 'U1-2', qLine: 6199, aLines: [6202] },
      { title: '训练（2）', units: 'U3-5', qLine: 6207, aLines: [6210] },
    ]
  },
];

// ---------- 工具函数 ----------
const BE_WORDS = new Set(['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', "aren't", "isn't", "wasn't", "weren't"]);

// 词性归一化为大类
function categorizePos(pos) {
  const p = pos.toLowerCase();
  if (p.includes('动词')) return '动词短语';
  if (p.includes('名词')) return '名词短语';
  if (p.includes('副词')) return '副词短语';
  if (p.includes('介词')) return '介词短语';
  if (p.includes('连词') || p.includes('连接')) return '连词短语';
  if (p.includes('形容词')) return '形容词短语';
  if (p.includes('限定词')) return '限定词短语';
  return '其他';
}

// 提取句法结构标记，容错未闭合括号（原文档部分行如 "（SVP + Complex-NC**" 缺右括号）
function extractStructure(line) {
  // 优先匹配完整的 （...）
  let m = line.match(/（([^）]+)）/);
  if (m) return m[1].trim();
  // 容错: （ 后到行尾或 ** 之间
  m = line.match(/（([^）*]+?)(?:\*\*|$)/);
  if (m) return m[1].trim();
  return '';
}

// 句法结构 → 难度星级
function difficultyLevel(structure) {
  if (!structure) return 1;
  const hasComplex = /Complex/.test(structure);
  const hasCompound = /Compound/.test(structure);
  if (hasComplex && hasCompound) return 3;
  if (hasComplex) return 2;
  return 1;
}

// 解析英文例句中的加粗段（**...**），返回带高亮标记的片段数组
// 同时识别 be 动词变化（整词）一并标记
function parseEnSentence(en) {
  // 先按 ** 拆分加粗
  const parts = en.split(/\*\*/);
  // 偶数索引=普通文本，奇数索引=加粗短语
  const segments = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === '') continue;
    if (i % 2 === 1) {
      segments.push({ type: 'phrase', text: parts[i] });
    } else {
      // 普通文本里识别 be 动词变化（整词）
      // 用正则切分，保留匹配
      const re = /\b(are|is|am|was|were|been|being|be|aren't|isn't|wasn't|weren't)\b/gi;
      let last = 0;
      let m;
      while ((m = re.exec(parts[i])) !== null) {
        if (m.index > last) segments.push({ type: 'text', text: parts[i].slice(last, m.index) });
        segments.push({ type: 'be', text: m[0] });
        last = m.index + m[0].length;
      }
      if (last < parts[i].length) segments.push({ type: 'text', text: parts[i].slice(last) });
    }
  }
  return segments;
}

// 解析中文例句：把对应英文短语的中文译法标记为高亮
// 1) 若中文已含 **...**（9上/9下原文自带），直接解析
// 2) 否则用 CN_MAPPING 里的对应词包裹 **...** 后解析
// 返回 segments 数组: {type:'text'|'phrase', text}
function parseCnSentence(cn, phrase, semId) {
  let marked = cn;
  // 若原文未含加粗，用映射表标注
    if (!marked.includes('**') && CN_MAPPING[semId] && CN_MAPPING[semId][phrase]) {
    const words = CN_MAPPING[semId][phrase];
    // 按长度降序排列，先匹配长的，避免短词在已标记区内二次匹配
    words.sort((a, b) => b.length - a.length);
    for (const w of words) {
      if (!w) continue;
      // 仅匹配未被 SOH/STX 包裹的区域
      const escW = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escW, 'g');
      let m;
      while ((m = re.exec(marked)) !== null) {
        const beforeSOH = marked.lastIndexOf('\u0001', m.index);
        const beforeSTX = marked.lastIndexOf('\u0002', m.index);
        if (beforeSTX > beforeSOH) continue;
        marked = marked.substring(0, m.index) + '\u0001' + w + '\u0002' + marked.substring(m.index + w.length);
        re.lastIndex = m.index + 2;
      }
    }
    marked = marked.replace(/\u0001/g, '**').replace(/\u0002/g, '**');
  }
// 按 ** 拆分
  const parts = marked.split(/\*\*/);
  const segments = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === '') continue;
    segments.push({ type: i % 2 === 1 ? 'phrase' : 'text', text: parts[i] });
  }
  return segments;
}

// 解析生词注释行 "> *word* pos. 中文 | *word* pos. 中文"
function parseVocab(line) {
  const items = [];
  const parts = line.replace(/^>\s*/, '').split('|');
  for (const part of parts) {
    const m = part.match(/^\s*\*([^*]+)\*\s*([^.]*)\.?\s*(.+?)\s*$/);
    if (m) {
      items.push({ word: m[1].trim(), pos: m[2].trim(), cn: m[3].trim() });
    } else {
      // 兜底：无 * 包裹的（如 "pass down 传承"）
      const m2 = part.match(/^\s*\*?([^*.]+?)\*?\s*([a-z]*)\.?\s*(.+?)\s*$/);
      if (m2) items.push({ word: m2[1].trim(), pos: m2[2].trim(), cn: m2[3].trim() });
    }
  }
  return items.filter(v => v.word && v.cn);
}

// ---------- 解析短语区 ----------
function parsePhrases(start, end, semId) {
  const phrases = [];
  const reNum = /^\*\*(\d+)\.\s+(.+?)\*\*/;
  let i = start - 1; // 转 0-based
  const stop = end;  // exclusive
  while (i < stop && i < lines.length) {
    const m = lines[i].match(reNum);
    if (!m) { i++; continue; }
    const num = parseInt(m[1], 10);
    const phrase = m[2].trim();
    // 向下找词性、例句、生词
    let pos = '', basic = null, advanced = null, vocab = [];
    let j = i + 1;
    while (j < stop && j < lines.length) {
      const l = lines[j];
      if (/^\*\*\d+\.\s/.test(l)) break; // 下一条
      if (/^词性[：:]/.test(l)) {
        pos = l.replace(/^词性[：:]\s*/, '').trim();
      } else if (l.includes('初级例句') || /🔹/.test(l)) {
        // 结构标记
        const structure = extractStructure(l);
        // 下一行中文，再下一行英文
        const cn = (lines[j + 1] || '').trim();
        const en = (lines[j + 2] || '').trim();
        basic = { cn, en, structure, segments: parseEnSentence(en), cnSegments: parseCnSentence(cn, phrase, semId) };
        j += 2;
      } else if (l.includes('晋级例句') || /🔸/.test(l)) {
        const structure = extractStructure(l);
        const cn = (lines[j + 1] || '').trim();
        const en = (lines[j + 2] || '').trim();
        advanced = { cn, en, structure, segments: parseEnSentence(en), cnSegments: parseCnSentence(cn, phrase, semId) };
        j += 2;
      } else if (/^>\s/.test(l)) {
        vocab = parseVocab(l);
      }
      j++;
    }
    phrases.push({
      num, phrase, pos,
      posCategory: categorizePos(pos),
      difficulty: difficultyLevel(basic ? basic.structure : ''),
      basic, advanced, vocab
    });
    i = j;
  }
  return phrases;
}

// ---------- 解析训练题 ----------
// 题目行: 含 _________ 和 （中文提示） 的长句，多个题连写
// 答案: 三种格式
function parseTraining(tr) {
  let qText = '';
  if (tr.qMultiLine && tr.qRange) {
    for (let ln = tr.qRange[0]; ln <= tr.qRange[1]; ln++) qText += '\n' + (lines[ln - 1] || '');
  } else {
    qText = lines[tr.qLine - 1] || '';
  }
  let aText = '';
  if (tr.qMultiLine) {
    // 9上训3: 答案每行一条 "1-xxx"
    for (let ln = tr.aRange[0]; ln <= tr.aRange[1]; ln++) {
      aText += '\n' + (lines[ln - 1] || '');
    }
  } else {
    tr.aLines.forEach(ln => { aText += '\n' + (lines[ln - 1] || ''); });
  }

  // 解析题目: 按 (中文提示) 切分，每个题 = 空格前的句子 + 提示
  // 用 [（(]...[)）] 匹配（兼容半角右括号笔误）
  const questions = [];
  // 先把题目按提示括号切分
  const reHint = /[(（]([^)）]+)[)）]/g;
  let lastIdx = 0;
  let m;
  while ((m = reHint.exec(qText)) !== null) {
    const sentence = qText.slice(lastIdx, m.index).trim();
    const hint = m[1].trim();
    if (sentence) {
      // 统计空格数
      const blanks = (sentence.match(/_+/g) || []).length;
      questions.push({ sentence, hint_cn: hint, blanks });
    }
    lastIdx = m.index + m[0].length;
  }

  // 解析答案：题目数 N 已知
  // 三种格式: "1-xxx"(每行) / "1. xxx2. xxx"(连写) / "xxx,xxx"(逗号无编号)
  const N = questions.length;
  const cleaned = aText.replace(/(参考)?答案[：:#\s]*/g, ' ').replace(/#/g, ' ').trim();
  let answers = [];

  // 找出所有 "数字+分隔符(.、-)、)" 的位置，分隔符后可跟空格
  const reMarked = /(\d+)\s*([.、)\-])/g;
  const allMarks = [];
  let am;
  while ((am = reMarked.exec(cleaned)) !== null) {
    allMarks.push({
      no: parseInt(am[1], 10),
      noStart: am.index,
      textStart: reMarked.lastIndex,
      sep: am[2],
    });
  }
  // 贪心选出 1..N 递增序列: 从 expected=1 开始，找当前位置之后第一个 no==expected 的标记
  const valid = [];
  let searchFrom = 0;
  for (let target = 1; target <= N; target++) {
    // 在 allMarks 里找 noStart >= searchFrom 且 no==target 的
    let found = null;
    for (let i = 0; i < allMarks.length; i++) {
      if (allMarks[i].noStart >= searchFrom && allMarks[i].no === target) {
        found = allMarks[i];
        break;
      }
    }
    if (found) {
      valid.push(found);
      searchFrom = found.textStart;
    } else {
      break; // 序列断了
    }
  }
  if (valid.length >= 2) {
    for (let k = 0; k < valid.length; k++) {
      const endPos = k + 1 < valid.length ? valid[k + 1].noStart : cleaned.length;
      let text = cleaned.slice(valid[k].textStart, endPos).trim();
      // 去尾部多余分隔符/编号残留
      text = text.replace(/[,，；;]\s*$/, '').trim();
      answers.push({ no: valid[k].no, text });
    }
    answers.sort((a, b) => a.no - b.no);
  } else {
    // 逗号格式（无编号）
    let body = cleaned.replace(/[.。]$/, '');
    const items = body.split(/[,，]/).map(s => s.trim()).filter(Boolean);
    answers = items.map((t, i) => ({ no: i + 1, text: t }));
  }

  // 把答案分配到题目（题号 1..N 对应）
  // 注意双空格题: 答案里可能用 "…"/"..." 分隔多空（如 "set…free"、"help ... with"）
  const questionsOut = questions.map((q, i) => {
    const ans = answers.find(a => a.no === i + 1);
    let ansText = ans ? ans.text : '';
    // 把答案按 … / ... / ; 拆成多空格答案
    const multiAns = ansText.split(/[…;；]|\.\.\.|\.\./).map(s => s.trim()).filter(Boolean);
    return {
      no: i + 1,
      sentence: q.sentence,
      hint_cn: q.hint_cn,
      blanks: q.blanks,
      answers: q.blanks > 1 && multiAns.length > 1 ? multiAns : [ansText],
    };
  });

  return {
    title: tr.title,
    units: tr.units,
    questions: questionsOut,
  };
}

// ---------- Unit 反推 ----------
// 短语自测表未标 Unit。按训练题的 Unit 区间，把短语按编号比例分配。
// 但更稳妥: 用训练题题号范围反推不可靠（题与短语不一一对应）。
// 改为: 按 Unit 数量把短语编号区间均分。例如 7上 70 条短语，训练题覆盖 Starter+U1-7，共约 8 个单元块。
// 实际上短语编号顺序大致按教材顺序，所以按 Unit 区间均分编号是合理近似。
function assignUnitsToPhrases(phrases, trainings) {
  // 提取训练题 Unit 区间，如 ["Starter U1-3 + U1-2", "U2-5", "U5-7", "U7-8"]
  // 简化: 把短语按数量均分到各训练区间
  const n = phrases.length;
  const k = trainings.length;
  const per = Math.ceil(n / k);
  phrases.forEach((p, i) => {
    const ti = Math.min(Math.floor(i / per), k - 1);
    p.unit = trainings[ti].units;
  });
  return phrases;
}

// ---------- 主流程 ----------
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

const data = { semesters: [], meta: {} };
let totalPhrases = 0, totalQuestions = 0;

for (const sem of SEMESTERS) {
  const phrases = parsePhrases(sem.phraseStart, sem.phraseEnd, sem.id);
  const trainings = sem.trainings.map(parseTraining);
  assignUnitsToPhrases(phrases, sem.trainings);
  let qCount = trainings.reduce((s, t) => s + t.questions.length, 0);
  totalPhrases += phrases.length;
  totalQuestions += qCount;
  data.semesters.push({
    id: sem.id, name: sem.name, short: sem.short,
    phrases, trainings, phraseCount: phrases.length, questionCount: qCount
  });
}

data.meta = {
  totalPhrases,
  totalQuestions,
  semesterCount: SEMESTERS.length,
  generatedAt: new Date().toISOString(),
};

// 校验报告
console.log('=== 解析校验报告 ===');
console.log('学期数:', data.meta.semesterCount);
console.log('短语总数:', totalPhrases, '(预期 466)');
console.log('训练题总数:', totalQuestions, '(预期 ~446)');
console.log('');
data.semesters.forEach(s => {
  console.log(`[${s.short}] ${s.name}: 短语 ${s.phraseCount} 题 ${s.questionCount}`);
  // 检查每条短语是否完整
  const incomplete = s.phrases.filter(p => !p.basic || !p.advanced || p.vocab.length === 0);
  if (incomplete.length) {
    console.log('  ⚠ 不完整短语:', incomplete.map(p => p.num + '.' + p.phrase).join('; '));
  }
  // 检查训练题题数 vs 答案数
  s.trainings.forEach(t => {
    const noAns = t.questions.filter(q => !q.answers[0]).length;
    if (noAns) console.log(`  ⚠ ${t.title} 有 ${noAns} 题无答案`);
  });
});

// 写出 data.json
fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(data, null, 0), 'utf-8');
console.log('\n已写出 data.json, 大小:', (fs.statSync(path.join(__dirname, 'data.json')).size / 1024).toFixed(1), 'KB');

// ===== 生成 Hub HTML =====
// 读入考点辨析数据
const pitfallsJsonStr = fs.readFileSync(path.join(__dirname, 'pitfalls-data.json'), 'utf-8');

const { buildHTML } = require('./template');

// 拼接所有 JS 模块
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
appJsStr += '\n// ===== app.js (PhrasesWiz Junior) =====\n';
appJsStr += phrasesAppJs;

// 在末尾触发初始渲染
appJsStr += '\n// ===== 初始渲染（Hub 启动）=====\n';
appJsStr += 'renderMain();\n';

const phrasesJsonStr = JSON.stringify(data);
const posJsonStr = JSON.stringify(posData);
const mcJsonStr = JSON.stringify(mcData);

const html = buildHTML(phrasesJsonStr, posJsonStr, mcJsonStr, appJsStr, pitfallsJsonStr);
fs.writeFileSync(path.join(__dirname, 'index.html'), html, 'utf-8');
console.log('已写出 index.html (Hub 三板块), 大小:', (fs.statSync(path.join(__dirname, 'index.html')).size / 1024).toFixed(1), 'KB');
console.log('\n=== 构建完成 ===');
console.log('Find the Mole (' + mcData.batchCount + '批), Word Fission Mission (' + posData.batchCount + '批), PhrasesWiz Junior (' + data.meta.semesterCount + '学期)');
