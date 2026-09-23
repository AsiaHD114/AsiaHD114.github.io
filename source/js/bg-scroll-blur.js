/**
 * 首页壁纸的滚动淡出 —— 把滚动进度写进 CSS 变量
 * ============================================================================
 * 做什么：
 *   配合 restyle.css 的 ⑳ 段。固定背景层用
 *       opacity: calc(1 - var(--bg-fade, 0))
 *       filter:  blur(calc(9px * var(--bg-fade, 0)))
 *   这个脚本负责把 --bg-fade 从 0 写到 1：
 *       0 = 刚进首页 → 壁纸完全可见、完全清晰
 *       1 = 滑下去   → 壁纸完全透明，页面恢复成正常的淡粉白底
 *
 * 为什么是"淡出"而不是"一直留着变糊"：
 *   最初参照 blog.fqzlr.top 做过"壁纸始终在底下、只随滚动变糊"的版本，
 *   但用户的诉求是「再往下移动就是原本白色挡住壁纸了，刚进博客时壁纸应该清晰」，
 *   也就是壁纸只属于首屏，滚下去就该让位给正常白底。
 *   所以这里让同一个进度同时驱动透明度和模糊 —— 观感是「清晰 → 发糊 → 消失」。
 *
 * 为什么用 JS 而不是纯 CSS：
 *   CSS 拿不到"滚动进度"这个值（scroll-driven animations 目前只有 Chromium 支持）。
 *
 * 性能上的做法：
 *   · scroll 回调里**不直接**改样式，只置一个标记并请求一帧，
 *     真正的计算放在 requestAnimationFrame 里 —— 避免滚动时一帧多次写样式
 *   · passive: true —— 不阻塞滚动
 *   · 进度变化小于 0.01 就跳过写入 —— 省掉大量无意义的样式重算
 *   · will-change 已在 CSS 里声明，让浏览器把背景层单独提成合成层
 *
 * 无障碍：
 *   系统开启「减少动效」时 CSS 那边把 filter 关掉，但**这里仍然照常写
 *   --bg-fade** —— 因为淡出不是装饰，它决定壁纸该不该盖住内容。
 *   不写的话滚下去壁纸会一直糊在正文后面，那才是真正的干扰。
 *
 * 非首页：
 *   直接写 --bg-fade: 1（壁纸不显示），也不挂 scroll 监听。
 *   判断依据是页面上有没有 #page-header.full_page（Butterfly 只在首页给这个类）。
 *   这些页面没有首屏大图，壁纸会直接顶在内容后面，不如不显示。
 *
 * ⚠️ 与 asset-version.js 的关系：
 *    这个文件已列进 scripts/asset-version.js 的 LOCAL_ASSETS，
 *    否则它拿不到 ?v= 防缓存标识，改完用户看不到变化。
 * ============================================================================
 */
(function () {
  'use strict';

  var root = document.documentElement;

  /* 非首页：壁纸不显示，也不挂滚动监听 */
  var hero = document.querySelector('#page-header.full_page');
  if (!hero) {
    root.style.setProperty('--bg-fade', '1');
    return;
  }

  /* 滚过 0.6 屏就完全淡出 —— 大约是第一张内容卡片进入视口的位置 */
  var MAX_SCROLL_RATIO = 0.6;
  var MIN_DELTA = 0.01;

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
    root.style.setProperty('--bg-fade', p.toFixed(3));
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(compute);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  /* 首屏同步给一次：刷新后停在页面中间时，壁纸不该还亮着 */
  compute();
})();
