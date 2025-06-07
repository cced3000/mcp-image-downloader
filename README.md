# Image Downloader MCP Server

一个支持图片下载和处理的 MCP (Model Context Protocol) 服务器，具有进度跟踪、批量下载和图片处理功能。

## 功能特性

- 🖼️ 单张图片下载
- 📦 批量图片下载
- 🔄 实时进度跟踪
- 🎨 图片格式转换 (JPEG, PNG, WebP)
- 📏 图片尺寸调整
- 🗜️ 图片压缩
- 🌐 代理服务器支持
- ⚙️ 环境变量配置支持

## 安装

### 方式一：通过 npx 安装（推荐）

直接使用 npx 运行，无需本地安装：

```bash
npx mcp-image-downloader
```

### 方式二：全局安装

```bash
npm install -g mcp-image-downloader
```

### 方式三：本地开发安装

```bash
git clone https://github.com/cced3000/mcp-image-downloader.git
cd mcp-image-downloader
npm install
```

### npx 的优势

使用 npx 方式有以下优势：
- ✅ 无需本地安装，始终使用最新版本
- ✅ 自动处理依赖关系
- ✅ 减少本地存储空间占用
- ✅ 避免版本冲突问题
- ✅ 配置更简单，无需指定路径

## 配置

### 环境变量配置

复制 `.env.example` 到 `.env` 并根据需要修改配置：

```bash
cp .env.example .env
```

可配置的环境变量：

| 环境变量 | 描述 | 默认值 | 示例 |
|---------|------|--------|------|
| `DEFAULT_SAVE_PATH` | 默认下载目录 | `./downloads` | `/Users/username/Pictures` |
| `DEFAULT_FILENAME` | 默认文件名模式 | 原始文件名 | `image_{timestamp}` |
| `DEFAULT_FORMAT` | 默认图片格式 | `original` | `jpeg`, `png`, `webp` |
| `DEFAULT_COMPRESS` | 默认压缩设置 | `false` | `true`, `false` |
| `DEFAULT_MAX_WIDTH` | 默认最大宽度 | 无限制 | `1920` |
| `DEFAULT_MAX_HEIGHT` | 默认最大高度 | 无限制 | `1080` |
| `DEFAULT_CONCURRENCY` | 默认并发数 | `3` | `1-10` |
| `HTTP_PROXY` | HTTP 代理服务器 | 无 | `http://proxy.example.com:8080` |
| `HTTPS_PROXY` | HTTPS 代理服务器 | 无 | `http://proxy.example.com:8080` |

### MCP 客户端配置

#### Cursor IDE 配置

**使用 npx（推荐）：**

在 `.cursor/mcp.json` 中添加：

```json
{
  "mcpServers": {
    "image-downloader": {
      "command": "npx",
      "args": ["mcp-image-downloader"],
      "env": {
        "DEFAULT_SAVE_PATH": "/Users/username/Downloads/images",
        "DEFAULT_FORMAT": "jpeg",
        "DEFAULT_COMPRESS": "true",
        "HTTPS_PROXY": "http://proxy.example.com:8080",
        "DEFAULT_MAX_WIDTH": "1920",
        "DEFAULT_MAX_HEIGHT": "1080",
        "DEFAULT_CONCURRENCY": "5",
        "HTTP_PROXY": "http://proxy.example.com:8080"
      }
    }
  }
}
```

**使用本地安装：**

```json
{
  "mcpServers": {
    "image-downloader": {
      "command": "node",
      "args": ["src/index.js"],
      "cwd": "/path/to/testmcp",
      "env": {
        "DEFAULT_SAVE_PATH": "/Users/username/Downloads/images",
        "DEFAULT_FORMAT": "jpeg",
        "DEFAULT_COMPRESS": "true",
        "HTTPS_PROXY": "http://proxy.example.com:8080",
        "DEFAULT_MAX_WIDTH": "1920",
        "DEFAULT_MAX_HEIGHT": "1080",
        "DEFAULT_CONCURRENCY": "5",
        "HTTP_PROXY": "http://proxy.example.com:8080"
      }
    }
  }
}
```

#### Claude Desktop 配置

**使用 npx（推荐）：**

在 `claude_desktop_config.json` 中添加：

```json
{
  "mcpServers": {
    "image-downloader": {
      "command": "npx",
      "args": ["mcp-image-downloader"],
      "env": {
        "DEFAULT_SAVE_PATH": "/Users/username/Downloads/images",
        "DEFAULT_FORMAT": "jpeg",
        "DEFAULT_COMPRESS": "true",
        "HTTPS_PROXY": "http://proxy.example.com:8080"
      }
    }
  }
}
```

