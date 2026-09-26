---
title: shadows
date: 2026-09-26 13:12:00
comments: false
---

<!--
  ===========================================================================
  shadows —— 相册详情页（相册总览在 /album/）
  ===========================================================================
  文件位置 source/album/shadows/index.md → 网址 /album/shadows/

  版式参考 https://blog.fqzlr.top/albums/AcgExample/ ：
      返回相册 → 日期 · 来源 · 张数 · 标签 → 照片墙
  封面那一层参考站用的是相册自己的 cover 图，本页用的是这套相册的渐变
  （首屏 + 卡片封面同色），见 restyle.css ㉞。

  这本相册目前**还没有照片**，所以照片墙位置只留一句空状态说明。

  ── 放照片只要两步 --------------------------------------------------------------
    ① 图片放进 source/img/album/shadows/（建议 WebP，单张 200~400 KB 以内）
    ② 把最下面那段注释里的 <img> 模板取消注释，文件名改成实际文件名

  ⚠️ 为什么不用主题的 {% gallery %} 标签：
     它的容器 <div class="gallery-container"> 初始是 opacity: 0，要等主题脚本
     渲染完图片补上 .loaded 才显形。里面一张图都没有时，渲染出来是一个
     **永远看不见的空盒子**，页面看着像坏了。
     而且它是等宽栅格（会把图裁成同样大小），参考站的相册墙是**瀑布流**
     （保留原始比例、错落排布），两者观感不同。这里用 .album-wall
     （CSS 多列瀑布流）实现后者，有照片时直接往里丢 <img> 就行。
     ⚠️ 另外：本站 lightbox 是关的（_config.butterfly.yml 的 lightbox: 为空），
        所以照片点开不会放大。想要放大就在那里填 fancybox，全站生效。
  ===========================================================================
-->

<!--
  ⚠️ 这个 span 是首屏钩子，和总览页的 #album-page 不是同一个（别改成那个）。
  它让本页首屏换成 shadows 的封面渐变 —— restyle.css ㉞ 里
  :has(#album-shadows) 那几条规则认的就是它。删了就退回主题默认的浅粉底。
-->
<span id="album-shadows" hidden></span>

<div class="album-detail-bar">
<a class="album-back" href="/album/"><i class="fas fa-arrow-left" aria-hidden="true"></i> 返回相册</a>
<div class="album-detail-meta"><span><i class="fas fa-calendar-day" aria-hidden="true"></i>2026-09-26</span><span><i class="fas fa-folder-open" aria-hidden="true"></i>本地相册</span><span><i class="fas fa-images" aria-hidden="true"></i>0 张照片</span></div>
</div>

<div class="album-card-tags album-detail-tags"><span>#暗调</span><span>#光影</span></div>

<div class="album-wall">
<p class="album-empty">这本相册还没有照片。</p>
</div>

<!--
照片放进来之后，把下面这段的注释起止符删掉（文件名换成真实的）：

<div class="album-wall">
<img src="/img/album/shadows/01.webp" alt="">
<img src="/img/album/shadows/02.webp" alt="">
</div>

⚠️ 上面的「0 张照片」也要跟着改成实际张数。
-->
