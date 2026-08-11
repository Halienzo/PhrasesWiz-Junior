# 无畏无瑕 Hub · 三板块架构设计规格

**日期**: 2026-08-11
**状态**: 已确认，待实现

---

## 1. 概述

将现有 PhrasesWiz Junior 单页 HTML 系统升级为三板块统一 Hub 架构。用户打开 HTML 后首先看到 Hub 首页（品牌展示 + 三个板块入口卡片），点击任意板块进入对应内容页，所有页面通过 SPA 方式在同一 HTML 文件内切换。

### 三大板块

| 序号 | 板块名称 | 英文名 | 数据源 | 考核内容 |
|---|---|---|---|---|
| 1 | Find the Mole · 单刀营救 | Find the Mole | `mc.txt` | 云南省中考英语 —— 单项选择题 |
| 2 | Word Fission Mission · 词性裂变 | Word Fission Mission | `pos.txt` | 云南省中考英语 —— 单句词形填空 |
| 3 | PhrasesWiz Junior · 短语精灵 | PhrasesWiz Junior | `data.json`（已有） | 初中英语动词短语（7-9 年级） |

---

## 2. 架构拓扑

### 2.1 SPA 路由

- 单 HTML 文件，通过全局 `STATE.view` 控制视图切换
- `STATE.view` 取值：`'hub'` | `'mole'` | `'fission'` | `'phrases'`
- Hub 点击卡片 → 设置 `STATE.view` → `main` 区域重渲染
- 每个板块页面包含「← Hub」返回按钮
- 所有事件通过顶层 `click` 事件委托分发

### 2.2 DOM 骨架

```html
<header id="topBar"><!-- 板块模式下显示返回按钮 + 标题 + 导航 --></header>
<main id="mainContent"><!-- 根据 STATE.view 渲染 --></main>
```

### 2.3 代码模块划分

```
build.js 产出嵌入到 index.html 的结构：
├── DATA              (PHRASES_DATA + POS_DATA + MC_DATA)
├── STATE             (全局 state，含 view 字段)
├── HUB RENDERER      (renderHub)
├── MOLE RENDERER     (renderMole + 交互逻辑)
├── FISSION RENDERER  (renderFission + 交互逻辑)
├── PHRASES RENDERER  (现有全部渲染函数，适配嵌入)
├── COMMON UTILS      (normalize, esc, checkAnswer, localStorage 等)
└── EVENT DELEGATION  (全局点击事件分发)
```

---

## 3. Hub 首页设计

### 3.1 品牌区

- "无畏无瑕" + "Fearless & Flawless" 使用暗金色渐变（`#C8A84E` → `#B8942E`），`text-shadow` 发光 + 呼吸动效（`scale` 1.0 ↔ 1.04，周期 4s）
- 中文口号："胆大心细不怕难，满分就在下一关。"
- 英文口号："Bold and careful, that's the way, perfect score is here to stay."
- 中英口号配对居中，中文在上英文在下，字体稍偏大（~18-20px 响应式），英文使用 Georgia/Serif 斜体
- 品牌区整体居中排布在最顶部

### 3.2 三板块卡片

- Grid 三列布局，移动端（≤600px）折叠为单列
- 每个卡片包含：大号动态图标 + 板块中英文名 + 简短介绍 + 题目统计数

| 板块 | 图标 | 主题色 | 卡片氛围 |
|---|---|---|---|
| Find the Mole | 🕵️（侦探帽动效） | 深蓝 `#1a56db` → 青 `#06b6d4` | 悬疑感，暗角光晕 |
| Word Fission Mission | ⚛️（原子裂变动效） | 紫 `#7c3aed` → 绿 `#10b981` | 能量感，粒子扩散光点 |
| PhrasesWiz Junior | ✨（星光旋转动效） | 橙 `#FF6B35` → 金 `#FFD700` → 粉 `#FF1493` | 温暖魔法感（延续现有风格） |

