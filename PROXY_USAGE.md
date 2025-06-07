# 代理功能使用说明

## 概述

图片下载工具现已支持代理配置，可以通过代理服务器下载图片。这对于需要通过代理访问网络或绕过网络限制的场景非常有用。

## 配置方式

### 1. 环境变量配置（全局默认）

可以通过设置环境变量来配置默认代理：

```bash
# HTTP 代理
export HTTP_PROXY=http://proxy.example.com:8080

# HTTPS 代理
export HTTPS_PROXY=http://proxy.example.com:8080

# 带认证的代理
export HTTP_PROXY=http://username:password@proxy.example.com:8080
```

### 2. 参数配置（单次使用）

在调用下载工具时，可以通过 `proxy` 参数指定代理：

#### 单张图片下载

```javascript
{
  "url": "https://example.com/image.jpg",
  "proxy": "http://proxy.example.com:8080",
  "savePath": "/path/to/downloads",
  "format": "jpeg"
}
```

#### 批量图片下载

```javascript
{
  "urls": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.png"
  ],
  "proxy": "http://proxy.example.com:8080",
  "savePath": "/path/to/downloads",
  "format": "jpeg",
  "concurrency": 2
}
```

## 代理格式

支持以下代理URL格式：

- `http://proxy.example.com:8080` - 基本HTTP代理
- `https://proxy.example.com:8080` - HTTPS代理
- `http://username:password@proxy.example.com:8080` - 带认证的代理
- `socks5://proxy.example.com:1080` - SOCKS5代理

## 优先级

代理配置的优先级如下：

1. 函数调用时的 `proxy` 参数（最高优先级）
2. 环境变量 `HTTP_PROXY` 或 `HTTPS_PROXY`
3. 无代理（直接连接）

## 测试示例

### 测试代理连接

```javascript
// 使用代理下载测试图片
{
  "url": "https://httpbin.org/image/jpeg?format=jpeg",
  "proxy": "http://127.0.0.1:8080",
  "savePath": "./downloads"
}
```

### 批量下载测试

```javascript
{
  "urls": [
    "https://httpbin.org/image/jpeg?format=jpeg",
    "https://httpbin.org/image/png?format=png"
  ],
  "proxy": "http://127.0.0.1:8080",
  "savePath": "./downloads",
  "concurrency": 2
}
```

## 注意事项

1. **代理服务器可用性**：确保代理服务器正常运行且可访问
2. **认证信息安全**：避免在代码中硬编码代理认证信息，建议使用环境变量
3. **网络超时**：代理连接可能增加网络延迟，建议适当调整超时设置
4. **协议支持**：确保代理服务器支持目标网站的协议（HTTP/HTTPS）

## 故障排除

### 常见问题

1. **连接超时**：检查代理服务器地址和端口是否正确
2. **认证失败**：验证用户名和密码是否正确
3. **协议不匹配**：确保代理协议与目标URL协议兼容

### 调试方法

可以通过查看下载进度和错误信息来诊断代理连接问题：

```bash
# 查看详细的网络请求日志
DEBUG=axios* node your-script.js
```

## 更新日志

- **v1.1.0**: 新增代理支持功能
  - 支持环境变量配置默认代理
  - 支持函数参数指定代理
  - 支持HTTP、HTTPS、SOCKS5代理
  - 支持代理认证