/**
 * 构建后剥离注释 —— 让产物里看不到本站的设计说明
 * ============================================================================
 * 目的：本站的 CSS / JS 里写了大量中文注释，解释每个设计决策的来龙去脉
 *       （为什么用这个颜色、为什么不用 backdrop-filter、踩过哪些坑…）。
 *       这些文件会被访客直接下载，注释等于把设计文档挂在公网上。
 *       这个脚本在生成之后、部署之前，把**产物里**的注释剥掉。
 *
 * ⚠️ 一个必须说清楚的前提：
 *     GitHub 仓库本身是公开的，source/ 下的源文件（带全部注释）在仓库里
 *     依然公开可读。所以这里做的只是「不让随手看网页源码的人看到」，
 *     **挡不住专门去翻仓库的人**。要彻底隐藏只能把仓库转私有，
 *     但免费账号的 GitHub Pages 不支持私有仓库。
 *
 * 处理范围（关键：只碰我自己的文件）
 *   · HTML —— 所有生成的页面，剥掉 <!-- ... -->
 *   · CSS  —— 只处理下面 MY_CSS 列出的（我写的那些）
 *   · JS   —— 只处理下面 MY_JS 列出的（我写的那些）
 *
 * ⚠️ 为什么不用「遍历整个目录」的写法：
 *    第三方库不能碰。例如 oml2d.min.js 是别人的作品，它开头的许可证声明
 *    必须原样保留 —— 剥掉别人的 license 是法律问题，不是洁癖问题。
 *
 * ⚠️ JS 剥离后会自动做一次语法自检（new Function 试解析）。
 *    解析失败就**保留原文件** —— 宁可留注释，也不能把线上脚本弄坏。
 *    这是防御性的：正则剥注释在极端情况下（字符串里出现 // 之类）有风险。
 *
 * ⚠️ 依赖执行顺序：这个脚本挂在 after_generate，跑在文件写盘之后、
 *    GitHub Actions 打包 public/ 之前。改了执行时机要重新验证。
 * ============================================================================
 */

/* 我写的样式（其余 CSS 属于主题或第三方，不动） */
var MY_CSS = [
  'css/fonts.css',
  'css/pink-white.css',
  'css/restyle.css'
];

/* 我写的脚本（oml2d.min.js 是第三方，oml2d.LICENSE.txt 是它的许可证，都不动） */
var MY_JS = [
  'js/nav-a11y.js',
  'js/hero-waves.js',
  'js/about-timer.js',
  'js/about-hero.js',
  'js/hero-typing.js',
  'js/oml2d-init.js'
];

var fs = require('fs');
var path = require('path');

var stats = { html: 0, css: 0, js: 0, jsSkipped: 0, bytes: 0 };

/* ── HTML：剥掉 <!-- ... --> ──────────────────────────────────────────────
   注意保留 <!--[if ...]> 这类条件注释？本站没有用到，且现代浏览器早已不支持，
   所以一律剥掉。 */
function stripHtmlComments(s) {
  return s.replace(/<!--[\s\S]*?-->/g, '');
}

/* ── CSS：剥掉块注释 ────────────────────────────────────────────────────── */
function stripCssComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '');
}

/* ── JS：剥掉块注释和行注释 ────────────────────────────────────────────────
   行注释的正则要求 // 前面是行首或空白，这样 http:// 这类（前面是冒号）
   不会被误伤。剥完再做语法自检兜底。 */
function stripJsComments(s) {
  var out = s.replace(/\/\*[\s\S]*?\*\//g, '');
  out = out.replace(/(^|\s)\/\/[^\n\r]*/g, '$1');
  /* 去掉因为删注释留下的整行空白，让文件更紧凑 */
  out = out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  return out;
}

function canParse(code) {
  try {
    /* 只解析不执行 */
    new Function(code);
    return true;
  } catch (e) {
    return false;
  }
}

function walk(dir, ext, out) {
  var list;
  try { list = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (var i = 0; i < list.length; i++) {
    var p = path.join(dir, list[i].name);
    if (list[i].isDirectory()) {
      walk(p, ext, out);
    } else if (path.extname(list[i].name) === ext) {
      out.push(p);
    }
  }
  return out;
}

function runStrip(tag) {
  var pub = hexo.public_dir;
  /* 每次跑都重置统计，两个钩子各报各的 */
  stats = { html: 0, css: 0, js: 0, jsSkipped: 0, bytes: 0 };

  /* ── HTML ── */
  walk(pub, '.html', []).forEach(function (f) {
    var before = fs.readFileSync(f, 'utf8');
    var after = stripHtmlComments(before);
    if (after !== before) {
      fs.writeFileSync(f, after, 'utf8');
      stats.html++;
      stats.bytes += before.length - after.length;
    }
  });

  /* ── CSS ── */
  MY_CSS.forEach(function (rel) {
    var f = path.join(pub, rel);
    if (!fs.existsSync(f)) return;
    var before = fs.readFileSync(f, 'utf8');
    var after = stripCssComments(before);
    if (after !== before) {
      fs.writeFileSync(f, after, 'utf8');
      stats.css++;
      stats.bytes += before.length - after.length;
    }
  });

  /* ── JS（带语法自检兜底）── */
  MY_JS.forEach(function (rel) {
    var f = path.join(pub, rel);
    if (!fs.existsSync(f)) return;
    var before = fs.readFileSync(f, 'utf8');
    var after = stripJsComments(before);
    if (after === before) return;
    if (!canParse(after)) {
      /* 剥完解析不了 —— 保留原文件，绝不让线上脚本坏掉 */
      stats.jsSkipped++;
      hexo.log.warn('[strip-comments] 剥离后语法不通过，已保留原文件：' + rel);
      return;
    }
    fs.writeFileSync(f, after, 'utf8');
    stats.js++;
    stats.bytes += before.length - after.length;
  });

  hexo.log.info(
    '[strip-comments:' + tag + '] HTML ' + stats.html + ' 个 / CSS ' + stats.css +
    ' 个 / JS ' + stats.js + ' 个（跳过 ' + stats.jsSkipped +
    ' 个），共省下 ' + Math.round(stats.bytes / 1024) + ' KB'
  );
}

/* ⚠️ 必须挂两个钩子，缺一个就会漏掉一半文件。
   ---------------------------------------------------------------------------
   实测教训：只挂 after_generate 时，日志显示 CSS/JS 都剥了、HTML 只剥到 2 个，
   而 message 页的 HTML 注释原封不动地留在了线上。

   原因是 Hexo 的两类文件写盘时机不同：
     · 拷贝型资源（source/css、source/js、主题资源）—— after_generate 时已就位
     · 渲染型页面（.html）—— **在 after_generate 之后**才写盘
   日志顺序可以直接看出来：
       [strip-comments] HTML 2 个 …
       Files loaded in 1.3 s
       Generated: message/index.html     ← 这时才写

   所以补挂 before_exit（进程退出前触发，此时全部文件都已落盘）。
   两个钩子处理的是同一批路径，但剥离本身是幂等的，跑两次不会重复剥。
   --------------------------------------------------------------------------- */
hexo.extend.filter.register('after_generate', function () { runStrip('after_generate'); });
hexo.extend.filter.register('before_exit', function () { runStrip('before_exit'); });
