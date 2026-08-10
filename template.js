// template.js — 提供 index.html 的 HTML/CSS 骨架
// JS 应用逻辑从 app.js 读取后注入，避免模板字符串消费正则反斜杠

function buildHTML(dataJsonStr, appJs, pitfallsJsonStr) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>✨ PhrasesWiz Junior · 短语精灵</title>
<style>
:root{
  --orange:#FF8C00; --orange-light:#FFA940;
  --green:#228B22; --green-light:#2E8B57;
  --bg:#fafafa; --surface:#ffffff; --text:#222; --text-muted:#666;
  --border:#e0e0e0; --accent:#1a73e8; --danger:#d93025; --ok:#188038;
  --shadow:0 1px 3px rgba(0,0,0,.1); --radius:8px;
  --tag-bg:#f1f3f4; --tag-text:#5f6368;
}
[data-theme="dark"]{
  --bg:#1a1a1a; --surface:#2a2a2a; --text:#e8e8e8; --text-muted:#aaa;
  --border:#3a3a3a; --accent:#8ab4f8; --danger:#f28b82; --ok:#81c995;
  --shadow:0 1px 3px rgba(0,0,0,.4);
  --tag-bg:#3a3a3a; --tag-text:#bbb;
}
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;background:var(--bg);color:var(--text);line-height:1.6;transition:background .2s,color .2s}
button{font-family:inherit;cursor:pointer;border:1px solid var(--border);background:var(--surface);color:var(--text);padding:6px 14px;border-radius:var(--radius);transition:all .15s;font-size:14px}
button:hover{border-color:var(--accent);color:var(--accent)}
button.primary{background:var(--accent);color:#fff;border-color:var(--accent)}
button.primary:hover{opacity:.9;color:#fff}
button.active{background:var(--accent);color:#fff;border-color:var(--accent)}
input[type="text"]{font-family:inherit;font-size:14px;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text);width:100%}
input[type="text"]:focus{outline:none;border-color:var(--accent)}
input[type="checkbox"]{cursor:pointer}

header{position:sticky;top:0;z-index:100;background:var(--surface);border-bottom:1px solid var(--border);box-shadow:var(--shadow);padding:8px 12px}
.header-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.title{font-size:20px;font-weight:800;margin-right:6px;white-space:nowrap;font-family:"Georgia","Times New Roman",serif;letter-spacing:.5px;display:inline-flex;align-items:center;gap:2px}
.title-icon{font-size:18px;animation:bounceRotate 2s ease-in-out infinite;display:inline-block}
.title-main{background:linear-gradient(135deg,#FF6B35 0%,#FFD700 50%,#FF1493 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;animation:warmGlow 3s ease-in-out infinite}
.title-wiz{background:linear-gradient(225deg,#7B2FF7 0%,#00D4FF 50%,#39FF14 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;font-style:italic;animation:breathe 2.5s ease-in-out infinite}
.title-junior{background:linear-gradient(45deg,#FF0080 0%,#FF8C00 50%,#FFD700 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;font-size:16px;animation:wiggle 1.5s ease-in-out infinite;margin-left:4px}
.title-cn{font-size:14px;margin-left:6px;font-weight:400;font-family:"Microsoft YaHei","PingFang SC",sans-serif;font-style:normal;letter-spacing:0;background:linear-gradient(135deg,#00BFA5 0%,#448AFF 50%,#E040FB 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;animation:floatBreathe 3.5s ease-in-out infinite}
@keyframes floatBreathe{0%,100%{transform:scale(1);filter:drop-shadow(0 0 3px rgba(0,191,165,.35))}50%{transform:scale(1.06);filter:drop-shadow(0 0 12px rgba(224,64,251,.6))}}
@keyframes bounceRotate{0%{transform:scale(1) rotate(0deg) translateY(0)}25%{transform:scale(1.3) rotate(90deg) translateY(-3px)}50%{transform:scale(1.15) rotate(180deg) translateY(0)}75%{transform:scale(1.35) rotate(270deg) translateY(-4px)}100%{transform:scale(1) rotate(360deg) translateY(0)}}
@keyframes warmGlow{0%,100%{filter:drop-shadow(0 0 4px rgba(255,107,53,.4))}50%{filter:drop-shadow(0 0 16px rgba(255,20,147,.7))}}
@keyframes breathe{0%,100%{transform:scale(1);filter:drop-shadow(0 0 4px rgba(123,47,247,.4))}50%{transform:scale(1.08);filter:drop-shadow(0 0 14px rgba(0,212,255,.75))}}
@keyframes wiggle{0%,100%{transform:rotate(0deg) translateY(0)}15%{transform:rotate(-3deg) translateY(-2px)}30%{transform:rotate(3deg) translateY(0)}45%{transform:rotate(-2deg) translateY(-1px)}60%{transform:rotate(2deg) translateY(0)}75%{transform:rotate(-1deg) translateY(-2px)}}
[data-theme="dark"] .title-icon{filter:brightness(1.3)}
[data-theme="dark"] .title-main{filter:drop-shadow(0 0 12px rgba(255,200,50,.8))}
[data-theme="dark"] .title-wiz{filter:drop-shadow(0 0 12px rgba(0,230,255,.85))}
[data-theme="dark"] .title-junior{filter:drop-shadow(0 0 10px rgba(255,0,128,.7))}
[data-theme="dark"] .title-cn{filter:drop-shadow(0 0 10px rgba(0,191,165,.65))}
.sem-tabs{display:flex;gap:4px;overflow-x:auto;flex-wrap:nowrap;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.sem-tabs::-webkit-scrollbar{display:none}
.sem-tab{padding:5px 11px;border-radius:6px;font-size:13px;white-space:nowrap;flex-shrink:0}
.mode-tabs{display:flex;gap:4px;overflow-x:auto;flex-wrap:nowrap;margin-top:6px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.mode-tabs::-webkit-scrollbar{display:none}
.mode-tab{padding:5px 11px;border-radius:6px;font-size:13px;white-space:nowrap;flex-shrink:0}
.spacer{flex:1;min-width:0}
.icon-btn{padding:6px 10px;font-size:16px;flex-shrink:0}
.search-box{width:180px;min-width:120px;flex-shrink:1}
.progress-mini{font-size:12px;color:var(--text-muted);white-space:nowrap}

main{max-width:1200px;margin:0 auto;padding:16px}
.filter-toggle{display:none;width:100%;margin-bottom:10px;padding:8px 12px;font-size:14px;background:var(--surface);border:1px solid var(--border)}
.layout{display:grid;grid-template-columns:220px 1fr;gap:16px;align-items:start}
.sidebar-wrap{position:relative}
.sidebar{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:12px}
@media(min-width:601px){ .sidebar{position:sticky;top:120px;max-height:calc(100vh - 140px);overflow-y:auto} }
.sidebar h4{margin:12px 0 6px;font-size:13px;color:var(--text-muted)}
.sidebar h4:first-child{margin-top:0}
.filter-btn{display:block;width:100%;text-align:left;margin:3px 0;padding:6px 8px;font-size:13px;border-radius:5px;border:1px solid transparent;background:transparent}
.filter-btn:hover{background:var(--tag-bg)}
.filter-btn.active{background:var(--accent);color:#fff;border-color:var(--accent)}
.sidebar-backdrop{display:none}
.content{min-width:0}

.phrase-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;margin-bottom:12px;box-shadow:var(--shadow)}
.phrase-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}
.phrase-num{font-size:13px;color:var(--text-muted);min-width:32px}
.phrase-word{font-size:18px;font-weight:700;color:var(--orange)}
.tag{display:inline-block;padding:2px 8px;border-radius:10px;font-size:12px;background:var(--tag-bg);color:var(--tag-text)}
.stars{color:var(--orange);font-size:13px;letter-spacing:1px}
.card-actions{margin-left:auto;display:flex;gap:6px}
.card-actions button{padding:4px 10px;font-size:13px}
.card-actions .mastered{background:var(--ok);color:#fff;border-color:var(--ok)}
.card-actions .mastered:hover{color:#fff}
.example{margin:8px 0;padding-left:12px;border-left:3px solid var(--border)}
.example-basic{border-left-color:var(--orange)}
.example-adv{border-left-color:var(--green)}
.example-label{font-size:12px;color:var(--text-muted);margin-bottom:2px}
.example-cn{font-size:14px;color:var(--text);margin-bottom:2px}
.example-en{font-size:14px;font-style:italic}
.hl-phrase{color:var(--orange);font-weight:700;font-style:normal}
.hl-be{color:var(--orange);font-weight:700;font-style:normal;text-decoration:underline;text-decoration-style:dotted}
details.adv-details{margin-top:6px}
details.adv-details summary{cursor:pointer;font-size:13px;color:var(--green);padding:4px 0;user-select:none}
details.adv-details summary:hover{text-decoration:underline}
.vocab-line{margin-top:6px;font-size:13px;color:var(--green);background:rgba(34,139,34,.06);padding:6px 10px;border-radius:5px}
.vocab-word{font-weight:700;font-style:italic}
.usage-note{font-size:13px;color:#1a6fb5;background:rgba(26,111,181,.08);padding:6px 10px;border-radius:5px;margin:6px 0}
.verb-forms-details{margin-top:4px;font-size:13px}
.verb-forms-details summary{cursor:pointer;color:#666;padding:3px 0;user-select:none}
.verb-forms-details summary:hover{color:var(--accent)}
.verb-forms-table{width:100%;border-collapse:collapse;margin-top:6px;font-size:12px}
.verb-forms-table td{border:1px solid var(--border);padding:3px 8px;color:#87CEEB}
.verb-forms-table td:first-child{background:#f5f5f5;font-weight:600;width:160px;white-space:nowrap}
[data-theme="dark"] .verb-forms-table td:first-child{background:#333}
[data-theme="dark"] .verb-forms-table td{color:#87CEEB}
.vfw{font-family:monospace;font-weight:700;font-style:italic;color:#87CEEB}
[data-theme="dark"] .vfw{color:#87CEEB}
.vocab-pos{color:var(--green-light);margin:0 4px}

.test-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px;padding:10px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius)}
.test-toolbar label{font-size:13px;display:flex;align-items:center;gap:4px;cursor:pointer}
.test-toolbar .score{margin-left:auto;font-weight:700;color:var(--accent)}
.training-block{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:12px 16px;margin-bottom:12px}
.training-title{font-weight:700;margin-bottom:8px;color:var(--accent)}
.q-row{display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px dashed var(--border);flex-wrap:wrap}
.q-num{min-width:34px;color:var(--text-muted);font-weight:600;padding-top:4px}
.q-body{flex:1;min-width:200px}
.q-sentence{font-size:14px;margin-bottom:4px}
.q-input{min-width:140px;max-width:240px}
.q-hint{font-size:12px;color:var(--text-muted)}
.q-feedback{font-size:13px;margin-top:4px}
.q-feedback.ok{color:var(--ok)}
.q-feedback.bad{color:var(--danger)}
.q-feedback .ans{color:var(--orange);font-weight:600}
input.q-input.correct{border-color:var(--ok);background:rgba(24,128,56,.08)}
input.q-input.wrong{border-color:var(--danger);background:rgba(217,48,37,.08)}

.flashcard-wrap{display:flex;flex-direction:column;align-items:center;gap:16px;padding:30px}
.flashcard{width:420px;max-width:90vw;height:240px;perspective:1000px;cursor:pointer}
.fc-inner{width:100%;height:100%;transition:transform .5s;transform-style:preserve-3d;position:relative}
.flashcard.flipped .fc-inner{transform:rotateY(180deg)}
.fc-face{position:absolute;width:100%;height:100%;backface-visibility:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;border:2px solid var(--border);border-radius:14px;padding:20px;background:var(--surface);box-shadow:var(--shadow)}
.fc-back{transform:rotateY(180deg)}
.fc-word{font-size:26px;font-weight:700;color:var(--orange);text-align:center}
.fc-cn{font-size:20px;text-align:center}
.fc-en{font-size:15px;font-style:italic;text-align:center;margin-top:8px;color:var(--text-muted)}
.fc-meta{font-size:13px;color:var(--text-muted);margin-top:12px}
.fc-actions{display:flex;gap:14px}

.dict-row{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:10px 14px;margin-bottom:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.dict-prompt{flex:1;min-width:160px;font-size:15px}
.dict-prompt .pw{color:var(--orange);font-weight:700}
.dict-input{min-width:160px;max-width:300px}
.dict-fb{font-size:13px;min-width:100px}
.dict-input.correct{border-color:var(--ok);background:rgba(24,128,56,.08)}
.dict-input.wrong{border-color:var(--danger);background:rgba(217,48,37,.08)}

.pdf-panel{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px}
.pdf-panel h3{margin-top:0}
.pdf-options{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}
.pdf-opt{padding:12px;border:1px solid var(--border);border-radius:8px;cursor:pointer}
.pdf-opt.active{border-color:var(--accent);background:rgba(26,115,232,.06)}
.pdf-opt input{margin-right:6px}
.pdf-opt label{cursor:pointer;font-weight:600}
.pdf-hint{font-size:13px;color:var(--text-muted);margin:10px 0}

/* ===== 响应式：Pad 端 (<=1024px) ===== */
@media(max-width:1024px){
  .layout{grid-template-columns:180px 1fr;gap:12px}
  main{padding:12px}
  .phrase-word{font-size:17px}
}
/* ===== 响应式：手机端 (<=600px) ===== */
@media(max-width:600px){
  header{padding:6px 10px}
  .title{font-size:16px}
  .title-icon{font-size:15px}
  .title-junior{font-size:13px}
  .title-cn{font-size:11px}
  .header-row{gap:6px}
  .search-box{width:100%;order:5;flex-basis:100%}
  .progress-mini{font-size:11px}
  .icon-btn{padding:5px 8px}
  .sem-tab,.mode-tab{padding:5px 10px;font-size:12px}
  main{padding:10px}
  .filter-toggle{display:block}
  .layout{grid-template-columns:1fr;gap:0}
  .sidebar-wrap{position:fixed;top:0;left:0;bottom:0;width:78%;max-width:300px;z-index:200;transform:translateX(-100%);transition:transform .25s ease;overflow-y:auto;background:var(--bg);padding:12px}
  .sidebar-wrap.open{transform:translateX(0);box-shadow:2px 0 12px rgba(0,0,0,.2)}
  .sidebar-backdrop{display:block;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.4);z-index:150}
  .sidebar{border:none;background:var(--surface)}
  .phrase-card{padding:12px}
  .phrase-word{font-size:19px}
  .phrase-head{gap:8px}
  .tag{font-size:11px}
  .example-cn,.example-en{font-size:13.5px}
  .q-row{gap:6px}
  .q-body{min-width:0;flex-basis:100%}
  .q-num{padding-top:2px}
  .q-input{min-width:0;flex:1;max-width:100%}
  .q-sentence{font-size:13.5px;word-break:break-word}
  .flashcard{width:100%;height:220px}
  .fc-word{font-size:22px}
  .fc-cn{font-size:17px}
  .fc-en{font-size:13px}
  .fc-actions{flex-wrap:wrap;justify-content:center}
  .dict-row{flex-direction:column;align-items:stretch;gap:6px}
  .dict-input{max-width:100%}
  .pdf-options{grid-template-columns:1fr}
}

@media print{
  @page{margin:18mm 16mm}
  body{background:#fff;color:#000}
  header,.sidebar,.test-toolbar,.no-print{display:none!important}
  main{max-width:100%;padding:0}
  .layout{grid-template-columns:1fr}
  .content{display:none}
  .print-area{display:block!important}
  .print-sheet{page-break-after:always;margin-bottom:20px}
  .print-sheet:last-child{page-break-after:auto}
  .print-h1{font-size:20px;font-weight:700;text-align:center;margin:0 0 6px}
  .print-h2{font-size:15px;text-align:center;color:#444;margin:0 0 14px}
  .print-q{margin:14px 0;padding-left:0;font-size:14px;line-height:2.4;page-break-inside:avoid}
  .print-q .n{font-weight:700;margin-right:8px}
  .print-q .blank{display:inline-block;border-bottom:1.5px solid #333;min-width:140px;height:18px;margin:0 2px;vertical-align:bottom}
  .print-hint{color:#666;font-size:13px;margin-left:4px}
  .print-ans-sheet .print-q{line-height:1.8}
  .print-ans{color:#FF8C00;font-weight:600}
  .print-table{width:100%;border-collapse:collapse;font-size:13px}
  .print-table th,.print-table td{border:1px solid #999;padding:8px 8px;text-align:left}
  .print-table th{background:#f0f0f0}
  .print-table .pw{color:#FF8C00;font-weight:700}
  .print-phrase-block{margin:14px 0;padding:8px 10px;border:1px solid #ccc;border-radius:4px;page-break-inside:avoid}
  .print-phrase-block .pw{color:#FF8C00;font-weight:700;font-size:15px}
  .print-phrase-block .ex{font-size:13px;margin:3px 0}
  .print-phrase-block .vocab{color:#228B22;font-size:12px;margin-top:4px}
}

.empty-state{text-align:center;padding:60px 20px;color:var(--text-muted)}
.empty-state .big{font-size:48px;margin-bottom:10px}
.kbd{display:inline-block;padding:1px 6px;border:1px solid var(--border);border-radius:3px;font-size:12px;font-family:monospace;background:var(--tag-bg)}
details summary{outline:none}
.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 20px;border-radius:6px;z-index:1000;opacity:0;transition:opacity .3s}
.toast.show{opacity:1}
/* ===== 逐题批改按钮 ===== */
.q-grade-btn{padding:4px 12px;font-size:12px;border-radius:5px;background:var(--accent);color:#fff;border:1px solid var(--accent);cursor:pointer;white-space:nowrap;flex-shrink:0;align-self:flex-start;margin-left:6px;transition:all .15s}
.q-grade-btn:hover{opacity:.85;color:#fff;border-color:var(--accent)}
/* ===== 批改动画 ===== */
@keyframes pulseGreen{0%{box-shadow:0 0 0 0 rgba(24,128,56,.5)}50%{box-shadow:0 0 0 10px rgba(24,128,56,0)}100%{box-shadow:0 0 0 0 rgba(24,128,56,0)}}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@keyframes fadeInUp{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:translateY(0)}}
input.q-input.correct-anim{animation:pulseGreen .5s ease}
input.q-input.wrong-anim{animation:shake .4s ease}
input.dict-input.correct-anim{animation:pulseGreen .5s ease}
input.dict-input.wrong-anim{animation:shake .4s ease}
.q-feedback.fadeInUp,.dict-fb.fadeInUp{animation:fadeInUp .35s ease}

/* ===== 考点辨析模块 (Pitfalls) ===== */
.pitfalls-layout{display:grid;grid-template-columns:240px 1fr;gap:20px;align-items:start}
.pitfalls-cats{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:10px;position:sticky;top:120px;max-height:calc(100vh - 160px);overflow-y:auto}
.pitfalls-cats h4{font-size:13px;color:var(--text-muted);margin:0 0 6px;padding:0 4px}
.pitfalls-cat-btn{display:block;width:100%;text-align:left;margin:2px 0;padding:5px 8px;font-size:12px;border-radius:4px;border:1px solid transparent;background:transparent;white-space:normal;line-height:1.4}
.pitfalls-cat-btn:hover{background:var(--tag-bg)}
.pitfalls-cat-btn.active{background:var(--accent);color:#fff;border-color:var(--accent)}
.pitfalls-cat-count{float:right;font-size:10px;opacity:.7;margin-left:4px}
.pitfalls-content{min-width:0}
.pitfalls-search{margin-bottom:12px}
.pitfalls-search input{max-width:400px;padding:7px 12px}
.pitfalls-stats{font-size:12px;color:var(--text-muted);margin-bottom:12px}

/* Grammar primer card */
.grammar-primer{background:linear-gradient(135deg, rgba(26,115,232,.04) 0%, rgba(155,89,182,.04) 100%);border:2px solid var(--accent);border-radius:var(--radius);padding:20px;margin-bottom:16px}
.grammar-primer h2{font-size:20px;margin:0 0 6px;color:var(--accent)}
.grammar-primer .principle-rule{background:var(--surface);border-left:4px solid var(--accent);padding:14px 18px;border-radius:4px;margin:14px 0;font-size:15px}
.grammar-primer .principle-rule strong{color:var(--accent)}
.grammar-primer .why-not{font-size:13px;color:var(--danger);padding:10px 14px;background:rgba(217,48,37,.06);border-radius:4px;margin:8px 0}
.five-types{margin-top:16px}
.type-card{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px 16px;margin-bottom:10px}
.type-card h4{font-size:15px;margin:0 0 4px;color:var(--accent)}
.type-card .type-explain{font-size:13px;color:var(--text-muted);margin-bottom:8px}
.type-card .type-examples{display:grid;grid-template-columns:1fr;gap:4px}
.type-card .type-ex{font-size:13px;padding:4px 8px;background:var(--tag-bg);border-radius:4px;display:flex;align-items:baseline;gap:6px;flex-wrap:wrap}
.type-card .type-ex .ex-phrase{font-weight:700;color:var(--orange);font-family:monospace}
.type-card .type-ex .ex-from{font-size:11px;color:var(--text-muted)}
.type-card .type-ex .ex-analysis{font-size:11px;color:var(--green);margin-left:auto}
.grammar-primer .key-takeaway{background:var(--orange);color:#fff;padding:14px 18px;border-radius:6px;margin-top:16px;font-size:15px;font-weight:700;line-height:1.7}

/* Confusable pairs in grammar primer */
.confusable-box{margin-top:16px;background:var(--surface);border:1px solid var(--warning-color,#e6a817);border-radius:8px;padding:14px 18px}
.confusable-box h4{color:var(--warning-color,#b8860b);margin:0 0 8px;font-size:14px}

/* Pitfall card */
.pitfall-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:14px;box-shadow:var(--shadow)}
.pitfall-card .pit-title{font-size:17px;font-weight:700;color:var(--accent);margin-bottom:4px}
.pitfall-card .pit-category{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;background:var(--tag-bg);color:var(--tag-text);margin-right:4px;margin-bottom:4px}
.pitfall-card .pit-diff{font-size:12px;color:var(--orange)}
.pit-rels{font-size:12px;color:var(--text-muted);margin:4px 0}
.pit-rels a{color:var(--orange);cursor:pointer;text-decoration:underline}
.pit-rels a:hover{color:var(--orange-light)}

/* Comparison table */
.pit-compare{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}
.pit-compare th{background:var(--tag-bg);padding:8px 10px;text-align:left;font-size:12px;color:var(--text-muted);border:1px solid var(--border)}
.pit-compare td{padding:8px 10px;border:1px solid var(--border);vertical-align:top}
.pit-compare .comp-phrase{font-weight:700;color:var(--orange);font-family:monospace;white-space:nowrap}
.pit-compare .comp-pos{font-size:11px;color:var(--text-muted)}
.pit-compare .comp-usage{font-size:12px}
.pit-compare tr:nth-child(even) td{background:rgba(0,0,0,.01)}
[data-theme="dark"] .pit-compare tr:nth-child(even) td{background:rgba(255,255,255,.02)}

/* Mistake display */
.pit-mistakes{margin:10px 0}
.pit-mistakes .mistake-row{display:flex;gap:10px;align-items:flex-start;margin:6px 0;font-size:13px;flex-wrap:wrap}
.pit-mistakes .wrong-box{background:rgba(217,48,37,.08);border-left:3px solid var(--danger);padding:6px 10px;border-radius:0 4px 4px 0;flex:1;min-width:200px}
.pit-mistakes .wrong-box .label{font-size:11px;color:var(--danger);font-weight:700}
.pit-mistakes .right-box{background:rgba(24,128,56,.08);border-left:3px solid var(--ok);padding:6px 10px;border-radius:0 4px 4px 0;flex:1;min-width:200px}
.pit-mistakes .right-box .label{font-size:11px;color:var(--ok);font-weight:700}
.pit-mistakes .explain{font-size:11px;color:var(--text-muted);margin-top:3px}

/* Test example */
.pit-test{background:var(--tag-bg);border-radius:6px;padding:12px 16px;margin:12px 0 0}
.pit-test .test-label{font-size:11px;color:var(--text-muted);margin-bottom:4px}
.pit-test .test-question{font-weight:600;margin-bottom:6px;font-size:14px}
.pit-test .test-options{font-size:13px;color:var(--text-muted);margin-bottom:6px}
.pit-test .test-show-btn{font-size:12px;padding:4px 10px;background:var(--accent);color:#fff;border:1px solid var(--accent);border-radius:4px;cursor:pointer}
.pit-test .test-show-btn:hover{opacity:.85;color:#fff}
.pit-test .test-answer{display:none;margin-top:8px;padding:8px 12px;background:rgba(24,128,56,.08);border-radius:4px;font-size:13px}
.pit-test .test-answer.show{display:block}
.pit-test .test-answer .correct-ans{color:var(--ok);font-weight:700}
.pit-test .test-answer .test-explain{font-size:12px;color:var(--text-muted);margin-top:2px}

/* Pitfall badge on phrase cards */
.pit-badges{margin-top:6px;display:flex;gap:4px;flex-wrap:wrap}
.pit-badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;background:rgba(26,115,232,.1);color:var(--accent);border:1px solid rgba(26,115,232,.2);cursor:pointer;white-space:nowrap}
.pit-badge:hover{background:var(--accent);color:#fff;border-color:var(--accent)}

/* Responsive pitfalls */
@media(max-width:768px){
  .pitfalls-layout{grid-template-columns:1fr;gap:12px}
  .pitfalls-cats{position:static;max-height:none;display:flex;flex-wrap:wrap;gap:4px;padding:8px}
  .pitfalls-cats h4{display:none}
  .pitfalls-cat-btn{display:inline-block;width:auto;font-size:11px;padding:4px 8px}
  .pitfalls-cat-count{float:none;margin-left:2px}
  .pit-compare{font-size:11px}
  .pit-compare td,.pit-compare th{padding:6px}
}
@media(max-width:600px){
  .pitfall-card{padding:10px}
  .pitfall-card .pit-title{font-size:15px}
  .grammar-primer{padding:12px}
  .grammar-primer h2{font-size:17px}
  .type-card .type-ex{flex-direction:column;gap:2px}
  .type-card .type-ex .ex-analysis{margin-left:0}
  .pit-mistakes .mistake-row{flex-direction:column;gap:4px}
}
</style>
</head>
<body>
<header>
  <div class="header-row">
    <span class="title"><span class="title-icon">✨</span><span class="title-main">Phrases</span><span class="title-wiz">Wiz</span><span class="title-junior">Junior</span><span class="title-cn">· 短语精灵</span></span>
    <div class="sem-tabs" id="semTabs"></div>
    <span class="spacer"></span>
    <input type="text" class="search-box" id="searchBox" placeholder="🔍 搜索短语/中文/词性...">
    <span class="progress-mini" id="progressMini"></span>
    <button class="icon-btn" id="themeBtn" title="深色模式">🌙</button>
  </div>
  <div class="mode-tabs" id="modeTabs"></div>
</header>

<main>
  <div id="appBody"></div>
</main>

<div class="toast" id="toast"></div>
<div class="print-area" id="printArea" style="display:none"></div>

<script>
const DATA = ${dataJsonStr};
</script>
<script>
const PITFALLS = ${pitfallsJsonStr};
</script>
<script>
${appJs}
</script>
</body>
</html>`;
}

module.exports = { buildHTML };
