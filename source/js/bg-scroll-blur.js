/**
 * 整页背景的滚动模糊 —— 把滚动进度写进 CSS 变量
 * ============================================================================
 * 做什么：
 *   配合 restyle.css 的 ⑳ 段。背景固定层用
 *       filter: blur(calc(9px * var(--bg-blur-progress, 0)))
 *   这个脚本负责把 --bg-blur-progress 从 0（页面顶部，背景清晰）
 *   逐渐写到 1（滚过约四分之三屏，背景达到最大模糊）。
 *
 * 为什么用 JS 而不是纯 CSS：
 *   CSS 本身拿不到"滚动进度"这个值（scroll-driven animations 目前只有
 *   Chromium 支持，Safari/Firefox 都还不行）。参考站也是用 JS 写变量的。
 *
 * 性能上的做法：
 *   · scroll 回调里**不直接**改样式，只置一个标记并请求一帧，
 *     真正的计算放在 requestAnimationFrame 里 —— 避免滚动时每帧多次写样式
 *   · passive: true —— 不阻塞滚动
 *   · 进度变化小于 0.01 就跳过写入 —— 省掉大量无意义的样式重算
 *   · will-change: filter 已在 CSS 里声明，让浏览器把背景层单独提成合成层
 *
 * 无障碍：
 *   系统开启「减少动效」时**整个脚本不启动**，由 CSS 给一个固定的 6px 模糊。
 *   滚动联动的模糊属于"非用户触发的装饰性动效"，本来就该让位。
 *
 * 非首页：
 *   参考站里非首页的背景是一开始就模糊的。这里照做 ——
 *   不是首页就直接写死 0.55，不挂 scroll 监听，省掉一份开销。
 *   判断依据是页面上有没有 #page-header.full_page（Butterfly 只在首页给这个类）。
 *
 * ⚠️ 与 asset-version.js 的关系：
 *    这个文件也要列进 scripts/asset-version.js 的 LOCAL_ASSETS，
 *    否则它拿不到 ?v= 防缓存标识，改完用户看不到变化。
 * ============================================================================
 */
(function () {
  'use strict';

  var root = document.documentElement;

  /* 减少动效：交给 CSS 的静态模糊，这里直接退出 */
  var mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mq && mq.matches) return;

  /* 非首页：直接给一个固定的轻模糊，不挂滚动监听 */
  var hero = document.querySelector('#page-header.full_page');
  if (!hero) {
    root.style.setProperty('--bg-blur-progress', '0.55');
    return;
  }

  var MAX_SCROLL_RATIO = 0.75;   /* 滚过 0.75 屏就到达最大模糊 */
  var MIN_DELTA = 0.01;          /* 进度变化小于这个值就不写 */

  var ticking = false;
  var last = -1;

  function compute() {
    ticking = false;

    var vh = window.innerHeight || 1;
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    var p = y / (vh * MAX_SCROLL_RATIO);
    if (p < 0) p = 0;
    if (p > 1) p = 1;

    if (Math.abs(p - last) < MIN_DELTA) return;
    last = p;
    root.style.setProperty('--bg-blur-progress', p.toFixed(3));
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(compute);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  /* 窗口尺寸变化会改变换算基准，重算一次 */
  window.addEventListener('resize', onScroll, { passive: true });

  compute();   /* 首屏同步给一次，避免刷新后停在中间位置时模糊量不对 */
})();
