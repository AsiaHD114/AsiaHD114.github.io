/* ============================================================================
   看板娘初始化 — OhMyLive2D
   ----------------------------------------------------------------------------
   自建方案：库和模型都在本站，运行时不依赖任何外部 CDN。

   本文件只做三件事：读用户偏好 → 空闲时懒加载库 → 传配置。
   真正的库在 /js/oml2d.min.js（979 KB / gzip 后约 270 KB），
   故意延后到页面 load 之后的空闲时段才加载，避免抢首屏带宽。

   关于 reduce motion：
     看板娘是常驻的无限动画。开启系统级「减少动效」的用户直接不加载，
     而不是加载后暂停 —— 那样仍然会下载 270 KB 并初始化 WebGL。
   ============================================================================ */
(function () {
  'use strict';

  var LIB_URL = '/js/oml2d.min.js';
  var MODEL_URL = '/live2d/koharu/koharu.model.json';

  /* 1. 尊重系统级「减少动效」偏好：直接退出 */
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  /* 2. 库就绪后传入配置 */
  function start() {
    if (!window.OML2D || typeof window.OML2D.loadOml2d !== 'function') {
      return;
    }

    window.OML2D.loadOml2d({
      models: [
        {
          path: MODEL_URL,
          scale: 0.12,
          position: [0, 0],
          stageStyle: { width: 250, height: 250 }
        }
      ],

      /* 接主题的 CSS 变量，不写死色值。
         --btn-bg 是深品红 #AF1D88，白字 6.26:1 —— 菜单图标需要这个对比度，
         不能用浅粉 #FFB3EB（白字在它上面只有 1.63:1）。 */
      primaryColor: 'var(--btn-bg)',

      /* 不在控制台打印项目横幅 */
      sayHello: false,

      /* 移动端不显示（这也是组件的默认值，写出来是为了表明意图） */
      mobileDisplay: false,

      /* 靠左停靠，避开右下角的齿轮按钮与返回顶部 */
      dockedPosition: 'left',

      /* 默认菜单里的「关于」会跳转到组件作者的站点，这里去掉。
         隐藏/切换模型/切换衣服等其余默认项保留 —— 组件自带隐藏功能
         （stageSlideOut + 状态条点击恢复），所以不需要另外做关闭按钮。 */
      menus: {
        items: function (defaultItems) {
          return defaultItems.filter(function (item) {
            return item.id !== 'About';
          });
        }
      },

      /* 入场问候语
         ------------------------------------------------------------------
         只在模型加载完成时播一次。点击人物不会触发 —— 组件内部弹提示
         只有两个触发点：welcome()（入场一次）和 copy()（复制网页文字时），
         人物的点击区域（hitArea）只驱动动作动画，不弹提示。

         下面 8 个键是组件写死的时段，已按源码逐条核对。
         判定用 new Date().getHours()（浏览器本地时间），只精确到小时，
         分秒忽略 —— 所以 07:59 仍算 daybreak，08:00 才算 morning。

           daybreak   05:00–07:59    /^[5-7]$/                 → 5,6,7
           morning    08:00–11:59    /^(?:[8-9]|1[0-1])$/      → 8,9,10,11
           noon       12:00–13:59    /^(1[2-3])$/              → 12,13
           afternoon  14:00–17:59    /^1[4-7]$/                → 14,15,16,17
           dusk       18:00–19:59    /^1[8-9]$/                → 18,19
           night      20:00–21:59    /^2[0-1]$/                → 20,21
           lateNight  22:00–23:59    /^2[2-3]$/                → 22,23
           weeHours   00:00–04:59    （以上都不匹配时）        → 0,1,2,3,4

         8 段合计覆盖 24 小时，无缝无重叠。

         组件对配置是「深合并」（源码 rp→Ne 递归合并对象），所以理论上
         只写想改的键也行；这里把 8 个全写出来是为了让你一眼看全、方便改。 */
      tips: {
        /* 气泡配色 —— 用「白底 + 品红边框 + 阴影」的分层，而不是单一平色
           ------------------------------------------------------------------
           为什么不能用单一平色：
             气泡固定在视口左下，会飘过多种不同底色：
               页面底色   #FFFAFC（近白）
               页脚底色   #FFB3EB（浅粉）
               卡片底色   #FFFFFF（纯白）
               首页 hero  #FFB3EB → #FFD9F3 → #FFFAFC 渐变
             任何一块平色都至少会和其中一种撞上。实测：
               浅粉 #FFB3EB 对页脚 #FFB3EB = 1.00:1（完全相同，滚到底部直接消失）
               浅粉 #FFB3EB 对页面 #FFFAFC = 1.58:1
             所以改成「填充 + 边框 + 阴影」三层来建立分离。

           为什么是这组值：
             填充 #FFFFFF   比粉页脚亮，比近白页面略亮；负责"看得到是一块面"
             边框 #AF1D88   主题主色。对页面 6.06:1、对页脚 3.85:1，
                            两端都 ≥ 3:1，满足 WCAG 1.4.11（UI 边界需 3:1）
             文字 #661A52   对白底 11.45:1
             阴影           从组件默认的中性灰 drop-shadow(0 0 5px #999)
                            改成带品红调的，与主题卡片阴影一致 —— 灰影压在
                            粉底上会发脏

           这几项会生效的原因（源码 setStyle 的兜底逻辑）：
               (e = this.style).backgroundColor || (e.backgroundColor = primaryColor)
           只有 backgroundColor 为空时才回退到 primaryColor；我们显式设了值，
           所以 primaryColor 不再影响气泡（菜单和状态条仍用它）。

           位置（top / width / z-index）不在这里设 —— 在 oml2d.css 里用
           !important 控制，因为组件是通过内联样式写的。分工：这里管配色，
           CSS 管布局。 */
        style: {
          backgroundColor: '#FFFFFF',
          color: '#661A52',
          border: '2px solid #AF1D88',
          filter: 'drop-shadow(0 2px 6px rgba(175, 29, 136, .28))'
        },

        welcomeTips: {
          message: {
            daybreak:  '早上好喵~今天也是元气满满喵~',  // 05:00–07:59
            morning:   '工作喵~工作喵~',                // 08:00–11:59
            noon:      '饿了喵~想吃饭了喵~',            // 12:00–13:59
            afternoon: '工作喵~工作喵~',                // 14:00–17:59
            dusk:      '傍晚了喵~',                     // 18:00–19:59
            night:     '工作了一天辛苦了喵~',           // 20:00–21:59
            lateNight: '工作了一天辛苦了喵~',           // 22:00–23:59
            weeHours:  '夜深了喵~休息喵~'                // 00:00–04:59
          }
        }
      }
    });
  }

  /* 3. 动态插入库 */
  function loadLib() {
    if (window.OML2D) {
      start();
      return;
    }
    var s = document.createElement('script');
    s.src = LIB_URL;
    s.async = true;
    s.onload = start;
    s.onerror = function () {
      /* 静默失败：看板娘加载不了不应影响博客正常阅读 */
      if (window.console && console.warn) {
        console.warn('[oml2d] 看板娘脚本加载失败，已跳过。');
      }
    };
    document.body.appendChild(s);
  }

  /* 4. 空闲时再加载 */
  function whenIdle() {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(loadLib, { timeout: 3000 });
    } else {
      setTimeout(loadLib, 1200);
    }
  }

  if (document.readyState === 'complete') {
    whenIdle();
  } else {
    window.addEventListener('load', whenIdle);
  }
})();
