---
title: QQ流量分析
date: 2026-10-20 16:00:00
categories:
  - [技术, 安全]
tags: [安全, 流量分析, 抓包, Wireshark]
---

## 一、准备

### 使用工具：

Wireshark + QQ（电脑端 + 手机端）（windows + linux）

## 二、测试

### 测试文本：

![测试用的 QQ 消息截图](/img/posts/qq-traffic/01-chat.webp)

电脑端和手机端互发消息 / 电脑端 主系统Windows 和 子系统Linux 互发消息

### 电脑端+手机端：

同样通过wireshark抓取流量

```
tcp.port==48902
```

![抓包过滤 tcp.port==48902](/img/posts/qq-traffic/02-port48902.webp)

```
tcp.port==12727
```

![抓包过滤 tcp.port==12727](/img/posts/qq-traffic/03-port12727.webp)

能看到的部分：

两个QQ号，协议元数据

不能看到的部分：

对话正文是无法直接查看的，使用了特定的算法进行加密。

得出：QQ采用**TCP+UDP混合传输机制**，根据业务场景选择对应协议。

1. 文字消息、图片传输、文件发送：使用 **TCP协议**，远程端口以443为主，依靠TCP的可靠传输特性保证数据完整、不丢包。
2. 语音/视频通话：使用 **UDP协议**，优先保障传输低延迟，允许少量丢包以换取实时性。

### 电脑端（Windows + Linux）：

同样通过wireshark抓取流量

![Windows 与 Linux 双会话抓包](/img/posts/qq-traffic/04-win-linux-1.webp)

![双会话的另一段抓包与数据包详情](/img/posts/qq-traffic/05-win-linux-2.webp)

两个会话都来自同一台主机 \*\*\*\*\*\*（同一台机器上登录了两个 QQ），明文部分依旧只有QQ号，正文部分同样加密，无法还原。

## 三、总结

### 分析：

QQ在聊天记录传输上做的相对安全，无法通过正常的抓包解密（疑似对称加密，但无法解析密钥）
