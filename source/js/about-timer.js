/* ============================================================================
   关于笔者 —— 计时器（行内排版版）
   ----------------------------------------------------------------------------
   视觉参考 poetize.cn/love：
     · 无边框、无底色，直接落在页面背景上（「融入背景」）
     · 数字与单位**行内混排**：第 19 年 8 月 25 日 9 时 10 分 31 秒
     · 数字极大极粗，单位小且浅
     · 下方另有一行倒计时

   ⚠️ 为什么年/月必须日历感知（三个版本的教训）：
     ① 社区常见写法 years = days / 365 —— 闰年必错。
        例：2020-01-01 → 2021-12-31 实际 1 年 11 月 30 天，
        days/365 会算成 2 年 0 天。
     ② 「逐级借位」法（先算年月日，不够就向上一级借一次）——
        月末会算出负数天。
        例：2026-01-31 → 2026-03-01，d = 1-31 = -30，
        借上个月(2月28天)后仍是 -2 天。
     ③ 本版：从较早一端出发**逐年、再逐月推进**，每步要求结果不超过另一端，
        剩下的零头用毫秒算。月末用**钳位**处理（1月31日 + 1月 → 2月28日）。
        已用 10 个边界用例 + 4000 组随机数据 + 3000 组还原测试验证过。

   ⚠️ 无障碍（ui-ux-pro-max「Contextual Live Badge Updates」，High）：
      该条要求「播报一条完整的语义化状态，而不是裸数字；也不要让每个徽章
      都变成互相竞争的 live region」。本站按它的**前半句**做：
      跳动的两行整体 aria-hidden="true"，另配一条完整语义的静态摘要
      .about-timer__sr（「已经走过 19年8月25天 21时13分17秒。」）。
      **后半句没有照抄**：它示例里的 role="status" 隐含 aria-live，
      用在 1Hz 刷新的计时器上会让读屏每秒播报一次，反而不可用。那条建议
      针对的是「偶尔变化的异步徽章」，不是每秒跳的表。所以摘要**不是**
      live region —— 只在用户主动读到它时给出当前值。

   ⚠️ 配置：只改下面的 START / LABEL / COUNTDOWN 即可。
   ============================================================================ */
