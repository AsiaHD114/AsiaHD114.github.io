/**
 * 旧网址跳转 —— 给「日期式」永久链接兜底
 * ============================================================================
 * 背景：_config.yml 里的 permalink 原来是 :year/:month/:day/:title/，
 *       网址中的年月日直接取自 front-matter 的 date。于是每改一次日期，
 *       网址就换一次，旧网址当场 404。实测断掉的两条：
 *         /2026/09/23/random-chunked-transfer/    → 404
 *         /2026/09/24/ghost-bits-waf-bypass/      → 404
 *
 * 现在 permalink 已改成 :title/，网址不再带日期，根上解决了。
 * 但**已经上线过**的旧网址还会被人点到（收藏夹、聊天记录、搜索引擎缓存），
 * 所以这个脚本给它们各生成一张静态跳转页，而不是放任 404。
 *
 * ⚠️ 为什么不是真正的 301 重定向：
 *    托管在 GitHub Pages 上，纯静态，没有服务端重定向的能力。
 *    能做到的最接近的东西就是一张带 <meta http-equiv="refresh"> 的 HTML。
 *    对搜索引擎而言它比 404 好得多，但它终究不是 301，权重传递会打折扣。
 *    想拿到真 301 只能换托管（Cloudflare Pages 的 _redirects 之类）。
 *
 * ⚠️ 加新文章**不需要**动这个文件。
 *    只有「在 :title/ 方案上线之前就已经存在过的网址」才需要登记进来。
 *    换句话说：这张表只会变长一点点，然后永远不动。
 *
 * ⚠️ 跳转目标写成根相对路径（/slug/）而不是完整网址：
 *    以后换域名不用回来改这里。canonical 用绝对地址，那个由 _config.yml
 *    的 url + root 拼出来，改配置就够。
 *
 * ⚠️ 用 generator 而不是「构建完直接往 public/ 里写文件」：
 *    generator 会把路由注册进 Hexo 的 router，所以 `hexo server` 本地预览时
 *    跳转页也在；而直接写 public/ 的写法在 hexo server 下是看不到的。
 *    已核对 hexo 源码（dist/hexo/index.js 第 397-399 行）：generator 返回
 *    { path, data } 且不带 layout 时，data 原样落盘；Router 的 _toBuffer
 *    接受字符串，所以这里直接给 HTML 字符串即可。
 * ============================================================================
 */

/* 旧的日期式网址 → 新的无日期网址
   ----------------------------------------------------------------------------
   每条都注明了它为什么会存在，避免以后有人当成垃圾清理掉。 */
var REDIRECTS = [
  /* ① 实测已经 404 的两条 —— 就是用户改日期改断的 */
  {
    from: '/2026/09/23/random-chunked-transfer/',
    to: '/random-chunked-transfer/',
    why: '日期 09-23 改成 07-23，旧网址实测 404'
  },
  {
    from: '/2026/09/24/ghost-bits-waf-bypass/',
    to: '/ghost-bits-waf-bypass/',
    why: '日期 09-24 改成 08-16，旧网址实测 404'
  },

  /* ② 切到 :title/ 那一刻正在线上使用着的三条 —— 不是历史遗留，
        是「改方案的同一下就作废」的，所以一并兜住 */
  {
    from: '/2026/06/12/fastjson-java-basics/',
    to: '/fastjson-java-basics/',
    why: '切换方案前线上正在用'
  },
  {
    from: '/2026/07/23/random-chunked-transfer/',
    to: '/random-chunked-transfer/',
    why: '切换方案前线上正在用'
  },
  {
    from: '/2026/09/22/hello-world/',
    to: '/hello-world/',
    why: '切换方案前线上正在用'
  },

  /* ③ 纯保险：这条对应的日期（08-16）从没上线过 —— 它在本地工作区里存在过，
        还没提交就一起切方案了。留着是因为有人可能照着旧规律手拼过这个地址。 */
  {
    from: '/2026/08/16/ghost-bits-waf-bypass/',
    to: '/ghost-bits-waf-bypass/',
    why: '从未上线，纯保险'
  }
];