- 悬停交互：卡片轻微上浮（`translateY(-4px)`）+ 阴影扩大 + 主题色边框发光（`box-shadow` 渐变）
- 点击卡片 → 切换到对应板块视图

### 3.3 底部统计（可选）

- 各板块显示题目/批次汇总，如 "4 批次 · 100 题"、"8 批次 · 80 题"
- 如有 localStorage 进度，显示 "已掌握 X/Y"

---

## 4. 顶栏系统（板块专属配色）

### 4.1 Hub 视图顶栏

- 极简模式：仅显示品牌名「无畏无瑕」小字 + 深色模式切换按钮
- 无批次导航、无返回按钮

### 4.2 板块视图顶栏

每个板块进入后，顶栏切换为专属配色，包含：

1. **← Hub 返回按钮**（左侧）
2. **板块标题**（居中或紧随返回按钮）
3. **批次选择器**（右侧下拉或 tabs）
4. **模式切换按钮**（仅 Word Fission / Find the Mole 有，即时反馈 ↔ 模拟考试）

| 板块 | 顶栏 CSS 变量覆盖 | 视觉效果 |
|---|---|---|
| Find the Mole | `--bar-accent: #1a56db`, `--bar-glow: rgba(26,86,219,.5)` | 深蓝→青渐变底，侦探帽 emoji 角标 |
| Word Fission Mission | `--bar-accent: #7c3aed`, `--bar-glow: rgba(124,58,237,.5)` | 紫→绿渐变底，原子 emoji 角标 |
| PhrasesWiz Junior | 保持现有 | 橙→金渐变 + 现有动画 title |

---

## 5. Word Fission Mission · 词性裂变

### 5.1 数据解析（pos.txt）

**批次识别**：正则 `专项训练（(\d+)）` 提取批次号

**题目提取**：正则 `(\d+)\. (.+?)\((\w+)\)`
- `no`：题号
- `sentence`：含 `______` 的题干
- `hint`：括号内提示原词

**答案提取**：正则 `(\d+)\. (\S+)` 匹配答案块，按题号对应

**考点提取**：批次开头的"考点设置"段落

**数据结构**：
```js
{
  batchId: 1,
  batchTitle: "云南省中考单句词形填空专项训练（1）",
  description: "考点设置：1-5. 词性转换（动词→形容词）...",
  questions: [
    { no: 1, sentence: "It is ______ to walk along...", hint: "relax", answer: "relaxing", category: "词性转换（动词→形容词）" },
    // ...共 25 题
  ]
}
```

**数据规模**：4 个批次，每批 25 题，共 **100 题**。

### 5.2 交互设计

**顶部工具栏**：
- 批次选择器：按钮组「训练1」「训练2」「训练3」「训练4」
- 模式切换：「即时反馈」|「模拟考试」
- 得分面板：正确数 / 已做题数 / 正确率

**题目卡布局**：
```
┌──────────────────────────────────────────────────┐
│ [1] It is ______ to walk along the Ancient       │
│     Tea Horse Road and enjoy the views. (relax)  │
│     ┌──────────────────────────┐                 │
│     │ relaxing                 │  ← 输入框       │
│     └──────────────────────────┘                 │
│     ✓ relaxing  ← 即时反馈（绿色）                │
│   或 ✗ 正确答案: relaxing  ← 错误反馈（红色）     │
└──────────────────────────────────────────────────┘
```

**即时反馈模式**：
- 输入框键入变形单词，回车或失焦触发判定
- 正确：输入框绿色边框 + `✓ 正确答案` 绿色提示
- 错误：输入框红色边框 + `✗ 正确答案: xxx` 红色提示，显示正确单词
- 自动更新得分面板
- 结果写入 `localStorage`

**模拟考试模式**：
- 隐藏即时反馈，所有输入框可自由填写
- 页面底部出现橙红色「提交批改」按钮
- 点击后一次性批改全部 25 题，滚动到第一个错误处
- 显示本次得分：X/25（百分比）
- 结果写入 `localStorage`

### 5.3 进度存储

