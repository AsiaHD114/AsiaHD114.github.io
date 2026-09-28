/**
 * 首页分类筛选条 —— 参考 blog.fqzlr.top 首屏那一条
 * ============================================================================
 * 参考站长这样（用户给的截图）：
 *     [🏠] 归档   cheshi 1   分类 1   哲学随想 10   技术教程 25   读书感悟 5
 * 即：一个首页图标 + 「归档」 + 各分类的胶囊，胶囊右侧带该分类的文章数。

 * ⚠️ 为什么用 scripts/ 注入，而不是改主题模板或写 source/index.md：
 *    本站首页**没有** source/index.md，它由 hexo-generator-index 生成，
 *    没有可编辑的页面文件。所以只能在渲染产物上补一刀 ——
 *    这与 asset-version.js / strip-comments.js 同一套做法，主题目录一个字不动，
 *    升级 Butterfly 直接覆盖不会丢。

 * ⚠️ 只在首页注入，判据是**两个条件同时成立**：
 *      class="full_page"（Butterfly 只在首页给 #page-header 加这个类）
 *      id="recent-posts"（文章列表容器，只有首页有）
 *    已核对：归档页两者都没有，所以不会被误注入。

 * ⚠️ 注入位置：**#recent-posts 的第一个子节点**，不是它的兄弟。
 *    因为 #content-inner 里同时放着 #recent-posts 和 #aside-content，
 *    直接塞成兄弟会变成第三个 flex 项、把两栏挤变形。
 *    #recent-posts 自己是普通块容器，塞首个子节点是安全的；
 *    CSS 里另外给了 flex-basis:100% / grid-column:1/-1 双保险，
 *    万一以后主题把它改成 flex/grid 布局，这一条也会自动占满一整行。

 * ⚠️ 这一条是**链接栏，不是客户端筛选**：
 *    点分类胶囊 = 跳到该分类页（/categories/技术/ 这种真实 URL）。
 *    理由：真实链接可被爬虫收录、可右键新窗打开、无 JS 也能用、可分享。
 *    客户端筛选（就地显隐卡片）本站意义不大 —— 一共 5 篇、每页 10 篇，全在一页里。
 *    真要改成筛选说一声。

 * ⚠️ 失败绝不阻断构建：拿不到分类数据就原样返回，首页少一条栏位而已。
 * ============================================================================
 */

hexo.extend.filter.register('after_render:html', function (str) {
  /* 只在首页、且只注入一次 */
  if (str.indexOf('class="full_page"') < 0) return str;
  if (str.indexOf('id="recent-posts"') < 0) return str;
  if (str.indexOf('id="home-cat-bar"') >= 0) return str;

  var cats;
  try {
    cats = hexo.locals.get('categories').toArray();
  } catch (e) {
    hexo.log.warn('[home-cat-bar] 读取分类失败，跳过注入：' + e.message);
    return str;
  }
  if (!cats || !cats.length) return str;

  var cfg = hexo.config;
  /* 根路径可能是 '/' 也可能是 '/blog/' 之类，统一归一化后再拼 */
  var root = String(cfg.root || '/');
  if (root.charAt(root.length - 1) !== '/') root += '/';
  function url(p) {
    return root + String(p).replace(/^\/+/, '');
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* 按文章数从多到少排 —— 这是个「按分类找文章」的入口，多的排前面更好点。
     （侧栏那张分类卡是主题按名称排的，两者不一致是有意的：
       侧栏是目录、这里是用得最多的入口。想统一改成 name 排序就换下面这行。） */
  cats = cats.slice().sort(function (a, b) { return (b.length || 0) - (a.length || 0); });

  var html = '<nav id="home-cat-bar" aria-label="按分类浏览文章">';

  /* 首页图标 —— 对应参考站最左边那个深色圆钮，语义是「全部文章」 */
  html += '<a class="home-cat-chip home-cat-chip--home" href="' + esc(url('')) + '"'
    + ' title="首页 · 全部文章" aria-label="首页 · 全部文章" aria-current="page">'
    + '<i class="fas fa-house" aria-hidden="true"></i></a>';

  /* 归档 —— 参考站里它紧挨着首页图标，且**不带**文章数 */
  html += '<a class="home-cat-chip" href="' + esc(url('archives/')) + '">归档</a>';

  cats.forEach(function (cat) {
    html += '<a class="home-cat-chip" href="' + esc(url(cat.path)) + '"'
      + ' title="' + esc(cat.name + '（' + (cat.length || 0) + ' 篇）') + '">'
      + esc(cat.name)
      + '<span class="home-cat-count" aria-hidden="true">' + (cat.length || 0) + '</span>'
      + '</a>';
  });

  html += '</nav>';

  var replaced = str.replace(
    /(<div class="recent-posts[^"]*" id="recent-posts">)/,
    '$1' + html
  );
  if (replaced === str) {
    hexo.log.warn('[home-cat-bar] 没找到 #recent-posts 的插入点，未注入（主题结构可能变了）');
    return str;
  }

  hexo.log.info('[home-cat-bar] 已注入首页分类筛选条，' + (cats.length + 2) + ' 个入口');
  return replaced;
});
