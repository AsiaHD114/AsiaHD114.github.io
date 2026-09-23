---
title: 标签
date: 2026-09-22 09:00:00
# ⚠️ 这一行不能少。
# hexo-generator-tag 只生成「某个标签」的子路由（/tags/标签名/），
# 标签的**总览页**要靠 page 页面的 type 让主题接管渲染，
# 同 source/categories/index.md。漏了就会 Cannot GET /tags/。
type: tags
# 标签云配色 —— 主题原生支持这个入口。
# themes/butterfly/scripts/helpers/page.js 里：
#     没配 custom_colors → getRandomColor() 随机给色（会出靛蓝/暗红，和本站不搭）
#     配了 custom_colors → 按顺序循环分配，写成内联 background-color
# 这里给一组浅粉，文字色由 restyle.css 统一成深粉，对比度约 6.3:1。
# ⚠️ 只配这一页。侧栏的标签云卡片走 _config.butterfly.yml 的 aside.card_tags，
#    那边 color: false，渲染是正常的，不要去动它。
custom_colors:
  - '#FDEFF8'
  - '#FBD4EE'
  - '#FFD3F0'
  - '#F79FDD'
---

<!-- 正文留空：标签列表由主题的 tags.pug 渲染。 -->