- `localStorage` key：`wfm_progress_v1`
- 结构：`{ "batchId": { "qNo": "ok"|"wrong" }, ... }`
- 统计字段：`_correct`, `_total`, `_lastScore`

---

## 6. Find the Mole · 单刀营救

### 6.1 数据解析（mc.txt）

**批次识别**：正则 `专项训练（(\d+)）` 提取批次号

**题目提取**：
- 题号 `(\d+)\. ` 后的题干（可能跨多行）
- 匹配 4 个选项：`A. ... B. ... C. ... D. ...`
- 难点：部分选项跨行、部分题号缺失（如训2 第7题缺题号），需容错处理

**答案提取**：
- 多种格式容错：`答案：1-5. ABACB`、`1—5：A A B C C`、`1-5: ABACB；6-10:CCADB`、`1. A2. B3. C...`（连写）
- 解析为题号→选项字母映射

**考点提取**：批次开头的"考点分布"段落

**数据结构**：
```js
{
  batchId: 1,
  batchTitle: "云南省中考单选专项训练（1）",
  description: "考点分布：介词、情态动词、冠词...",
  questions: [
    {
      no: 1,
      stem: "The store is open ______ 9:00 a.m. and 6:00 p.m.",
      options: [
        { label: "A", text: "between" },
        { label: "B", text: "on" },
        { label: "C", text: "behind" },
        { label: "D", text: "in" }
      ],
      answer: "A",
      category: "介词"
    },
    // ...共 10 题
  ]
}
```

**数据规模**：8 个批次，每批 10 题，共 **80 题**。

### 6.2 交互设计

**顶部工具栏**：
- 批次选择器：按钮组「训练1」–「训练8」或下拉菜单
- 模式切换：「即时反馈」|「模拟考试」
- 正确率面板

**题目卡布局**：
```
┌──────────────────────────────────────────────────┐
│ [1] The store is open ______ 9:00 a.m.           │
│     and 6:00 p.m.                                │
│                                                  │
│     ● A. between    ○ B. on                      │
│     ○ C. behind     ○ D. in                      │
│                                                  │
│     ✓ 正确！  ← 即时反馈                          │
│   或 ✗ 错误！正确答案是 A. between                  │
└──────────────────────────────────────────────────┘
```

**即时反馈模式**：
- 点击选项 → 即刻判定
- 正确：选中的选项变绿色高亮 + ✓ 标记
- 错误：选中项变红色 + ✗ 标记，同时正确选项以绿色边框高亮
- 选择后锁定，不可更改（如需修改可点「清除」重新选）
- 自动更新得分面板

**模拟考试模式**：
- 所有题可自由选择答案，允许修改
- 页面底部出现「交卷」按钮（橙红色醒目）
- 点击后一次性批改，每题显示 ✓/✗
- 未作答的题标记为「未答」
- 显示本次得分：X/10

**考点解析**（可选展开）：
- 每题底部可展开一行小字说明考点（如 "考察 between...and 固定搭配"）

### 6.3 进度存储

- `localStorage` key：`ftm_progress_v1`
- 结构：`{ "batchId": { "qNo": "ok"|"wrong" }, ... }`

---

## 7. PhrasesWiz Junior · 短语精灵（嵌入适配）

### 7.1 现有功能保留

| 功能 | 状态 |
|---|---|
| 📚 学习模式（学期/单元/词性筛选 + 侧边栏） | 保留 |
| ✍ 填空测试（6 学期 × 多批训练题） | 保留 |
| 🔁 看英写中 / 看中写英 | 保留 |
| 🔍 考点辨析 | 保留 |
| 🃏 闪卡 | 保留 |
| 📄 导出 PDF | 保留 |
| 深色模式切换 | 保留 |
| localStorage 标记掌握 | 保留（key `vp79_progress_v1` 不变）|

### 7.2 适配改动