**使用本地安装：**

```json
{
  "mcpServers": {
    "image-downloader": {
      "command": "node",
      "args": ["src/index.js"],
      "cwd": "/path/to/testmcp",
      "env": {
        "DEFAULT_SAVE_PATH": "/Users/username/Downloads/images",
        "DEFAULT_FORMAT": "jpeg",
        "DEFAULT_COMPRESS": "true",
        "HTTPS_PROXY": "http://proxy.example.com:8080"
      }
    }
  }
}
```

## 使用方法

### 通过 MCP 客户端使用

配置好 MCP 客户端后，可以直接在支持 MCP 的应用中使用图片下载功能。

### 本地开发和测试

#### 启动服务器

```bash
npm start
```

### 开发模式

```bash
npm run dev
```

### 测试

```bash
# 运行所有测试
npm test

# 测试进度跟踪
npm run test:progress
```

## MCP 工具

### download_image

下载单张图片。

**参数：**
- `url` (必需): 图片 URL
- `savePath` (可选): 保存目录，默认使用环境变量配置
- `filename` (可选): 自定义文件名
- `format` (可选): 输出格式 (jpeg, png, webp, original)
- `compress` (可选): 是否压缩
- `maxWidth` (可选): 最大宽度
- `maxHeight` (可选): 最大高度
- `proxy` (可选): 代理服务器 URL

**示例：**
```json
{
  "url": "https://example.com/image.jpg",
  "format": "webp",
  "compress": true,
  "maxWidth": 800,
  "proxy": "http://proxy.example.com:8080"
}
```

### download_images_batch

批量下载图片。

**参数：**
- `urls` (必需): 图片 URL 数组
- `savePath` (可选): 保存目录
- `format` (可选): 输出格式
- `compress` (可选): 是否压缩
- `maxWidth` (可选): 最大宽度
- `maxHeight` (可选): 最大高度
- `proxy` (可选): 代理服务器 URL
- `concurrency` (可选): 并发下载数 (1-10)
- `proxy` (可选): 代理服务器 URL

**示例：**
```json
{
  "urls": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.png"
  ],
  "format": "jpeg",
  "concurrency": 3,
  "proxy": "http://proxy.example.com:8080"
}
```

## 代理支持

服务器支持通过代理服务器下载图片，适用于需要通过代理访问网络的环境。

### 代理配置方式

1. **环境变量配置（全局默认）**：
   ```bash
   export HTTP_PROXY=http://proxy.example.com:8080
   export HTTPS_PROXY=http://proxy.example.com:8080
   
   # 带认证的代理
   export HTTP_PROXY=http://username:password@proxy.example.com:8080
   ```

2. **参数配置（单次使用）**：
   在调用工具时通过 `proxy` 参数指定

### 支持的代理格式

- `http://proxy.example.com:8080` - 基本 HTTP 代理
- `https://proxy.example.com:8080` - HTTPS 代理
- `http://username:password@proxy.example.com:8080` - 带认证的代理
- `socks5://proxy.example.com:1080` - SOCKS5 代理

### 代理优先级

1. 函数调用时的 `proxy` 参数（最高优先级）
2. 环境变量 `HTTP_PROXY` 或 `HTTPS_PROXY`
3. 无代理（直接连接）

详细的代理使用说明请参考 [PROXY_USAGE.md](./PROXY_USAGE.md)。

## 进度跟踪

服务器提供详细的进度信息：

- 下载进度百分比
- 已下载/总字节数
- 下载速度
- 预计剩余时间
- 批量下载的整体进度

## 故障排除

### 常见问题

1. **模块未找到错误**
   - 确保运行了 `npm install`
   - 检查 MCP 配置中的路径是否正确

2. **权限错误**
   - 确保对下载目录有写入权限
   - 在 macOS 上可能需要授予应用程序文件访问权限

3. **网络错误**
   - 检查网络连接
   - 验证图片 URL 是否可访问
   - 某些网站可能需要特定的 User-Agent
   - 如果使用代理，确保代理服务器正常运行

4. **代理连接问题**
   - 验证代理服务器地址和端口
   - 检查代理认证信息是否正确
   - 确保代理服务器支持目标协议

### 调试

启用详细日志：

```bash
DEBUG=* npm start
```

## 许可证

MIT