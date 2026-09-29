/**
 * 首页快捷入口条 —— 归档 / 分类 / 友链
 * ============================================================================
 * 用户要求：「首页分类条为，归档，分类，友链」。
 *
 * 演变记录（免得以后看不懂这条为什么会是这样）：
 *   第一版（commit 81abaae，文件名 home-cat-bar.js）照 blog.fqzlr.top 首屏做成
 *   「首页图标 + 归档 + 各分类胶囊（带文章数）」，数据取 hexo.locals 里的分类。
 *   第二版（commit 830a196）按用户要求改成三个固定入口「归档 / 分类 / 友链」，
 *   分类胶囊、计数、首页圆钮一并去掉，脚本与 id 从 cat-bar 改名成 nav-bar。
 *   第三版（本次）按用户要求加回房子图标，但**语义与第一版不同**：
 *     第一版那个是 <a href="/">，跳转到首页。
 *     这一个按用户原话「回到主页顶端」做成**回到顶部的动作**，不跳转。

 * ⚠️ 为什么房子用 <a href="#"> 而不是 <button>：
 *     这是个动作，按语义 button 更"正确"。但 button 在无 JS 时是死的 ——
 *     点了没有任何反应。而 <a href="#"> 无 JS 时浏览器会按锚点跳到文档顶端，
 *     **结果与有 JS 时完全一致**，这是一条真降级路径。
 *     所以这里刻意选 a：可用性优先于语义洁癖。配 aria-label 让读屏念「回到顶部」。
 *     ⚠️ 不要因为看到 href="#" 就"顺手修"成 button —— 那会把无 JS 的降级路径删掉。

 * ⚠️ 为什么不把点击处理写进 source/js/ 下的独立文件：
 *     逻辑只有十来行。独立文件要连带改 _config.butterfly.yml 的 inject.bottom
 *     和 scripts/asset-version.js 的白名单，三处联动换十来行，不划算。
 *     内联脚本只挂在首页注入的 HTML 里；strip-comments 只剥 HTML 注释，
 *     不会动 <script> 的内容。

 * ⚠️ 为什么用 scripts/ 注入，而不是改主题模板或写 source/index.md：
 *    本站首页**没有** source/index.md，它由 hexo-generator-index 生成，
 *    没有可编辑的页面文件。所以只能在渲染产物上补一刀 ——
 *    与 asset-version.js / strip-comments.js 同一套做法，主题目录一个字不动，
 *    升级 Butterfly 直接覆盖不会丢。

 * ⚠️ 只在首页注入，判据是**两个条件同时成立**：
 *      class="full_page"（Butterfly 只在首页给 #page-header 加这个类）
 *      id="recent-posts"（文章列表容器，只有首页有）
 *    已核对：归档页两者都没有，不会误注入。

 * ⚠️ 注入位置：**#recent-posts 的第一个子节点**，不是它的兄弟。
 *    因为 #content-inner 里同时放着 #recent-posts 和 #aside-content，
 *    直接塞成兄弟会变成第三个 flex 项、把两栏挤变形。
 *    CSS 里另外给了 flex: 0 0 100% / grid-column: 1/-1 双保险。
 * ============================================================================
 */

/* 三个入口。想改文字或增删条目，只动这个数组 —— 顺序即显示顺序。 */
var ENTRIES = [
  { text: '归档', href: 'archives/' },
  { text: '分类', href: 'categories/' },
  { text: '友链', href: 'link/' }
];

hexo.extend.filter.register('after_render:html', function (str) {
  /* 只在首页、且只注入一次 */
  if (str.indexOf('class="full_page"') < 0) return str;
  if (str.indexOf('id="recent-posts"') < 0) return str;
  if (str.indexOf('id="home-nav-bar"') >= 0) return str;

  var root = String(hexo.config.root || '/');
  if (root.charAt(root.length - 1) !== '/') root += '/';

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var html = '<nav id="home-nav-bar" aria-label="快捷入口">';

  /* 房子图标 —— 回到顶部。见文件头「为什么用 <a href="#"> 而不是 <button>」那条。
     ⚠️ 无 JS 时它会按 # 锚点跳到文档顶端，与有 JS 时的结果一致，这是刻意的降级路径。 */
  html += '<a class="home-nav-chip home-nav-chip--home" id="home-nav-top" href="#"'
    + ' aria-label="回到顶部" title="回到顶部">'
    + '<i class="fas fa-house" aria-hidden="true"></i></a>';

  ENTRIES.forEach(function (item) {
    var url = root + String(item.href).replace(/^\/+/, '');
    html += '<a class="home-nav-chip" href="' + esc(url) + '">' + esc(item.text) + '</a>';
  });
  html += '</nav>';

  /* 点击接管。极短的内联脚本，理由见文件头那条。
     焦点处理：只滚视口不移焦点的话，键盘用户的阅读位置其实还停在按钮上，
     所以先把焦点移到页首再滚动；preventScroll 避免它自己先跳一次。 */
  html += '<script>(function(){'
    + 'var b=document.getElementById("home-nav-top");if(!b)return;'
    + 'b.addEventListener("click",function(e){'
    + 'e.preventDefault();'
    + 'var h=document.getElementById("page-header");'
    + 'if(h){h.setAttribute("tabindex","-1");h.focus({preventScroll:true});}'
    + 'var r=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;'
    + 'window.scrollTo({top:0,behavior:r?"auto":"smooth"});'
    + '});})();<\/script>';

  var replaced = str.replace(
    /(<div class="recent-posts[^"]*" id="recent-posts">)/,
    '$1' + html
  );
  if (replaced === str) {
    hexo.log.warn('[home-nav-bar] 没找到 #recent-posts 的插入点，未注入（主题结构可能变了）');
    return str;
  }

  hexo.log.info('[home-nav-bar] 已注入首页快捷入口条，' + (ENTRIES.length + 1) + ' 个入口');
  return replaced;
});
