/* ============================================================================
   关于笔者 —— 首屏头像框
   ----------------------------------------------------------------------------
   参考 poetize.cn/love 的首屏：一块半透明毛玻璃面板，里面是圆形头像 + 名字。
   本站按前面确认的方案收敛为：
     · **只放一个头像**（复用已有的 /img/myhead.webp，不新增图片）
     · **不引入插画背景**，面板直接压在现有的粉色渐变首屏上
     · 不做参考站中间那颗心（个人站没有「两个人」的语义）

   为什么由脚本注入而不是写在 Markdown 里：
     面板要落在 #page-header 内部（跟随首屏），而 Markdown 的内容会被渲染到
     #content-inner 里，两者不是同一个容器。本脚本只做插入，样式全在
     restyle.css 的 ⑪ 节。

   ⚠️ 无障碍：
     · 头像的 alt 留空 —— 它旁边就有名字文本，读屏再念一遍头像是重复信息。
       装饰性图片配空 alt 是规范做法（不是漏写）。
     · 面板本身不是交互控件，不参与 Tab 顺序。
   ============================================================================ */
(function () {
  'use strict';

  /* ── 配置 ───────────────────────────────────────────────────────────── */
  var AVATAR = '/img/myhead.webp';   // 与 _config.butterfly.yml 的 avatar.img 一致
  var NAME = 'AsiaHD';               // 面板里显示的名字

  /* ─────────────────────────────────────────────────────────────────────── */

  function build() {
    var header = document.getElementById('page-header');
    if (!header) return;

    /* 只在关于页注入 —— 与 hero-waves.js 用同一个判定依据（页面里有计时器）。
       这样波浪和头像框永远同进同退，不会出现「有框没浪」的半截状态。 */
    if (!document.getElementById('about-timer')) return;

    /* 防重复：PJAX 之类重新挂载时不叠加 */
    if (header.querySelector('.about-hero')) return;

    var wrap = document.createElement('div');
    wrap.className = 'about-hero';

    var panel = document.createElement('div');
    panel.className = 'about-hero__panel';

    var img = document.createElement('img');
    img.className = 'about-hero__avatar';
    img.src = AVATAR;
    /* 空 alt：旁边就是名字，读屏不必重复播报头像本身 */
    img.alt = '';
    img.width = 96;
    img.height = 96;
    /* 头像不在首屏关键路径之外，但也别拖累 LCP，交给浏览器按需取 */
    img.loading = 'lazy';
    img.decoding = 'async';

    var name = document.createElement('span');
    name.className = 'about-hero__name';
    name.textContent = NAME;

    panel.appendChild(img);
    panel.appendChild(name);
    wrap.appendChild(panel);
    header.appendChild(wrap);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
