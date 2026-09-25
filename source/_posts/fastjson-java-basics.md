---
title: fastjson-java-初学习
date: 2026-6-12 16:00:00
tags: [web, 技术]
# 分类：两条**并列**的二级路径，不是三级。
#
# ⚠️ 这里原来是 - [技术, Java, 安全]（三级），副作用是分类树长这样：
#      技术 (4)
#      ├─ Java (1)
#      │   └─ 安全 (1)     ← 这个「安全」和下面那个不是同一个节点
#      └─ 安全 (3)
#    同一棵树里「安全」出现两次、深度还不同，看起来像重复或缩进错乱。
#    原因是 Hexo 里 技术/安全 与 技术/Java/安全 是**两个不同的分类**，
#    只是叶子同名 —— 计数也被拆成 3 和 1。
#
# 改成两条并列路径后，「安全」只出现一处，Java 也不再被塞进安全底下：
#   技术 (4)
#   ├─ 安全 (4)   ← 本篇 + ghost-bits + random-chunked + dengbao
#   └─ Java (1)   ← 本篇
# 一篇同时属于多条分类路径是 Hexo 原生支持的写法，不是 hack。
#
# ⚠️ 代价：本篇会同时出现在「技术/安全」和「技术/Java」两个分类页里。
#    这是分类系统的正常语义（它确实两者都是）。
# ⚠️ 另一处代价：原来的分类页 /categories/技术/Java/安全/ 不再生成，
#    那个网址会 404。已确认它没有实际引用价值（只有 1 篇文章的三级页），
#    所以没有像文章网址那样补跳转页。要补的话说一声。
categories:
  - [技术, 安全]
  - [技术, Java]
---

Fastjson本质上就是将**jave对象转换成json格式**，也可以将**json对象转换成java格式**

所以产生反序列化漏洞

恶意参数：

```java
{"@type":"java.net.Inet4Address","val":"dnslog"}
```

## GET 传参

fastjson 的一个安全问题是不受信任的用户可以构造恶意 JSON 数据，导致远程代码执行漏洞。本漏洞案例演示了一个 fastjson GET 请求传参的示例，其中存在潜在的 fastjson 远程代码执行漏洞。

```java
{
    Title:        "GET 传参案例案例",
    Path:         "/json-in-query",
    DefaultQuery: `auth={"user":"admin","password":"password"}`,
    Handler: func(writer http.ResponseWriter, request *http.Request) {
        if request.Method == http.MethodGet {
            action := request.URL.Query().Get("action")
            if action == "" {
                // 返回登录页面或脚本
                // 省略部分代码
                return
            }
            auth := request.URL.Query().Get("auth")
            if auth == "" {
                writer.Write([]byte("auth 参数不能为空"))
                return
            }
            response := mockController(generateFastjsonParser("1.2.43"), request, auth)
            writer.Write([]byte(response))
        } else {
            writer.WriteHeader(http.StatusMethodNotAllowed)
        }
    },
}
```

```php
http://127.0.0.1:8787/fastjson/json-in-query?auth={"@type":"java.net.Inet4Address","val":"dnslog"}&action=login
```

在以上 URL 中，攻击者传递了一个 auth 参数，其中包含了恶意构造的 JSON 数据。这个恶意 JSON 数据可能触发 fastjson 解析器漏洞。

DNSlog查看是否触发漏洞

## POST Form传参

Fastjson 在处理 JSON 数据时存在一些潜在的安全风险，尤其是在接收用户输入并将其反序列化为 Java 对象时。这个漏洞案例演示了如何通过在 POST 表单参数中注入恶意 JSON 数据来触发 Fastjson 反序列化漏洞。

```java
{
    Title: "POST Form传参漏洞案例",
    Path:  "/json-in-form",
    Handler: func(writer http.ResponseWriter, request *http.Request) {
        if request.Method == http.MethodPost {
            body := request.FormValue("auth")
            response := mockController(generateFastjsonParser("1.2.43"), request, body)
            writer.Write([]byte(response))
        } else {
            writer.Write([]byte(utils2.Format(string(fastjson_loginPage), map[string]string{
                "script":
                // 省略部分代码,
            })))
            return
        }
    },
}
```

