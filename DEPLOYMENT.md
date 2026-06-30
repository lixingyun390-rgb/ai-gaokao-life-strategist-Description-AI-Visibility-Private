# AI高考人生军师上线说明

这个项目不能用 `127.0.0.1` 发给抖音粉丝。`127.0.0.1` 只代表当前电脑，别人点不开。

真实使用路径应该是：

抖音关注或私信 -> 发送公网链接或二维码 -> 用户进入移动端网页 -> 不登录直接测试 -> 生成报告后再引导保存、分享、关注博主。

## 推荐上线方案

### 方案 A：最快上线

适合先验证产品：

- Vercel
- Cloudflare Pages
- Netlify

优点：部署快，自动 HTTPS，自动生成公网链接。

注意：国内访问速度和稳定性不一定最好。

### 方案 B：长期面向抖音用户

适合正式运营：

- 腾讯云轻量服务器或阿里云 ECS
- 绑定自己的域名
- 做 ICP 备案
- 用 Nginx 反向代理 Next.js
- 用 PM2 保持服务常驻

优点：国内访问更稳，链接更像正式产品。

## 必填环境变量

部署平台后台需要配置：

```env
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=你的 DeepSeek Key
DEEPSEEK_MODEL=deepseek-v4-pro
DEEPSEEK_BASE_URL=https://api.deepseek.com
NEXT_PUBLIC_APP_URL=https://你的正式域名
```

不要把真实 API Key 写进前端页面，也不要发给用户。它只能存在服务器环境变量里。

## 生产构建命令

```bash
npm install
npm run build
npm run start
```

本地生产预览示例：

```bash
npm run start -- --hostname 127.0.0.1 --port 3000
```

## 健康检查

部署后打开：

```text
https://你的域名/api/health
```

看到类似下面内容，就说明服务活着：

```json
{
  "ok": true,
  "app": "AI高考人生军师",
  "provider": "deepseek"
}
```

## 抖音入口建议

上线后准备三个入口：

- 一个短链接：放在私信、评论引导、主页简介。
- 一个二维码：放在视频画面、直播间、置顶评论图片。
- 一个固定域名：例如 `https://gaokao.yourdomain.com`。

首屏保持“不注册、不留手机号、立即测试”，报告生成后再提示“保存报告 / 生成海报 / 关注博主获取完整解读”。
