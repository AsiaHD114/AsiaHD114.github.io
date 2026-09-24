---
title: Hello World
# 置顶。
# hexo-generator-index 4.0.0 的排序是 (b.sticky || 0) - (a.sticky || 0)，
# 所以这是「数值越大越靠前」，不是布尔值。加了这个以后，
# 不管以后再加多少新文章，这一篇都会钉在首页第一位。
# 副作用：首页标题前会出现一个图钉图标（主题模板 indexPostUI.pug 第 23 行，
# 判据是 article.top || article.sticky > 0）。那个图标的默认色是主题的
# $light-orange #FF7242，与本博客配色冲突，已在 restyle.css 第 ㉙ 节改掉。
sticky: 1
# date 有两个作用：文章排序，以及页面上显示的「发表于」。
# 它**不再影响网址** —— permalink 已经由 :year/:month/:day/:title/ 改成 :title/，
# 所以这一篇的网址固定是 /hello-world/，以后怎么改日期都不会断链。
#
# ⚠️ 但 date 仍然必须手写死，不能省。
#    省掉时 Hexo 会拿「文件的修改时间」当发布日期，而 mtime 在本机和 CI 上不一样：
#      本机构建 → 检出到的工作区时间
#      线上 CI  → Actions 的检出时间
#    结果就是同一个文件在不同环境下日期不同、每次构建都可能自己变。
#
# 这里取 2026-09-22：2026-09-22 之前的实际发布时间已不可考（原文件里没有这个信息）。
date: 2026-09-22 09:00:00
---

欢迎来到 AsiaHD'blog! 这是我的第一篇文章(用于测试)。可以来[关于笔者](https://asiahd114.github.io/about/)以了解更多信息。如果你在浏览过程中遇到任何问题，请联系我，或者到[GitHub](https://github.com/AsiaHD114)上问我。