- 入口从"打开即见"改为 Hub 点击进入
- 顶栏左侧增加「← Hub」返回按钮（`onclick` 设置 `STATE.view = 'hub'`）
- 内部渲染逻辑、filter、事件处理全部不变
- 现有 CSS 变量体系保持不变

---

## 8. 构建管线（build.js）

### 8.1 流水线

```
verb phrases 7-9.txt  ──→  PHRASES_DATA   ──┐
pos.txt                ──→  POS_DATA        ──┼──→  index.html（单文件 Hub）
mc.txt                 ──→  MC_DATA         ──┘
```

### 8.2 pos.txt 解析器

1. 按 `专项训练（(\d+)）` 拆分量批次
2. 每批内：提取考点描述 → 正则匹配 25 道题 `(\d+)\. (.+?)\((\w+)\)` → 提取 hint 词 → 匹配答案块 → 按题号对应
3. 输出 `POS_DATA.batches[]`

### 8.3 mc.txt 解析器

1. 按 `专项训练（(\d+)）` 拆分量批次
2. 每批内：提取考点分布 → 提取题号 + 题干（容错跨行） → 匹配 4 个选项（`[A-D]\. ` 正则分割） → 解析答案行（多种格式容错） → 转换为题号→答案字母映射
3. 输出 `MC_DATA.batches[]`

### 8.4 嵌入方式

三项数据各自 `JSON.stringify` 后内嵌到 HTML 的 `<script>` 标签中：
```html
<script>const PHRASES_DATA = {...};</script>
<script>const POS_DATA = {...};</script>
<script>const MC_DATA = {...};</script>
```

### 8.5 备份策略

- 现有 `index.html` 在覆盖前备份为 `index_backup.html`
- 现有 `build.js` 备份为 `build_backup.js`

---

## 9. 进度存储总览

| 板块 | localStorage Key | 存储粒度 |
|---|---|---|
| Find the Mole | `ftm_progress_v1` | 批次 + 题号 |
| Word Fission Mission | `wfm_progress_v1` | 批次 + 题号 |
| PhrasesWiz Junior | `vp79_progress_v1`（不变） | 学期 + 短语编号 |

所有 key 互不干扰，独立读写。

---

## 10. 响应式设计

- Hub 三列卡片：桌面端等宽三列 → Pad 端两列 → 手机端单列
- 板块内部题目卡片：桌面端最大宽度 900px 居中 → 手机端全宽
- 顶栏：手机端批次 tabs 可滚动，模式切换改为折叠下拉
- 品牌文字：手机端字号自适应缩小（~16px 中文 / ~14px 英文）

---

## 11. 文件清单

| 文件 | 类型 | 说明 |
|---|---|---|
| `index.html` | 产出 | 最终单文件 Hub，含全部三板块代码 + 数据 |
| `index_backup.html` | 备份 | 升级前的原 index.html |
| `build.js` | 更新 | 扩展为三步流水线，产出 index.html |
| `build_backup.js` | 备份 | 升级前的原 build.js |
| `pos.txt` | 输入 | 词形填空原始数据（已存在） |
| `mc.txt` | 输入 | 单项选择原始数据（已存在） |
| `verb phrases 7-9.txt` | 输入 | 短语原始数据（已存在，不变） |
| `data.json` | 中间 | 短语解析结果（不变，继续使用） |
| `app.js` | 重构 | JS 逻辑拆分为模块（hub/mole/fission/phrases/commons） |
| `template.js` | 重构 | HTML/CSS 骨架更新为 Hub 架构 |
| `cn-mapping.js` | 不变 | 中文对应词映射表 |
| `pitfalls-data.json` | 不变 | 考点辨析数据 |

---

## 12. 不做的事项

- 不做多文件分离架构（保持单 HTML 文件）
- 不引入外部库/框架（保持零依赖）
- 不做服务器端存储（全部 localStorage）
- 不新增外部字体加载（继续使用系统字体栈）
- 不做用户登录/账号系统
- 不做在线同步/云端存储

---

## 版本历史

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-08-11 | v1.0 | 初始设计规格，全部 8 节确认通过 |
