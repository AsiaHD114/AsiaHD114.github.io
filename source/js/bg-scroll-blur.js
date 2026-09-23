/**
 * 首屏壁纸：随滚动裁剪 + 模糊 —— 把两个值写进 CSS 变量
 * ============================================================================
 * 配合 restyle.css 的 ⑳ 段。固定壁纸层用：
 *     clip-path: inset(0 0 var(--hero-clip, 0px) 0);
 *     filter:    blur(calc(9px * var(--bg-fade, 0)));
 *
 * 这个脚本负责写两个变量：
 *
 *   ① --hero-clip（像素值）
 *      首屏已经滚出视口的高度。壁纸层是 position: fixed，本身铺满视口，
 *      用这个值从**底部**裁掉，它可见的部分就恰好只剩首屏还在屏幕上的那一段。
 *        顶部        → 0      → 壁纸完整
 *        滚了一半    → 50vh   → 壁纸只占上半屏，和首屏严丝合缝
 *        首屏滚完    → 100vh  → 壁纸完全裁掉，内容区底下什么都没有
 *
 *      为什么用「裁剪」而不是「降低透明度」：
 *        上一版是靠 opacity = 1 - 滚动进度 淡出，结果在内容刚进入画面的位置
 *        透明度只到 0.83 左右，肉眼就是"微微透明"。裁剪没有这个中间态 ——
 *        要么完整可见，要么已经裁掉，不可能"差一点点"。
 *
 *   ② --bg-fade（0 → 1）
 *      只用来驱动模糊，满足「下滑会进行模糊处理」。
 *      注意它**不再**参与透明度。
 *
 * 性能：
 *   · 首屏高度只在初始化和 resize 时量一次，不放在每帧里（避免强制重排）
 *   · scroll 回调只置标记，真正的计算在 requestAnimationFrame 里
 *   · passive: true
 *   · 两个值的变化都小于阈值时直接跳过写入
 *
 * 无障碍：
 *   系统开启「减少动效」时**仍然照常写 --hero-clip** —— 因为裁剪不是装饰，
 *   它决定壁纸该不该盖在内容区上。不写的话滚下去壁纸会一直糊在正文后面。
 *   模糊那一项由 CSS 在 reduced-motion 下关掉。
 *
 * 非首页：
 *   直接写 --hero-clip: 100vh（壁纸整层裁掉，等于不显示），也不挂滚动监听。
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

  /* 非首页：整层裁掉，不挂监听 */
  if (!hero) {
    root.style.setProperty('--hero-clip', '100vh');
    return;
  }

  var heroHeight = hero.offsetHeight || window.innerHeight || 1;
  var MIN_DELTA = 0.01;
  var lastClip = -1;
  var lastFade = -1;
  var ticking = false;

  function measure() {
    heroHeight = hero.offsetHeight || window.innerHeight || 1;
  }

  function compute() {
    ticking = false;

    var y = window.pageYOffset || document.documentElement.scrollTop || 0;

    /* ① 裁剪高度：夹在 0 ~ 首屏高度之间 */
    var clip = y;
    if (clip < 0) clip = 0;
    if (clip > heroHeight) clip = heroHeight;

    if (Math.abs(clip - lastClip) >= 1) {
      lastClip = clip;
      root.style.setProperty('--hero-clip', clip + 'px');
    }

    /* ② 模糊进度：只到 0.9 屏就拉满，不用等首屏完全走完 */
    var fade = y / (heroHeight * 0.9);
    if (fade < 0) fade = 0;
    if (fade > 1) fade = 1;
    if (Math.abs(fade - lastFade) >= MIN_DELTA) {
      lastFade = fade;
      root.style.setProperty('--bg-fade', fade.toFixed(3));
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

  /* 首屏同步给一次：刷新后停在页面中间时，裁剪必须立刻正确 */
  measure();
  compute();
})();