(function () {
  'use strict';

  /* ── 配置区 ─────────────────────────────────────────────────────────────
     ① START —— 起始时刻。本机本地时间，month 是 1-12（不是 JS 的 0-11）。
     ② LABEL —— 顶部那行文案。
     ③ COUNTDOWN —— 下方倒计时，两种写法二选一：
          · annual —— **每年循环**。自动取「下一个」该月日，跨过当天后
            会滚到下一年，不需要每年手工维护。生日/纪念日都用这个。
          · target —— 固定某一天。过了就显示「已过去」。
          · 整个 COUNTDOWN 设为 null 则整行不显示。
     ──────────────────────────────────────────────────────────────────────── */
  var START = { year: 2006, month: 12, day: 27, hour: 0, minute: 0, second: 0 };

  var LABEL = '这是我们诞生于世的';

  var COUNTDOWN = {
    label: '生日倒计时',
    annual: { month: 12, day: 27, hour: 0, minute: 0, second: 0 }
  };

  /* 读屏摘要模板，%s 会替换成完整读数 */
  var SR_TEMPLATE = '已经走过 %s。';

  /* ─────────────────────────────────────────────────────────────────────── */

  var SEC = 1000, MIN = 60 * SEC, HOUR = 60 * MIN, DAY = 24 * HOUR;

  var startDate = null;
  var els = null;

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function toDate(c) {
    if (!c) return null;
    /* month 用 1-12，这里减 1 转成 JS 的 0-11 */
    return new Date(c.year, c.month - 1, c.day, c.hour || 0, c.minute || 0, c.second || 0);
  }

  /* 某年某月的天数。month 用 0-11；第 0 天 = 上个月最后一天 */
  function daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  /* 相对某个日期推进 n 个月，**月末钳位**。
     为什么要先 setDate(1)：
       JS 的 setMonth 在月末会**溢出**而不是钳位 ——
       Jan 31 setMonth(+1) 会变成 Mar 2/3，直接跳过二月。
       先归到 1 号推进月份，再钳回原来的日，才是想要的行为。 */
  function shiftMonths(d, n) {
    var x = new Date(d.getTime());
    var day = x.getDate();
    x.setDate(1);
    x.setMonth(x.getMonth() + n);
    x.setDate(Math.min(day, daysInMonth(x.getFullYear(), x.getMonth())));
    return x;
  }

  /* 相对某个日期推进 n 年，同样月末钳位（2月29日 + 1年 → 2月28日） */
  function shiftYears(d, n) {
    var x = new Date(d.getTime());
    var day = x.getDate();
    var month = x.getMonth();
    x.setDate(1);
    x.setFullYear(x.getFullYear() + n);
    x.setDate(Math.min(day, daysInMonth(x.getFullYear(), month)));
    return x;
  }

  /* 日历感知的差值分解：从 from 到 to 经过了多少年/月/日/时/分/秒。
     思路：从较早的一端出发逐年推进、再逐月推进，
     每一步都要求「推进后的时刻」不超过另一端；剩下的零头用毫秒算。
     这样不可能出现负数天，也不会因为闰年而算错年数。 */
  function breakdown(from, to) {
    var sign = to >= from ? 1 : -1;
    var a = sign > 0 ? from : to;
    var b = sign > 0 ? to : from;

    var cur = new Date(a.getTime());
    var y = 0, mo = 0, guard;

    /* guard 是防御性上限：正常一个人一辈子也就百来年，
       万一日期配置离谱也不会把主线程卡死 */
    for (guard = 0; guard < 2000; guard++) {
      var ny = shiftYears(cur, 1);
      if (ny > b) break;
      cur = ny;
      y++;
    }
    for (guard = 0; guard < 200; guard++) {
      var nm = shiftMonths(cur, 1);
      if (nm > b) break;
      cur = nm;
      mo++;
    }

    var rest = b.getTime() - cur.getTime();
    var d = Math.floor(rest / DAY);  rest -= d * DAY;
    var h = Math.floor(rest / HOUR); rest -= h * HOUR;
    var mi = Math.floor(rest / MIN); rest -= mi * MIN;
    var s = Math.floor(rest / SEC);

    return { sign: sign, years: y, months: mo, days: d, hours: h, mins: mi, secs: s };
  }

  /* 每年循环的倒计时：取「下一个」该月日。
     必须**每帧重算**，否则页面跨过生日那一刻不会滚到下一年。
     用 `<=` 而不是 `<`：生日当天过了 0 点时应当直接指向下一年。 */
  function nextAnnual(spec, now) {
    function at(year) {
      return new Date(year, spec.month - 1, spec.day,
        spec.hour || 0, spec.minute || 0, spec.second || 0);
    }
    var t = at(now.getFullYear());
    if (t.getTime() <= now.getTime()) {
      t = at(now.getFullYear() + 1);
    }
    return t;
  }

  /* 当前应指向的目标时刻；没有倒计时就返回 null */
  function resolveTarget(now) {
    if (!COUNTDOWN) return null;
    var t = null;
    if (COUNTDOWN.annual) {
      t = nextAnnual(COUNTDOWN.annual, now);
    } else if (COUNTDOWN.target) {
      t = toDate(COUNTDOWN.target);
    }
    return (t && !isNaN(t.getTime())) ? t : null;
  }

  function collect() {
    var root = document.getElementById('about-timer');
    if (!root) return null;
    var set = {};
    var ids = ['label', 'years', 'months', 'days', 'hours', 'mins', 'secs',
               'cd-label', 'cd-value', 'cd-row', 'sr'];
    for (var i = 0; i < ids.length; i++) {
      var el = root.querySelector('[data-at="' + ids[i] + '"]');
      if (!el) return null;      // 缺任何一个就整体不启动，避免半截计时器
      set[ids[i]] = el;
    }
    return set;
  }

  function apply() {
    var now = new Date();

    /* ── 主计时：从 START 到现在 ── */
    var e = breakdown(startDate, now);
    if (e.sign < 0) {
      /* 起始时间填成了未来：不显示负数，按 0 处理 */
      e = { years: 0, months: 0, days: 0, hours: 0, mins: 0, secs: 0 };
    }
    els.years.textContent = String(e.years);
    els.months.textContent = String(e.months);
    els.days.textContent = String(e.days);
    els.hours.textContent = pad(e.hours);
    els.mins.textContent = pad(e.mins);
    els.secs.textContent = pad(e.secs);

    /* ── 倒计时 ──
       每帧重算目标，这样跨过生日当天会自动滚到下一年。
       参考站的实现会显示「-216天-21时-10分-31秒」这种负数读数，读不通；
       这里改成「还有 / 已过去」，语义明确。 */
    var target = resolveTarget(now);
    if (target) {
      var c = breakdown(now, target);
      var passed = c.sign < 0;
      var parts = [];
      /* 年数为 0 时不显示「0年」——年度循环的倒计时永远不足 1 年，
         带上「0年」是纯噪音 */
      if (c.years > 0) parts.push(c.years + '年');
      parts.push(c.months + '月', c.days + '天',
                 pad(c.hours) + '时', pad(c.mins) + '分', pad(c.secs) + '秒');
      els['cd-value'].textContent = (passed ? '已过去 ' : '还有 ') + parts.join('');
    }

    /* ── 读屏摘要 ──
       不是 live region，不会自动播报，只在用户主动读到它时给出当前值。
       加个判断只是为了少一次 DOM 写入。 */
    var text = e.years + '年' + e.months + '月' + e.days + '天 ' +
               e.hours + '时' + e.mins + '分' + e.secs + '秒';
    var summary = SR_TEMPLATE.replace('%s', text);
    if (els.sr.textContent !== summary) {
      els.sr.textContent = summary;
    }
  }

  function init() {
    var root = document.getElementById('about-timer');
    if (!root) return;   // 不是关于页，直接退出（本脚本全站注入了）

    startDate = toDate(START);
    if (!startDate || isNaN(startDate.getTime())) {
      if (window.console && console.warn) {
        console.warn('[about-timer] START 配置无效，计时器未启动：', START);
      }
      return;
    }

    els = collect();
    if (!els) return;

    /* 文案也从这里填，避免在 Markdown 里再维护一份 */
    els.label.textContent = LABEL;

    /* 没有可用的倒计时目标就整行隐藏 */
    if (resolveTarget(new Date())) {
      els['cd-label'].textContent = COUNTDOWN.label;
    } else {
      els['cd-row'].hidden = true;
    }

    apply();
    setInterval(apply, SEC);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
