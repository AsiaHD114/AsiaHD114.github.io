/* ============================================================================
   页面标题 —— 打字机效果
   ----------------------------------------------------------------------------
   参考 poetize.cn 的入场文案效果：标题像被一个字一个字敲出来的。

   ⚠️ 作用范围：**除关于页以外的所有页面**（用户要求「每个板块都加，除了笔者那个」）。
      #site-title 各页内容不同，实际覆盖情况：
        首页          → "AsiaHD's blog"      ✅ 打字
        友链          → "友情链接喵"          ✅ 打字
        分类 / 标签   → "分类" / "标签"       ✅ 打字
        归档（含子页） → "归档" / "2026" / "九月 2026"  ✅ 打字
        留言板        → "留言板"              ✅ 打字
        关于页        → "关于笔者"            ❌ 排除
        文章页        → 没有 #site-title（标题在 #post-info .post-title 里），自然跳过

      关于页排除的原因：它的首屏标题被视觉隐藏了
      （:has(#about-timer) #page-site-info 那套 sr-only），敲了也看不见。
      判据用 #about-timer，与 about-hero.js / hero-waves.js / CSS 的 :has() 一致。

   ⚠️ 为什么是「打一次就停」而不是无限循环重打：
      ui-ux-pro-max 的 Continuous Animation 条目（Medium）写明
      「Infinite animations are distracting / Don't: Use for decorative elements」。
      打字机属于装饰性动效，所以做成一次性入场 —— 这也正合
      frontend-design 说的「a single orchestrated moment ... lands better」。

   ⚠️ 无障碍（两个都要做，缺一不可）：
     ① 逐字 span 必须 aria-hidden，否则读屏会把标题一个字母一个字母念出来。
        整串文本改放到 #site-title 的 aria-label 上，读屏读到的仍是完整标题。
     ② 字符在显示前用 visibility: hidden 而不是 display: none ——
        隐藏时仍占位，所以标题的排版从一开始就是最终位置，
        逐字显示的过程中不会有任何位移（居中标题尤其明显）。
   ============================================================================ */
(function () {
  'use strict';

  /* ── 配置 ───────────────────────────────────────────────────────────── */
  var START_DELAY = 320;   // 入场后等多久开始敲（避开首屏的其他动画）
  var CHAR_DELAY = 95;     // 每个字之间的间隔
  /* 敲完之后光标**一直闪**（用户要求），所以不再有「停留后淡出」的配置。
     闪烁本身由 CSS 的 @keyframes type-blink 无限动画负责，脚本不参与；
     系统开启「减少动效」时 CSS 会让它静止。
     相应代价：这属于 ui-ux-pro-max 的 Continuous Animation（Medium）
     "Infinite animations are distracting"，缓解办法就是上面那条减动效分支。 */

  /* ─────────────────────────────────────────────────────────────────────── */

  function build() {
    var header = document.getElementById('page-header');
    if (!header) return;

    /* 关于页排除：它的首屏标题是「关于笔者」，而且被视觉隐藏了
       （:has(#about-timer) #page-site-info 那套 sr-only），打字毫无意义。
       判据用 #about-timer —— 与 about-hero.js / hero-waves.js / CSS 的 :has() 一致，
       四处同进同退，把计时器挪走时会一起跟过去。 */
    if (document.getElementById('about-timer')) return;

    /* 其余页面都打。文章页没有 #site-title（标题在 #post-info .post-title 里），
       会被下面这行自然跳过，不需要单独判断。 */
    var title = document.getElementById('site-title');
    if (!title) return;
    /* 防重复：PJAX 之类重新挂载时不重复包裹 */
    if (title.getAttribute('data-typed') === '1') return;

    var text = (title.textContent || '').trim();
    if (!text) return;

    title.setAttribute('data-typed', '1');

    /* 完整文本留给读屏；视觉部分整体 aria-hidden */
    title.setAttribute('aria-label', text);
    title.textContent = '';

    var chars = [];
    for (var i = 0; i < text.length; i++) {
      var span = document.createElement('span');
      span.className = 'type-ch';
      span.setAttribute('aria-hidden', 'true');
      /* 空格也要占位，用 textContent 原样放进去即可 */
      span.textContent = text.charAt(i);
      title.appendChild(span);
      chars.push(span);
    }

    var cursor = document.createElement('span');
    cursor.className = 'type-cursor';
    cursor.setAttribute('aria-hidden', 'true');

    /* ⚠️ 光标不能直接 append 到末尾。
       未敲到的字用 visibility: hidden —— 它们**仍然占位**，
       所以 append 到末尾的话，光标会一直停在整串文字的最后面，
       而文字才敲到一半，中间留出一大段空白。
       正确做法：每次把光标插到「下一个待敲的字」之前，让它跟着进度走。 */
    function placeCursor(index) {
      if (index < chars.length) {
        title.insertBefore(cursor, chars[index]);
      } else {
        title.appendChild(cursor);
      }
    }
    placeCursor(0);

    /* 系统开启「减少动效」：不做打字，直接全显，且不装光标 */
    var reduced = false;
    try {
      reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { /* 老浏览器没有 matchMedia，按正常流程走 */ }

    if (reduced) {
      for (var j = 0; j < chars.length; j++) chars[j].classList.add('is-on');
      if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
      return;
    }

    var k = 0;
    function step() {
      if (k >= chars.length) {
        /* 敲完。光标继续闪 —— 闪烁是 CSS 的 type-blink 无限动画，脚本不用管。
           （系统开了「减少动效」时 CSS 会让它静止，也不需要在 JS 里分支） */
        return;
      }
      chars[k].classList.add('is-on');
      k++;
      placeCursor(k);          /* 光标跟到下一个待敲的字前面 */
      setTimeout(step, CHAR_DELAY);
    }
    setTimeout(step, START_DELAY);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
