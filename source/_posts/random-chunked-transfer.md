---
title: 记一次随机分块传输实验
date: 2026-09-23 21:30:00
categories:
  - [技术, web]
tags: [WAF, Yakit, 分块传输, 安全]
---

在绕过 WAF（Web 应用防火墙）的各种技术里，**随机分块传输编码（Random Chunked Transfer Encoding）**是一个值得关注的方法。

它的核心思路是把请求数据拆成许多**大小随机**的「块」，让那些需要拿到完整数据包才能有效检测的安全设备失去判断依据。

> 本文参考：[工程实践：Yakit 随机分块传输绕过 WAF | Yak Program Language](https://www.yaklang.com/blog/bypass-waf-with-random-chunked-transfer)

---

## 一、怎么用

Yakit 在 **WebFuzzer 图形化界面**和 **Yaklang 代码**里都支持随机分块传输。

在 WebFuzzer 的「请求包配置」里直接打开**随机分块传输**开关即可：

- **功能配置**：打开后可以自定义**分块长度范围**和**发送延迟**。
- **结果查看**：请求发出后，具体的**分块详情**可以在单个数据包的详情页里看到。

![随机分块传输的配置](/img/posts/random-chunked/02-config.webp)

> ⚠️ 注意：启用随机分块传输后，请求头会自动加上 `Transfer-Encoding: chunked`，并**移除** `Content-Length` —— 这也就意味着「自动修复长度」不再生效。

---

## 二、在 Yaklang 代码里使用

也可以在代码里调用 `poc` 的相关函数来配置：

```java
data = `
POST /post HTTP/1.1
Host: pie.dev
Content-Type: multipart/form-data; boundary=------------------------OFHnlKtUimimGcXvRSxgCZlIMAyDkuqsxeppbIFm
Content-Length: 308
--------------------------OFHnlKtUimimGcXvRSxgCZlIMAyDkuqsxeppbIFm
Content-Disposition: form-data; name="aaa"
bbb
--------------------------OFHnlKtUimimGcXvRSxgCZlIMAyDkuqsxeppbIFm
Content-Disposition: form-data; name="ccc"
ddd
--------------------------OFHnlKtUimimGcXvRSxgCZlIMAyDkuqsxeppbIFm--
`
poc.HTTP(data,
    poc.randomChunked(true),
    poc.randomChunkedLength(10, 25),
    poc.randomChunkedDelay(50, 200),
    poc.randomChunkedResultHandler(func(id, data, totalTime, chunkTime) {
        print(sprintf("id:%v\tdata:%s\ttotalTime:%vms\tdelay:%vms\n", id, data, totalTime, chunkTime))
    }))~
```

**几个函数的意思**：

| 函数                                  | 作用                                                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `poc.randomChunkedLength(10, 25)`     | 分块的数据长度在 **10 到 25 字节**之间                                                                                                      |
| `poc.randomChunkedDelay(50, 200)`     | 随机分块传输的延迟在 **50–200ms** 之间                                                                                                      |
| `poc.randomChunkedResultHandler(...)` | 传入处理分块结果的回调，收到 `id`（分块序号）、`data`（当前分块数据）、`totalTime`（从发包开始的总耗时）、`chunkTime`（发送当前分块的耗时） |

---

## 三、拿安全狗 WAF + Vulinbox 靶场试一次

目标是 **SQL 注入漏洞**。

### 1、常规攻击 —— 被拦截

不使用分块传输，直接发一个带 SQL 注入 payload `id=1 or 1=1` 的 POST 请求：

![常规攻击被 WAF 拦截](/img/posts/random-chunked/01-blocked.webp)

请求被 WAF 拦下了，页面提示「**您的请求带有不合法参数，已被网站管理员设置拦截**」。

### 2、随机分块传输 —— 绕过成功

在 Yakit WebFuzzer 里针对**同一个请求**打开「随机分块传输」，把**分块长度设为 1–3 字节**、**延迟设为 10–100 毫秒**，再次发送。

这次请求成功绕过了 WAF，服务器返回了预期的数据：

![绕过成功返回数据库数据](/img/posts/random-chunked/03-bypassed.webp)

可以看到返回体里是 `/user/post/id` 查出来的**用户表数据**（`id`、`username`、`password`、`role`、`created_at`、`updated_at` 等字段）。

### 3、结果验证

在 Yakit 的请求详情里能清楚看到 payload 被拆成了多个小数据块依次发送：

![分块详情](/img/posts/random-chunked/04-chunks.webp)

从表里能看到 `1`、`=`、`o`、`r` …… 这些字符被拆成 1–2 字节一块，每块之间的耗时从 48ms 一路累加到 600ms。

**这正好印证了分块传输的执行过程** —— 完整的 `id=1 or 1=1` 从来没有作为一个整体出现在网络里。

---

## 四、扩展应用

WebFuzzer 本身支持**批量发包**。

实战里可以把随机分块传输和批量发包结合起来，对目标 WAF 做**自动化模糊测试（Fuzzing）**，去探索更多可能的绕过向量。

---

## 五、小结

随机分块传输是一种有效的 WAF 绕过技术。

它的原理在于：**把攻击载荷拆分成多个数据块，从而干扰依赖「完整数据包」做模式匹配的检测引擎。**

从防守方角度看，这也说明：只做**单包完整匹配**的 WAF 在面对分块传输时会失效，需要在**协议层重组**之后再检测。
