/**
 * 给自己的 CSS / JS 加缓存标识（?v=构建时间）
 * ============================================================================
 * 解决什么问题：
 *   本站的自定义样式与脚本是通过 Butterfly 的 inject.head / inject.bottom 注入的，
 *   写法是 <link href="/css/restyle.css">、<script src="/js/hero-waves.js">，
 *   **没有版本号**。浏览器会把它们长期缓存，于是每次改完样式都得手动 Ctrl+Shift+R，
 *   否则看到的还是旧版本 —— 这一路上已经反复撞到这个问题（改了 CSS 却看不到变化）。
 *
 * 做法：
 *   在 HTML 渲染完成后，给本站自己的 /css/*.css 与 /js/*.js 统一追加 ?v=<构建时间戳>。
 *   每次构建时间戳都会变 → 浏览器视为新文件 → 自动拉到最新，用户不需要强刷。
 *
 * 注意几点：
 *   · 只处理**本站路径**（以 /css/ 或 /js/ 开头），不碰 CDN 上的第三方资源。
 *   · 只处理下面列出的这些文件，避免误伤主题自己的资源。
 *   · 同一个版本号在整个构建内共享（在注册前算一次），
 *     否则每个页面会拿到不同版本号，白白多缓存几份。
 *   · 已经带 ?v= 的不重复追加。
 *
 * ⚠️ 这个文件在**站点根目录**的 scripts/ 下，不在主题里，
 *    所以升级 Butterfly（覆盖 themes/butterfly/）不会把它弄丢。
 * ============================================================================
 */

/* 本站自己的资源清单（改 inject 配置时记得同步这里）*/
var LOCAL_ASSETS = [
  '/css/fonts.css',
  '/css/pink-white.css',
  '/css/oml2d.css',
  '/css/restyle.css',
  '/js/nav-a11y.js',
  '/js/hero-waves.js',
  '/js/about-timer.js',
  '/js/about-hero.js',
  '/js/hero-typing.js',
  '/js/bg-scroll-blur.js',
  '/js/oml2d-init.js'
];

/* 整个构建共用一个版本号 */
var BUILD_VERSION = Date.now().toString(36);

hexo.extend.filter.register('after_render:html', function (str) {
  var out = str;
  for (var i = 0; i < LOCAL_ASSETS.length; i++) {
    var path = LOCAL_ASSETS[i];
    var esc = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    /* 匹配 href="/css/xxx.css" 或 src="/js/xxx.js"，
       后面可能已经带 ?v=... 或 ?query，这里统一归一化后再补版本号 */
    var re = new RegExp('(["\'])' + esc + '(\\?[^"\']*)?\\1', 'g');
    out = out.replace(re, function (m, quote, query) {
      return quote + path + '?v=' + BUILD_VERSION + quote;
    });
  }
  return out;
});
