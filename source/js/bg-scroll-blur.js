/**
 * 首屏壁纸与标题：随滚动裁剪 / 模糊 / 淡出 —— 把三个值写进 CSS 变量
 * ============================================================================
 * 配合 restyle.css：
 *     body::before   { clip-path: inset(0 0 var(--hero-clip, 0px) 0);
 *                      filter:    blur(calc(9px * var(--bg-fade, 0))); }
 *     #site-title    { opacity: calc(1 - var(--title-fade, 0));
 *                      transform: translateY(calc(-14px * var(--title-fade, 0))); }
 *
 * 这个脚本写三个变量：
 *
 *   ① --hero-clip（像素值）—— 固定壁纸层从底部裁掉多少
 *      首屏是 100vh，壁纸层是 position: fixed 铺满视口。
 *      裁掉"首屏已经滚出视口的高度"，它可见的部分就恰好只剩首屏那一段：
 *        顶部 → 0      （整屏可见）
 *        一半 → 50vh   （只占上半屏，与首屏严丝合缝）
 *        滚完 → 100vh  （完全裁掉，内容区底下什么都没有）
 *      用裁剪而不是降透明度：裁剪没有中间态，不会出现"内容可见但遮挡只有 83%"。
 *
 *   ② --bg-fade（0→1）—— 只驱动背景模糊，不再参与透明度
 *
 *   ③ --title-fade（0→1）—— 大标题的淡出进度
 *      参考站 blog.fqzlr.top 的效果：往下滑时首屏标题会淡掉。
 *      它比背景快得多 —— 滚过首屏高度的 35% 标题就基本没了，
 *      所以这里用独立的、更快的进度，而不是复用 --bg-fade（那个要 0.9 屏）。
 *
 * 性能：
 *   · 首屏高度只在初始化和 resize 时量一次，不放在每帧里（避免强制重排）
 *   · scroll 回调只置标记，真正的计算在 requestAnimationFrame 里
 *   · passive: true
 *   · 每个值变化小于阈值就跳过写入
 *
 * 无障碍（ui-ux-pro-max「Motion Sensitivity」High 级）：
 *   那条要求「尊重 prefers-reduced-motion，并且不要用视差/滚动劫持」。
 *   这里的做法：
 *     · 系统开启减少动效时，CSS 会把**位移**关掉（只留淡出），
 *       因为淡出不是运动，而是状态切换；
 *     · 页面滚动本身完全不被拦截，没有 scroll-jacking。
 *
 * 非首页：
 *   直接写 --hero-clip: 100vh（壁纸整层裁掉），也不挂滚动监听。
 *   判断依据是页面上有没有 #page-header.full_page（Butterfly 只在首页给这个类）。
 *
 * ⚠️ 这个文件已列进 scripts/asset-version.js 的 LOCAL_ASSETS，
 *    改名的话记得同步那边，否则拿不到 ?v= 防缓存标识。
 * ============================================================================
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var hero = document.querySelector('#page-header.full_page');

  /* 非首页：壁纸整层裁掉，不挂监听 */
  if (!hero) {
    root.style.setProperty('--hero-clip', '100vh');
    return;
  }

  var heroHeight = hero.offsetHeight || window.innerHeight || 1;

  var CLIP_STEP = 1;      /* 裁剪值变化超过 1px 才写 */
  var FADE_STEP = 0.01;   /* 进度变化超过 0.01 才写 */

  var lastClip = -1;
  var lastFade = -1;
  var lastTitle = -1;
  var ticking = false;

  function measure() {
    heroHeight = hero.offsetHeight || window.innerHeight || 1;
  }

  function clamp01(v) {
    return v < 0 ? 0 : (v > 1 ? 1 : v);
  }

  function compute() {
    ticking = false;

    var y = window.pageYOffset || document.documentElement.scrollTop || 0;

    /* ① 裁剪：0 ~ 首屏高度 */
    var clip = y;
    if (clip < 0) clip = 0;
    if (clip > heroHeight) clip = heroHeight;
    if (Math.abs(clip - lastClip) >= CLIP_STEP) {
      lastClip = clip;
      root.style.setProperty('--hero-clip', clip + 'px');
    }

    /* ② 背景模糊：0.9 屏拉满 */
    var fade = clamp01(y / (heroHeight * 0.9));
    if (Math.abs(fade - lastFade) >= FADE_STEP) {
      lastFade = fade;
      root.style.setProperty('--bg-fade', fade.toFixed(3));
    }

    /* ③ 标题淡出：0.35 屏就淡完，比背景快得多（对齐参考站的手感） */
    var titleFade = clamp01(y / (heroHeight * 0.35));
    if (Math.abs(titleFade - lastTitle) >= FADE_STEP) {
      lastTitle = titleFade;
      root.style.setProperty('--title-fade', titleFade.toFixed(3));
    }
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(compute);
  }

  function onResize() {
    measure();
    onScroll();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });

  /* 首屏同步给一次：刷新后停在页面中间时，三个值必须立刻正确 */
  measure();
  compute();
})();
