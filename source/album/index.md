---
title: 相册
date: 2026-09-23 10:00:00
comments: false
---

<!--
  ===========================================================================
  相册页 —— 三本相册的封面墙
  ===========================================================================

  版式参考 https://blog.fqzlr.top/albums/ （用户给的参考站）：
      封面 → 相册名 + 箭头 → 一句描述 → 日期 · 来源 → 标签
  配色没有照抄，全部回到本站的粉色系；封面也没有图片，是渐变 + 一个图标。

  ── 一、这一页在干什么 ---------------------------------------------------------
  .album-grid 里是三张卡片，整张卡片可点，点进去是那本相册的详情页：
      GameTime！   → /album/gametime/
      LovelyPhoto  → /album/lovelyphoto/
      shadows      → /album/shadows/

  ⚠️ 描述、日期、来源、标签这几行是我先填的占位内容（不填卡片会显得很空）。
     改法：直接改对应 <p class="album-card-desc">、.album-card-meta、
     .album-card-tags 里的字，改完不用动别处。

  ── 二、为什么卡片不是用主题的 {% galleryGroup %} 标签 ---------------------------
  ⚠️ 这是这一页最容易被误改的地方，原因写清楚：

    ① 主题的 galleryGroup 标签**强制输出一张封面图**
         <img class="gallery-group-img" src='...'>
       而本站现在没有任何相册照片。封面参数只能留空，src='' 在浏览器里不等于
       「没有图」—— 按 HTML 规范它会被解析成**当前页面地址**，卡片上要么是
       破图图标，要么白跑一次请求。

    ② 参考站的卡片是「上图下文」两段式，主题标签是「把名字压在图上」的悬停式，
       结构本来就不一样，硬套标签反而要写一堆覆盖样式。

    所以卡片是这里手写的 HTML，类名统一用 .album-*，样式全在 restyle.css ㉞ 一节，
    不依赖主题的 gallery.styl。以后想换回主题标签也行，但那样就得放弃现在的版式。

  ── 三、往卡片里加/删相册 ------------------------------------------------------
  复制一整块 <article class="album-card">…</article>，改四处：
      · <a href> 和 aria-label
      · 封面的类名（album-cover-xxx，渐变在 ㉞ 里定义）
      · 封面图标 <i class="fas fa-xxx">
      · 名字 / 描述 / 日期 / 标签
  文件末尾那份注释里还留着模板。

  ── 四、每本相册的详情页 --------------------------------------------------------
  source/album/gametime/index.md、source/album/lovelyphoto/index.md、
  source/album/shadows/index.md 三份文件已经建好（返回按钮、元信息、标签、
  照片墙的位置都排好了），照片放进去就能用。

  ── 五、图片放哪 ----------------------------------------------------------------
  放 source/img/album/ 下面（按相册分文件夹），引用写成 /img/album/xxx/01.webp。
  ⚠️ 建议先把图压到 200~400 KB 以内再放进仓库，否则相册页会变慢。
     本站图片目前都是 WebP，能用 WebP 更好。
  ===========================================================================
-->

<!--
  ⚠️ 下面那个空 span 是**故意的**，不要删。
  它的作用是给 CSS 一个「只在相册总览页生效」的钩子：
  所有内页的首屏都是同一个 #page-header.not-home-page，
  主题没有提供按页面的选择器，所以这里放一个唯一的 id，
  restyle.css 用 :has(#album-page) 把富士山壁纸只挂到这一页上。
  （关于页用的是同一个办法：:has(#about-timer)；聊天喵是 :has(#message-page)）

  ⚠️ 三本相册的详情页**不带这个 id** —— 它们各自带 #album-gametime /
  #album-lovelyphoto / #album-shadows，首屏换成了那本相册自己的封面渐变。
  改 id 之前先看一眼 ㉞。

  span 带 hidden，不会显示、不占位，也不影响读屏。
-->
<span id="album-page" hidden></span>

<p class="album-lead">记录游戏、日常与光影的三本相册。照片还在路上。</p>

<div class="album-grid">
<article class="album-card">
<a class="album-card-link" href="/album/gametime/" aria-label="打开相册：GameTime！">
<div class="album-card-cover album-cover-gametime" aria-hidden="true"><i class="fas fa-gamepad"></i></div>
<div class="album-card-body">
<div class="album-card-title-row"><h2>GameTime！</h2><i class="fas fa-arrow-right album-card-arrow" aria-hidden="true"></i></div>
<p class="album-card-desc">游戏时光</p>
<div class="album-card-meta"><span>2026-09-26</span><span>本地相册</span></div>
<div class="album-card-tags"><span>#游戏</span><span>#截图</span></div>
</div>
</a>
</article>
<article class="album-card">
<a class="album-card-link" href="/album/lovelyphoto/" aria-label="打开相册：LovelyPhoto">
<div class="album-card-cover album-cover-lovelyphoto" aria-hidden="true"><i class="fas fa-heart"></i></div>
<div class="album-card-body">
<div class="album-card-title-row"><h2>LovelyPhoto</h2><i class="fas fa-arrow-right album-card-arrow" aria-hidden="true"></i></div>
<p class="album-card-desc">可爱日常</p>
<div class="album-card-meta"><span>2026-09-26</span><span>本地相册</span></div>
<div class="album-card-tags"><span>#日常</span><span>#可爱</span></div>
</div>
</a>
</article>
<article class="album-card">
<a class="album-card-link" href="/album/shadows/" aria-label="打开相册：shadows">
<div class="album-card-cover album-cover-shadows" aria-hidden="true"><i class="fas fa-moon"></i></div>
<div class="album-card-body">
<div class="album-card-title-row"><h2>shadows</h2><i class="fas fa-arrow-right album-card-arrow" aria-hidden="true"></i></div>
<p class="album-card-desc">光影与暗调</p>
<div class="album-card-meta"><span>2026-09-26</span><span>本地相册</span></div>
<div class="album-card-tags"><span>#暗调</span><span>#光影</span></div>
</div>
</a>
</article>
</div>
