/* ============================================================================
   首屏波浪层 —— 生成 4 个可独立动画的元素
   ----------------------------------------------------------------------------
   为什么需要 JS 造元素，而不是纯 CSS：

     CSS 里同一个元素的**多个背景层只能共享一段 animation**，没有语法能给
     每个背景层单独设速度。而伪元素只有 ::before / ::after 两个，凑不出 4 层。

     之前的实现是"2 个伪元素 × 每个 2 个背景层"= 4 层但只有 2 种速度。
     要做到"4 层各自不同的速度、并且左右方向交错"，必须有 4 个能独立动画的元素。

   附带的好处（顺带解决了上一版的性能问题）：
     每层现在是**真实元素 + transform 动画**，走 GPU 合成；
     而上一版用 background-position，每帧都要重绘。

   脚本只做一件事：把容器塞进 #page-header，里面放 4 个空 <i>。
   所有样式都在 restyle.css 的 ⑨ 节，这里不写任何样式。

   为什么不放在 inject 的 HTML 里：
     inject.bottom 的内容插在 </body> 之前，不在 #page-header 内部，
     而波浪必须跟着 hero 的底边走。所以只能由脚本挂进去。

   降级行为：
     · 脚本没跑 / 出错 → 没有波浪，页面其余部分完全正常（纯装饰）
     · prefers-reduced-motion → 元素照常创建，由 CSS 把动画关掉，
       仍然显示静态的多层波形（不是直接消失）
   ============================================================================ */
(function () {
  'use strict';

  var LAYERS = 3;

  function build() {
    var header = document.getElementById('page-header');
    if (!header) return;

    /* 全站每个页面都铺波浪 —— 只要页面上有 #page-header 就注入。
       之前是按元素判据挑页面（首页 / 计时器 / .flink），现在取消了筛选。
       已核实所有页面的 header 都带背景色（首页 .full_page、内页 .not-home-page、
       文章页 .post-bg），没有一个是 .not-top-img（那个是 height:60px; background:0），
       所以不会出现「波浪下方没有底色、像悬空一块粉色」的情况。 */
    if (header.querySelector('.hero-waves')) {
      return;
    }

    var wrap = document.createElement('div');
    wrap.className = 'hero-waves';
    /* 纯装饰，不进无障碍树 */
    wrap.setAttribute('aria-hidden', 'true');

    for (var i = 0; i < LAYERS; i++) {
      wrap.appendChild(document.createElement('i'));
    }

    header.appendChild(wrap);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