```java
{"@type":"java.net.Inet4Address","val":"dnslog"}
```

服务器使用 Fastjson 反序列化恶意 JSON 数据。

恶意 JSON 数据中的内容被反序列化成 Java 对象，并且攻击者可能获得对服务器的控制或者执行恶意操作。

## POST Body 传参

该案例演示了一种潜在的安全漏洞，当后端处理 POST 请求的请求体（Request Body）时，没有对其中的数据进行足够的验证和处理，可能导致安全问题。特别是在使用 Fastjson 或其他 JSON 解析器的情况下，攻击者可以构造恶意 JSON 请求体来触发 Java 反序列化漏洞。

```java
{
    Title: "POST Body传参案例案例",
    Path:  "/json-in-body",
    Handler: func(writer http.ResponseWriter, request *http.Request) {
        if request.Method == http.MethodPost {
            body, err := io.ReadAll(request.Body)
            if err != nil {
                writer.WriteHeader(http.StatusBadRequest)
                writer.Write([]byte("Invalid request"))
                return
            }
            defer request.Body.Close()
            response := mockController(generateFastjsonParser("1.2.43"), request, string(body))
            writer.Write([]byte(response))
        } else {
            writer.Write([]byte(utils2.Format(string(fastjson_loginPage), map[string]string{
                "script": `function load(){
                    name=$("#username").val();
                    password=$("#password").val();
                    auth = {"user":name,"password":password};
                    $.ajax({
                        type:"post",
                        url:"/fastjson/json-in-body",
                        data:JSON.stringify(auth),
                        dataType: "json",
                        success: function (data ,textStatus, jqXHR)
                        {
                            $("#response").text(JSON.stringify(data));
                            console.log(data);
                        },
                        error:function (XMLHttpRequest, textStatus, errorThrown) {
                            alert("请求出错");
                        },
                    })
                }`,
            })))
            return
        }
    },
}
```

攻击者可以构造 POST 请求，将恶意 JSON 数据作为请求体发送给目标服务器。例如，post payload `{"@type":"``java.net``.Inet4Address","val":"dnslog"}` 将触发 Fastjson 反序列化漏洞。

## Cookie 传参

该案例演示了一种潜在的安全漏洞，当后端没有对其中的数据进行足够的验证和处理，可能导致安全问题。攻击者可以在 Cookie 中插入恶意 JSON 数据，以触发 Fastjson 反序列化漏洞。

```java
**{
    Title: "Cookie传参案例",
    Path:  "/json-in-cookie",
    Handler: func(writer http.ResponseWriter, request *http.Request) {
        if request.Method == http.MethodGet {
            action := request.URL.Query().Get("action")
            if action == "" {
                writer.Header().Set("Set-Cookie", `auth=`+codec.EncodeBase64Url(`{"id":"-1"}`)) // Fuzz Coookie暂时没有做只能解码，不能编码
                writer.Write([]byte(utils2.Format(string(fastjson_loginPage), map[string]string{
                    "script": `function load(){
                        name=$("#username").val();
                        password=$("#password").val();
                        auth = {"user":name,"password":password};
                        $.ajax({
                            type:"get",
                            url:"/fastjson/json-in-cookie",
                            data:{"auth":JSON.stringify(auth),"action":"login"},
                            success: function (data ,textStatus, jqXHR)
                            {
                                $("#response").text(JSON.stringify(data));
                                console.log(data);
                            },
                            error:function (XMLHttpRequest, textStatus, errorThrown) {
                                alert("请求出错");
                            },
                        })
                    }`,
                })))
                return
            }
            cookie, err := request.Cookie("auth")
            if err != nil {
                writer.Write([]byte("auth 参数不能为空"))
                return
            }
            response := mockController(generateFastjsonParser("1.2.43"), request, cookie.Value)
            writer.Write([]byte(response))
        } else {
            writer.WriteHeader(http.StatusMethodNotAllowed)
        }
    },
}**
```

攻击者可以更改 Cookie 的内容为 `{"@type":"``java.net``.Inet4Address","val":"dnslog"}` 或其他恶意 JSON 数据。当服务端尝试解析这个 Cookie 数据时，Fastjson 可能会反序列化它，触发反序列化漏洞，导致潜在的远程代码执行。

