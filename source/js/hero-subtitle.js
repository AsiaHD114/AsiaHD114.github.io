/* ============================================================================
   首页首屏 —— 随机副标题 + 一行圆形链接
   ----------------------------------------------------------------------------
   用户要求：「参考 https://blog.fqzlr.top/ ，为我的 blog 主页也添加这个样式，
   随机变化的文字 + 链接」。

   参考站首屏的结构（我抓了它的 HTML 核对过，不是照着图猜的）：
     # Fqzlrのblog                          ← 大标题
     不因虚度年华而悔恨，不因碌碌无为而羞愧      ← 一行副标题
     [Bilibili] (邮件) (打赏) (RSS)          ← 一行链接
   其中 Bilibili 是「图标 + 文字」的胶囊，其余三个是纯圆形图标，
   每个都带 title 属性做悬停提示。
   这里复刻的就是这个结构；配色仍走本站的粉/玫红，不引入新颜色。

   ⚠️ 为什么用脚本注入，而不是改主题模板：
      与 hero-waves / about-hero / hero-typing 同一套做法 —— 所有自定义元素都由
      source/js/ 下的脚本注入，themes/butterfly/ 一个字不动。
      好处是以后升级 Butterfly 直接覆盖主题目录，这些东西不会丢。

   ⚠️ 改内容只需要动下面两个数组，别的地方都不用碰：
      LINES —— 随机副标题的候选句子
      LINKS —— 链接清单（icon 用 FontAwesome 类名；写了 text 就变成带文字的胶囊）

   ⚠️ 无障碍（ui-ux-pro-max 优先级 1、2）：
      · 每个链接都同时带 aria-label 与 title。参考站只有 title ——
        那是鼠标悬停才看得到的东西，对读屏用户等于没有名字。
      · 触控目标 44x44（优先级 2 的硬性要求），图标本身 18px 上下。
      · 副标题**刻意不加 aria-live**：它每 8 秒换一句，加 aria-live 会让读屏
        每隔 8 秒插一句话，属于骚扰。
      · 「减少动效」下**不轮播**，进页面随机选一句然后停住。
        依据 ui-ux-pro-max 的 Continuous Animation：装饰性内容不要无限动效。
   ============================================================================ */
(function () {
  "use strict";

  /* ── 配置 ───────────────────────────────────────────────────────────── */

  /* 随机副标题的候选句子。
     每次进主页随机选一句；未开启「减少动效」时按 ROTATE_MS 往下换。
     ⚠️ 这几句是我起的头，只为了把功能跑起来 —— 换成你自己想说的话即可，
        数量随意（≥1 句就行，只有 1 句时自动不轮播）。 */
  var LINES = [
    "全世界的人都离开你了，我也会在你身边",
    "记录、折腾、以及一点碎碎念",
    "不要陷入乱想和自我否定的死循环",
    "这里是 AsiaHD & Timat 的自留地",
    "当眼泪流下来，才知道，分开也是另一种明白",
    "愿你在这里找到想要的东西",
    "人不能同时拥有青春和对青春的感受",
    "爱意随风起",
    "人总是靠分开后的痛觉来分辨爱意的深浅",
    "一重山有一重山的错落",
    "我是木讷的树，你是自由的风",
  ];

  /* 链接清单。字段说明：
       icon   FontAwesome 类名（fab = 品牌图标，fas = 实心图标）
       href   目标地址
       label  读屏朗读的名字，同时作为鼠标悬停提示（必填）
       text   可选。写了就渲染成「图标 + 文字」的胶囊，不写就是纯圆形图标
       blank  可选。true 表示新标签页打开（站外链接建议加）

     ⚠️ 下面这几条全部来自你自己仓库里已有的信息，没有一条是我编的：
        · GitHub  → source/about/index.md 第 32 行
        · 两个邮箱 → source/about/index.md 第 33 行
        · 关于笔者 / 聊天喵 → 站点导航（_config.butterfly.yml 的 menu）
        想加 B 站之类，在数组里加一条就行。 */
  var LINKS = [
    {
      icon: "fab fa-github",
      href: "https://github.com/AsiaHD114",
      label: "GitHub",
      text: "GitHub",
      blank: true,
    },
    {
      icon: "fas fa-envelope",
      href: "mailto:asiahd114@gmail.com",
      label: "邮箱 asiahd114@gmail.com",
    },
    { icon: "fas fa-heart", href: "/about/", label: "关于笔者" },
    { icon: "fas fa-comment-dots", href: "/message/", label: "聊天喵" },
  ];

  var ROTATE_MS = 8000; /* 轮播间隔 */
  var FADE_MS = 420; /* 交叉淡入淡出时长，必须与 CSS 里 #site-subtitle 的 transition 一致 */

  /* ─────────────────────────────────────────────────────────────────────── */

  function build() {
    /* 只挂首页。Butterfly 只在首页给 #page-header 加 .full_page，
       判据与 bg-scroll-blur.js、CSS 的 ⑲ 保持一致。
       内页的首屏标题在 #page-site-info 里，不参与。 */
    var header = document.querySelector("#page-header.full_page");
    if (!header) return;

    var info = document.getElementById("site-info");
    if (!info) return;

    var reduce = !!(
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );

    /* ① 副标题 —— 复用主题自己的 id #site-subtitle，
       这样主题原有的 text-align: center 与 text-shadow 直接生效，少写两条 CSS。 */
    var sub = document.createElement("p");
    sub.id = "site-subtitle";
    var start = Math.floor(Math.random() * LINES.length);
    sub.textContent = LINES[start];
    info.appendChild(sub);

    /* ② 链接行 */
    var row = document.createElement("div");
    row.id = "hero-links";
    for (var i = 0; i < LINKS.length; i++) {
      var item = LINKS[i];
      var a = document.createElement("a");
      a.className = "hero-link" + (item.text ? " hero-link--text" : "");
      a.href = item.href;
      a.setAttribute("aria-label", item.label);
      a.setAttribute("title", item.label);
      if (item.blank) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }
      var icon = document.createElement("i");
      icon.className = item.icon;
      /* 链接本身已经有 aria-label 了，图标再标一次 aria-hidden，
         避免个别读屏把 <i> 的空内容也算成一个节点。 */
      icon.setAttribute("aria-hidden", "true");
      a.appendChild(icon);
      if (item.text) {
        var txt = document.createElement("span");
        txt.textContent = item.text;
        a.appendChild(txt);
      }
      row.appendChild(a);
    }
    info.appendChild(row);

    /* ③ 轮播。只有多于一句、且用户没有要求减少动效时才转。 */
    if (LINES.length > 1 && !reduce) {
      var idx = start;
      window.setInterval(function () {
        sub.style.opacity = "0";
        window.setTimeout(function () {
          /* 从「除当前这句以外」的句子里随机挑，避免连续两次撞同一句 */
          var step = 1 + Math.floor(Math.random() * (LINES.length - 1));
          idx = (idx + step) % LINES.length;
          sub.textContent = LINES[idx];
          sub.style.opacity = "1";
        }, FADE_MS);
      }, ROTATE_MS);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