/* 跳转页的 HTML。
   - meta refresh 负责跳转，不依赖 JS
   - <script> 只是把 ?query 和 #hash 也带上（meta refresh 会丢掉它们）
   - noindex,follow：告诉搜索引擎别收录这张中转页，但顺着链接继续走
   - 那几行内联样式是为了「万一跳转被拦下来」时页面上不是一片裸白 */
function buildPage(from, to, absoluteTo) {
  return [
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="robots" content="noindex,follow">',
    '<meta http-equiv="refresh" content="0;url=' + to + '">',
    '<link rel="canonical" href="' + absoluteTo + '">',
    '<title>页面已搬家</title>',
    '<script>location.replace(' + JSON.stringify(to) + ' + location.search + location.hash);</script>',
    '<style>',
    'body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;',
    'background:#FFFAFC;color:#661A52;font:16px/1.8 system-ui,-apple-system,"Segoe UI",sans-serif}',
    'p{margin:0 0 .5em;text-align:center}',
    'a{color:#AF1D88}',
    '</style>',
    '</head>',
    '<body>',
    '<div>',
    '<p>这个网址已经不用了。</p>',
    '<p>正在带你去新地址：<a href="' + to + '">' + to + '</a></p>',
    '<p>没有自动跳转就点上面那个链接。</p>',
    '</div>',
    '</body>',
    '</html>',
    ''
  ].join('\n');
}

/* 归一化：去掉首尾斜杠，用来比对「这个网址是不是已经存在了」 */
function norm(p) {
  return String(p == null ? '' : p).replace(/^\/+/, '').replace(/\/+$/, '');
}

hexo.extend.generator.register('legacy-redirects', function (locals) {
  var cfg = hexo.config;
  var root = cfg.root || '/';
  var site = String(cfg.url || '').replace(/\/+$/, '');

  /* 绝对地址 = 站点地址 + root + 路径。root 是 '/' 时不要拼出双斜杠。 */
  function absolute(p) {
    var base = site + (root === '/' ? '' : root.replace(/\/+$/, ''));
    return base + p;
  }

  /* 收集「当前真实存在的网址」，用来检查跳转目标有没有写错。
     这里只告警、不中断构建 —— 跳转目标写错是内容问题，不该让整站发不出去。 */
  var alive = {};
  try {
    locals.posts.toArray().forEach(function (post) {
      alive[norm(post.path)] = true;
      alive[norm(post.permalink)] = true;
    });
  } catch (e) {
    hexo.log.warn('[legacy-redirects] 读取文章列表失败，跳过目标自检：' + e.message);
  }

  var seen = {};
  var routes = [];

  REDIRECTS.forEach(function (r) {
    var from = '/' + norm(r.from) + '/';
    /* ⚠️ 结尾斜杠必须留着。
       写成 /random-chunked-transfer（不带斜杠）也能跳，但 GitHub Pages 会先回一次
       301 再补上斜杠 —— 白白多一跳，搜索引擎看到的也是两次跳转。
       直接跳到带斜杠的规范地址，一次到位。 */
    var to = '/' + norm(r.to) + '/';

    if (seen[from]) {
      hexo.log.warn('[legacy-redirects] 重复登记的旧网址，已跳过：' + from);
      return;
    }
    seen[from] = true;

    /* 自检 ①：目标文章真的存在吗 */
    if (Object.keys(alive).length && !alive[norm(to)]) {
      hexo.log.warn(
        '[legacy-redirects] 跳转目标在站内不存在，会跳到 404：' + from +
        ' → ' + to + '（' + r.why + '）'
      );
    }

    /* 自检 ②：这个旧网址不会被真实的文章/页面占用吧？
       占用了就说明表该删了 —— 同一个路径两条路由，谁后写谁赢，很危险。 */
    if (Object.keys(alive).length && alive[norm(from)]) {
      hexo.log.warn(
        '[legacy-redirects] 旧网址与一篇真实文章撞车，请删掉这条登记：' + from
      );
    }

    routes.push({
      path: from + '/',           /* Router 会把结尾斜杠补成 index.html */
      data: buildPage(from, to, absolute(to))
    });
  });

  hexo.log.info('[legacy-redirects] 生成 ' + routes.length + ' 张旧网址跳转页（' +
    routes.map(function (r) { return '/' + norm(r.path); }).join('  ') + '）');

  return routes;
});