## **Authorization 传参**

该案例演示了一种潜在的安全漏洞，当后端处理包含 Fastjson 序列化的 Authorization 头部数据时，没有对其中的数据进行足够的验证和处理，可能导致安全问题。攻击者可以在 Authorization 头部插入恶意 JSON 数据，以触发 Fastjson 反序列化漏洞，进而导致潜在的远程代码执行。

```java
{
    Title: "Authorization传参案例",
    Path:  "/json-in-authorization",
    Handler: func(writer http.ResponseWriter, request *http.Request) {
        if request.Method == http.MethodGet {
            action := request.URL.Query().Get("action")
            if action == "" {
                writer.Write([]byte(utils2.Format(string(fastjson_loginPage), map[string]string{
                    "script": `function load(){
                        name=$("#username").val();
                        password=$("#password").val();
                        auth = {"user":name,"password":password};
                        authHeaderValue = btoa(JSON.stringify(auth));
                        $.ajax({
                            type:"get",
                            url:"/fastjson/json-in-authorization?action=login",
                            headers: {"Authorization": "Basic "+authHeaderValue},
                            dataType: "json",
                            success: function (data ,textStatus, jqXHR)
                            {
                                $("#response").text(JSON.stringify(data));
                                console.log(data);
                            },
                            error:function (XMLHttpRequest, textStatus, errorThrown) {
                                alert("请求出错");
                            },
                        })
                    }`,
                })))
                return
            }
            auth := request.Header.Get("Authorization")
            if len(auth) < 6 {
                writer.Write([]byte("auth 参数不能为空"))
                return
            }
            response := mockController(generateFastjsonParser("1.2.43"), request, auth[6:])
            writer.Write([]byte(response))
        } else {
            writer.WriteHeader(http.StatusMethodNotAllowed)
        }
    },
}
```

攻击者可以更改 Authorization 头部的内容为 

`Basic {"@type":"``java.net``.Inet4Address","val":"dnslog"}` 或其他恶意 JSON 数据。当服务端尝试解析这个 Authorization 数据时，Fastjson 可能会反序列化它，触发反序列化漏洞，导致潜在的远程代码执行。

## **GET 传参 Jackson 后端**

该案例演示了一种潜在的安全漏洞，当使用`json`将数据作为 GET 请求的查询参数传递到后端，并且后端使用 Jackson 库处理该数据时，可能会导致安全问题。攻击者可以构造恶意 JSON 数据并将其作为查询参数发送，以触发 Jackson 反序列化漏洞，进而导致潜在的远程代码执行。

```java
{
    Title:        "GET传参Jackson后端案例",
    Path:         "/jackson-in-query",
    DefaultQuery: `auth={"user":"admin","password":"password"}`,
    Handler: func(writer http.ResponseWriter, request *http.Request) {
        if request.Method == http.MethodGet {
            action := request.URL.Query().Get("action")
            if action == "" {
                writer.Write([]byte(utils2.Format(string(fastjson_loginPage), map[string]string{
                    "script": `function load(){
                        name=$("#username").val();
                        password=$("#password").val();
                        auth = {"user":name,"password":password};
                        $.ajax({
                            type:"get",
                            url:"/fastjson/json-in-query",
                            data:{"auth":JSON.stringify(auth),"action":"login"},
                            success: function (data ,textStatus, jqXHR)
                            {
                                $("#response").text(JSON.stringify(data));
                                console.log(data);
                            },
                            error:function (XMLHttpRequest, textStatus, errorThrown) {
                                alert("请求出错");
                            },
                        })
                    }`,
                })))
                return
            }
            auth := request.URL.Query().Get("auth")
            if auth == "" {
                writer.Write([]byte("auth 参数不能为空"))
                return
            }
            response := mockJacksonController(request, auth)
            writer.Write([]byte(response))
        } else {
            writer.WriteHeader(http.StatusMethodNotAllowed)
        }
    },
}
```

攻击者可以构造 GET 请求，将参数 `auth` 设置为 `{"@type":"``java.net``.Inet4Address","val":"dnslog"}` 或其他恶意 JSON 数据。当后端使用 Jackson 库处理此数据时，可能会触发反序列化漏洞，导致潜在的远程代码执行。
