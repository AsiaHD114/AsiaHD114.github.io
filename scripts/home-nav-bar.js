/**
 * 首页快捷入口条 —— 归档 / 分类 / 友链
 * ============================================================================
 * 用户要求：「首页分类条为，归档，分类，友链」。
 *
 * 演变记录（免得以后看不懂这条为什么会是这样）：
 *   第一版（commit 81abaae，文件名 home-cat-bar.js）是照 blog.fqzlr.top 首屏做的
 *   「首页图标 + 归档 + 各分类胶囊（带文章数）」，数据取 hexo.locals 里的分类。
 *   用户随后指定只要三个入口：归档 / 分类 / 友链 —— 于是：
 *     · 内容变成三条**固定链接**，不再依赖分类数据
 *     · 原来的首页图标一并去掉（它是跳回本页，在首页上本就是空链接）
 *     · 文件与 id 都从 cat-bar 改名成 nav-bar：名字还叫「分类条」会误导后来的人
 *
 * ⚠️ 因为不再读 hexo.locals，这个脚本**没有失败路径**了 ——
 *    早先那版拿不到分类数据就得整体跳过并告警，现在只剩拼三条固定的 <a>。

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
  ENTRIES.forEach(function (item) {
    var url = root + String(item.href).replace(/^\/+/, '');
    html += '<a class="home-nav-chip" href="' + esc(url) + '">' + esc(item.text) + '</a>';
  });
  html += '</nav>';

  var replaced = str.replace(
    /(<div class="recent-posts[^"]*" id="recent-posts">)/,
    '$1' + html
  );
  if (replaced === str) {
    hexo.log.warn('[home-nav-bar] 没找到 #recent-posts 的插入点，未注入（主题结构可能变了）');
    return str;
  }

  hexo.log.info('[home-nav-bar] 已注入首页快捷入口条，' + ENTRIES.length + ' 个入口');
  return replaced;
});
