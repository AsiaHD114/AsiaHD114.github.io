/**
 * 评论默认关闭 —— 只有显式开关的页面才显示评论区
 * ============================================================================
 * 现状：本站只有「留言板」需要评论区，文章页与列表页都不要。
 *
 * ── 为什么不用"逐个文件加 comments: false" ─────────────────────────────
 *   那样每写一篇新文章都得记得加一行，忘一次评论区就冒出来了。
 *   这里把**默认**翻过来：默认全关，要开的页面显式声明。
 *
 * ── 为什么用自定义键 comments_on 而不是直接看 comments ────────────────
 *   这是调试时踩到的坑：Hexo 给内容的 comments 默认值是 **true**，
 *   不是 undefined。所以"没写就设成 false"这种判据永远不成立 ——
 *   实测日志里 hello-world / categories / tags 的 comments 都是 true。
 *   而 comments 已经是 true 时，无法区分"用户显式写的"还是"框架默认给的"。
 *   所以改用 comments_on 这个**没有默认值**的自定义键来判断。
 *
 * ── 用法 ──────────────────────────────────────────────────────────────
 *   要让某个页面/文章显示评论，在它的 front-matter 里写：
 *       comments_on: true
 *   其它什么都不用写，默认就是关的。以后新文章天然是关的，不会漏。
 *
 * ── 判据链（改这个文件前先理解）────────────────────────────────────
 *   主题 layout/post.pug 与 layout/page.pug 的判断都是：
 *       if page.comments !== false && theme.comments.use
 *   本脚本负责把 page.comments 设成正确的值，
 *   所以最终是否出评论 = 本脚本的开关 && 全局 comments.use 非空。
 *
 * ⚠️ 这个文件在**站点根目录**的 scripts/ 下，不在主题里，
 *    所以升级 Butterfly（覆盖 themes/butterfly/）不会把它弄丢。
 * ============================================================================
 */

hexo.extend.filter.register('before_post_render', function (data) {
  // 只有显式写了 comments_on: true 的内容才开评论
  data.comments = (data.comments_on === true);
  return data;
});
