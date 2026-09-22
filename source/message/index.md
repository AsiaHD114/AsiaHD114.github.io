---
title: 聊天喵
date: 2026-09-20 20:30:00
# ⚠️ 必须是 true，不能删。
# 站点根目录的 scripts/comments-default-off.js 按这个键决定是否显示评论区：
#   有 comments_on: true  → 显示
#   没有（或其它值）      → 不显示
# 全站只有这一页写了它，所以这里是唯一的评论区。
#
# ⚠️ 别写成 comments: true —— Hexo 给 comments 的默认值本来就是 true，
#    写成那样起不到开关作用（这个坑实测踩过，日志可证）。
comments_on: true
---

<!--
  聊天喵就是「一个只有评论区的页面」。
  正文留空即可，访客看到的是下方的评论区。

  ⚠️ URL 仍然是 /message/，没有跟着改名。
      原因是 Twikoo 按「页面路径」归档评论 —— 改路径会让已经发出去的评论
      不再显示在这一页上（数据还在，只是挂到了旧路径下）。
      导航里显示的名字在 _config.butterfly.yml 的 menu 段。

  评论系统：Twikoo（后端部署在 Netlify，配置见 _config.butterfly.yml 的 twikoo 段）。
-->
