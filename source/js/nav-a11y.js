/* ============================================================================
   导航栏二级菜单的键盘可达性补丁
   ----------------------------------------------------------------------------
   问题（加上「博文」下拉菜单后引入）：

     主题的下拉只靠 CSS :hover 展开 ——
       #nav .menus_items .menus_item:hover .menus_item_child { display: block }

     而组标题渲染出来是 <span class="site-page group">，不可聚焦；
     子项虽然都是 <a href>，但父容器是 display:none，不在 Tab 顺序里。

     结果：键盘用户完全打不开下拉，也永远到不了「归档 / 分类 / 标签」三个页面。
     这属于 WCAG 2.1 的 2.1.1（Keyboard）与 2.4.3（Focus Order）问题。

   修法（渐进增强，不改主题文件）：
     1) 给组标题加 tabindex="0" + role="button"，让它进入 Tab 顺序
     2) 注入一条 :focus-within 规则，让「聚焦」和「悬停」一样能展开
     3) 同步 aria-expanded，让读屏能播报展开/收起状态

   脚本不执行时，鼠标用户的表现与原来完全一致。
   ============================================================================ */
(function () {
  'use strict';

  var GROUP_SELECTOR = '#nav .menus_items .menus_item > .site-page.group';
  var STYLE_ID = 'nav-a11y-style';

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    /* 只加 :focus-within，主题原有的 :hover 规则保持不动 */
    style.textContent =
      '#nav .menus_items .menus_item:focus-within .menus_item_child{display:block}';
    document.head.appendChild(style);
  }

  function patchGroups() {
    var groups = document.querySelectorAll(GROUP_SELECTOR);
    if (!groups.length) return;

    injectStyle();

    Array.prototype.forEach.call(groups, function (el) {
      if (el.getAttribute('data-nav-a11y') === '1') return;
      el.setAttribute('data-nav-a11y', '1');
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-haspopup', 'true');
      el.setAttribute('aria-expanded', 'false');

      el.addEventListener('focus', function () {
        el.setAttribute('aria-expanded', 'true');
      });
      el.addEventListener('blur', function () {
        el.setAttribute('aria-expanded', 'false');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchGroups);
  } else {
    patchGroups();
  }
})();
