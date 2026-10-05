---
title: 子域名搜集实验
date: 2026-09-27 16:00:00
categories:
  - [技术, 安全]
tags: [安全, 渗透测试, 信息收集, 子域名]
---

靶机是 **Driftingblues-1**。这篇只走信息收集与子域名枚举这一段，远程提权留到下一篇。

## 一、配置靶机

我们以 **Driftingblues-1 靶机为例**，Kali 攻击机与它放在同一网段。

## 二、信息收集

### 1. 找靶机 IP

```bash
arp-scan -l
```

得到 `192.168.220.137`。

### 2. 扫开放端口

使用 Yakit 搜索开放端口。

![Yakit 端口扫描结果：80 与 22 端口开放](/img/posts/subdomain-enum/01-ports.webp)

先看 80 端口。在前端页面里搜集到两条线索：

- 两个人的邮箱：`sheryl@driftingblues.box`、`eric@driftingblues.box`
- 一串 base64：密文 `L25vdGVmb3JraW5nZmlzaC50eHQ=`，解密得到 `/noteforkingfish.txt`

## 三、渗透测试

### 1. 寻找线索

访问 `/noteforkingfish.txt`。

![/noteforkingfish.txt 页面内容：满屏 Ook 编码](/img/posts/subdomain-enum/02-note.webp)

页面里是一串 Ook 编码，推荐一个在线解码站：[splitbrain 的 Ook 解码](https://www.splitbrain.org/services/ook)。

解出来是：

> my man, i know you are new but you should know how to use host file to reach our secret location. -eric

提示要修改 hosts 定向，那就用 eric 的邮箱域名：

```text
192.168.220.137 driftingblues.box
```

### 2. 目录扫描

使用 Yakit 的目录扫描模块。

![Yakit 目录扫描结果](/img/posts/subdomain-enum/03-dirscan.webp)

貌似没有什么重要信息。

### 3. 子域名收集

![Yakit 子域名收集任务的界面](/img/posts/subdomain-enum/04-subdomain.webp)

有了新发现，得到了一个新的域名：

```text
test.driftingblues.box
```

我们给 hosts 加上这个新域名：

```text
192.168.220.137 test.driftingblues.box
```

接着再进行目录扫描，发现后台有 `robots.txt`。

![目录扫描发现 robots.txt](/img/posts/subdomain-enum/05-robots.webp)

### 4. 读 robots.txt 找密码

访问 `robots.txt` 得到：

```text
User-agent: *
Disallow: /ssh_cred.txt
Allow: /never
Allow: /never/gonna
Allow: /never/gonna/give
Allow: /never/gonna/give/up
```

顺着 `Disallow` 那条，访问 `ssh_cred.txt` 得到：

```text
we can use ssh password in case of emergency. it was "1mw4ckyyucky".

sheryl once told me that she added a number to the end of the password.

-db
```

也就是说密码是 `1mw4ckyyucky` 后面再补一个数字。

### 5. 得到账号密码

成功破解账户 + 密码：

| 用户名 | 密码 |
| --- | --- |
| `eric` | `1mw4ckyyucky6` |

接下来是远程提权，但本篇文章先不做。

## 四、总结

演示了一次渗透测试信息收集的流程，以及该靶机的子域名收集。
