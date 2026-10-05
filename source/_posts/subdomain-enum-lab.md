---
title: 子域名搜集实验
date: 2026-09-27 16:00:00
categories:
  - [技术, 安全]
tags: [安全, 渗透测试, 信息收集, 子域名]
---

靶机：Driftingblues-1。这篇只走信息收集与子域名枚举这一段，远程提权留到下一篇。

## 一、配置靶机

我们以 **Driftingblues-1 靶机为例**

## 二、信息收集

### 1. 信息收集

使用 kali 搜索靶机 ip

```
arp-scan -l

得到：192.168.220.137
```

使用 yakit 搜索开放端口

<!-- 截图位 1：Yakit 端口扫描结果 → 补图后换成 ![端口扫描](/img/posts/subdomain-enum/01-ports.webp) -->

先看看 80端口

在前端的页面中，我们搜集到以下信息

```
两个人的邮箱：
sheryl@driftingblues.box
eric@driftingblues.box

一串base64加密字符：
加密：L25vdGVmb3JraW5nZmlzaC50eHQ=
解密：/noteforkingfish.txt
```

## 三、渗透测试

### 1. 寻找线索

访问  /noteforkingfish.txt 文件

<!-- 截图位 2：访问 /noteforkingfish.txt → 补图后换成 ![noteforkingfish](/img/posts/subdomain-enum/02-note.webp) -->

推荐一个在线 ook解密网站：

https://www.splitbrain.org/services/ook

```
解密得到：
my man, i know you are new but you should know how to use host file to reach our secret location. -eric
```

解密提示要修改 host定向，那我们就使用 eric的邮箱域名

```
192.168.220.137 driftingblues.box
```

### 2. 目录扫描

使用 yakit 的目录扫描模块

<!-- 截图位 3：Yakit 目录扫描 → 补图后换成 ![目录扫描](/img/posts/subdomain-enum/03-dirscan.webp) -->

貌似没有什么重要信息

### 3. 子域名收集

<!-- 截图位 4：子域名收集结果 → 补图后换成 ![子域名收集](/img/posts/subdomain-enum/04-subdomain.webp) -->

有了新发现，得到了一个新的域名

```
test.driftingblues.box
```

我们给 host 修改新的域名

```
192.168.220.137 test.driftingblues.box
```

接着再进行目录扫描，发现后台有 robots.txt

<!-- 截图位 5：robots.txt 被发现 → 补图后换成 ![robots.txt](/img/posts/subdomain-enum/05-robots.webp) -->

### 3. 继续

访问 robots.txt 得到

```
User-agent: *
Disallow: /ssh_cred.txt
Allow: /never
Allow: /never/gonna
Allow: /never/gonna/give
Allow: /never/gonna/give/up
```

访问 ssh_cred.txt 得到

```
we can use ssh password in case of emergency. it was "1mw4ckyyucky".

sheryl once told me that she added a number to the end of the password.

-db

//得知密码为 1mw4ckyyucky（） 括号为一个数字
```

### 4. 完成

成功破解账户+密码

```
eric
1mw4ckyyucky6
```

接下来是远程提权，但本文章先不做

## 四、总结

演示了一次渗透测试信息收集的流程，以及该靶机的子域名收集
