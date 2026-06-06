# Vercel 部署教程

这个项目是一个 Vite 前端 + Vercel Serverless API 的韩语学习 App。部署后：

- 网页地址：`https://你的项目名.vercel.app`
- 后端接口：`https://你的项目名.vercel.app/api/...`

## 1. 准备代码

把这个文件夹推送到 GitHub。不要提交这些本地生成内容：

```bash
node_modules
dist
.env
```

建议提交的关键文件包括：

```bash
src/
assets/
api/
server.ts
index.html
package.json
package-lock.json
vite.config.ts
tsconfig.json
vercel.json
.env.example
DEPLOY_VERCEL.md
```

## 2. 在 Vercel 导入项目

1. 打开 Vercel。
2. 点击 `New Project`。
3. 选择这个 GitHub 仓库。
4. Framework Preset 选择 `Vite`。
5. Build Command 填：

```bash
npm run build
```

6. Output Directory 填：

```bash
dist
```

7. Install Command 保持默认，或填：

```bash
npm install
```

## 3. 配置 Gemini API Key

进入 Vercel 项目：

`Settings -> Environment Variables`

添加：

```bash
GEMINI_API_KEY=你的 Gemini API Key
```

环境建议勾选：

```bash
Production
Preview
Development
```

然后重新部署一次。

注意：不要把真实 API Key 写进 `.env.example`、前端代码或 GitHub 仓库。

## 4. 部署后检查

部署完成后，先打开：

```bash
https://你的项目名.vercel.app
```

页面能打开后，再测试 App 里的查词、生成阅读、解析文本等 AI 功能。

如果页面能打开，但 AI 功能报错，优先检查：

1. Vercel 里是否配置了 `GEMINI_API_KEY`。
2. 环境变量配置后是否重新 Deploy。
3. Vercel 的 Function Logs 里是否有 Gemini API 报错。

## 5. 本地验证命令

本地开发：

```bash
npm install
npm run dev
```

本地检查部署结构：

```bash
npm test
npm run lint
npm run build
```

本地预览生产构建：

```bash
npm start
```

然后打开：

```bash
http://localhost:3000
```

## 6. iPhone 添加到主屏幕

部署成功后，在 iPhone Safari 打开 Vercel 地址：

1. 点击底部分享按钮。
2. 选择“添加到主屏幕”。
3. 输入名称。
4. 点击“添加”。

这样就可以像普通 App 图标一样从主屏幕打开。
