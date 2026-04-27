# Doc2Brief

Doc2Brief 是一个 `file / text -> weekly report HTML / poster` 生成平台，面向“周报、简报、管理汇报、宣传海报”场景，强调稳定结构化、模板化渲染与可交付输出。

## 1. 核心定位

- 输入：上传文件或直接粘贴正文
- 处理：抽取文本 -> 结构化整理 -> 模板映射 / 海报 brief 编排
- 输出：可预览、可切换模板、可导出 HTML 的周报页面，或可下载的宣传海报

当前版本优先保障主链路可跑通：
`上传 -> 抽取 -> 结构化 -> 模板预览 -> HTML 导出`

并新增海报链路：
`上传 -> 抽取 -> 海报 brief -> 图片模型 -> 海报下载`

## 2. 功能总览

### 2.1 输入能力

- 文件上传：`PDF / DOCX / DOC / TXT / MD / CSV`
- 文本输入：直接粘贴正文
- 字数控制：支持 `MAX_SOURCE_CHARS` 截断保护（默认 `18000`）

### 2.2 生成模式

- `周报模式`
  - 支持 `structured-template` / `llm-html`
  - 输出模板化周报页面与 HTML 导出
- `海报模式`
  - 支持研究院对内 / 对外宣传海报生成
  - 先提炼 brief，再调用 OpenRouter 图片模型输出单张海报

### 2.3 周报生成模式

- `structured-template`（推荐）
  - 先结构化抽取，再映射模板渲染
  - 输出稳定，适合正式场景
- `llm-html`
  - 模型直接生成完整 HTML
  - 表达更自由，同时带质量闸门与自动回退

### 2.4 海报模式

- 海报场景：
  - 对外成果宣传
  - 院内宣传快报
  - 活动通知海报
  - 制度通知宣导
  - 招聘招募海报
  - 学术会议海报
- 内置风格：
  - 学院旗舰版
  - 制度极简版
  - 科研快讯版
  - 创新发布版
  - 活动典礼版
  - 招募动员版
- 输出控制：
  - 比例：`4:5 / 3:4 / 1:1 / 16:9 / 9:16`
  - 尺寸：`1K / 2K / 4K`
  - 敏感表达模式：适合正式通知、成果宣传和内宣场景

海报生成采用两段式链路：

- `rawText -> poster brief JSON`
- `brief + style pack -> image prompt -> OpenRouter 图片模型`

海报模式具备回退机制：

- 未配置 `OPENROUTER_API_KEY`：回退到本地 SVG 草图
- 模型调用失败：保留 brief，并回退到本地草图，便于继续联调与验收

### 2.5 模板系统（内置）

当前内置 9 套模板（`template/01` ~ `template/09`）：

- 新野兽派战情版
- 瑞士网格版
- 电子报刊版
- 杂志封面版
- 国风卷轴版
- 控制台仪表盘版
- 新闻简报版
- 学术期刊版
- 分屏杂志版

每套模板均由以下资源组成：

- `index.html`
- `style.css`
- `app.js`

运行时通过占位符注入：

- `__TEMPLATE_STYLE__`
- `__TEMPLATE_SCRIPT__`
- `__TEMPLATE_DATA__`

### 2.6 上下文编排

- 风格：正式稳重 / 数据导向 / 叙事表达
- 部门：支持多部门语义配置（如科研、行政、战略等）
- 受众：院长/主任、分管领导、执行负责人、风控负责人
- 敏感表达模式：自动降低措辞强度，适配正式汇报

### 2.7 输出与交付

- 页面预览：桌面 / 手机双视图
- 报告动作：全屏、复制链接、导出 HTML
- 最近报告：本地缓存最近生成记录
- 海报动作：海报预览、下载图片、最近生成记录

## 3. 端到端处理链路

```text
文件/文本输入
  -> 文件抽取（PDF/DOCX/TXT/MD/CSV）
  -> 原文清洗与截断
  -> AI 编排（结构化 / HTML 直出 / 海报 brief）
  -> 模板注入与渲染 或 图片模型生成
  -> 周报预览与导出 / 海报预览与下载
```

关键回退机制：

- 未配置 API Key：自动回退到本地结构化
- 结构化异常：自动重试 + JSON 修复
- HTML 直出质量不达标：自动修复，不通过则回退“结构化+模板”方案
- 海报图片生成失败：自动回退到本地 SVG 草图

## 4. 可观测性设计

系统内置两类可观测输出，便于联调和验收：

- 业务层 JSON（`业务JSON`）
  - 记录模块输入、关键中间结果、输出摘要
- 系统级日志（`系统日志` / `系统日志-错误`）
  - 记录模块启动、关键调用、耗时、异常、重试、降级、最终状态

主要覆盖模块：

- 文件抽取
- 模型编排（结构化、润色、HTML 直出、修复、降级）
- 海报编排（brief、图片生成、草图回退）
- 转换编排（生成流程主控）

## 5. 技术栈

- 前端框架：React 19
- 构建工具：Vite 8
- 文档抽取：
  - `mammoth`（DOCX）
  - `pdfjs-dist`（PDF）
- LLM 网关：OpenRouter（默认经服务端代理转发，可选前端直连）

## 6. 快速开始

### 6.1 环境要求

- Node.js 18+
- npm 9+

### 6.2 安装依赖

```bash
npm install
```

### 6.3 配置环境变量

```bash
cp .env.example .env
```

按需填写 `OPENROUTER_API_KEY` 等字段。

### 6.4 启动开发环境

```bash
npm run dev
```

默认地址：

- `http://127.0.0.1:5173`

如果你需要在 `vite` 开发环境里验证海报模式的真实 OpenRouter 代理，有两种方式：

1. 单独启动生产服务端代理，并在 `.env` 中设置：

```bash
VITE_REPORT_API_BASE_URL=http://127.0.0.1:5173
```

2. 直接构建后启动一体化服务：

```bash
npm run build
npm run start:prod
```

### 6.5 构建产物

```bash
npm run build
```

输出目录：

- `dist/`

### 6.6 API 用量监控页面

服务启动后可访问：

- `/dashboard`
- `/ops/usage`（兼容别名）

页面支持实时订阅（SSE）+ 轮询兜底，会按周期展示请求总数、token 总量、费用总额、成功率、时延、模型费用分布，以及最近请求明细。

可用接口：

- `GET /api/dashboard/live`：实时快照（汇总 + 最近记录）
- `GET /api/dashboard/stream`：SSE 实时推送
- `GET /api/dashboard/summary`：汇总接口（兼容）
- `GET /api/dashboard/records`：明细接口（兼容）

## 7. 环境变量说明

### 7.1 OpenRouter（推荐命名）

- `OPENROUTER_API_KEY`：API Key
- `OPENROUTER_BASE_URL`：网关地址，默认 `https://openrouter.ai/api/v1`
- `OPENROUTER_HTML_MODEL`：HTML 直出模型
- `OPENROUTER_STRUCTURED_MODEL`：结构化抽取模型
- `OPENROUTER_POLISH_MODEL`：结构化润色模型（可选，留空则关闭额外润色调用）
- `OPENROUTER_POSTER_BRIEF_MODEL`：海报 brief 提炼模型
- `OPENROUTER_POSTER_IMAGE_MODEL`：海报图片模型，默认 `google/gemini-3.1-flash-image-preview`
- `OPENROUTER_HTML_MAX_TOKENS`：HTML 模式最大 token（可选）
- `OPENROUTER_PROMPT_PROFILE`：Prompt 策略（`auto / v1 / v2`，默认 `auto`）

### 7.2 兼容历史命名（可选）

- `MINIMAX_API_KEY`
- `MINIMAX_BASE_URL`
- `MINIMAX_HTML_MODEL`
- `MINIMAX_STRUCTURED_MODEL`
- `MINIMAX_POLISH_MODEL`
- `OPENROUTER_MODEL` / `MINIMAX_MODEL`（结构化模型兜底）

### 7.3 其他

- `MAX_SOURCE_CHARS`：参与生成的最大字符数（默认 `18000`）
- `REPORT_BODY_LIMIT_BYTES`：发布接口请求体上限（默认 `6291456`）
- `REPORT_RETENTION_DAYS`：报告保留天数，超过即清理（默认 `30`，`0` 表示不按天数清理）
- `REPORT_MAX_COUNT`：报告最大保留条数（默认 `500`，`0` 表示不按数量清理）
- `REPORT_CLEANUP_ON_STARTUP`：服务启动时是否执行清理（默认 `true`）
- `REPORT_CLEANUP_ON_PUBLISH`：每次发布后是否后台触发清理（默认 `true`）
- `VITE_OPENROUTER_PROXY_DISABLED`：前端是否禁用服务端 OpenRouter 代理（`1/true` 表示禁用）
- `VITE_OPENROUTER_ALLOW_DIRECT_FALLBACK`：代理失败时是否允许前端自动直连（默认关闭，避免用量漏记）
- `OPENROUTER_PROXY_ENABLED`：服务端 OpenRouter 代理开关（默认 `true`）
- `OPENROUTER_PROXY_BODY_LIMIT_BYTES`：代理接口请求体上限（默认 `2097152`）
- `SILICONFLOW_API_KEY`：硅基流动 API Key（可选；配置后启用自动兜底）
- `SILICONFLOW_BASE_URL`：硅基流动网关地址（默认 `https://api.siliconflow.cn/v1`）
- `SILICONFLOW_MODEL`：硅基流动默认模型（默认 `Pro/moonshotai/Kimi-K2.6`）
- 自动切换策略：每天默认优先 OpenRouter；OpenRouter 失败后自动切到硅基流动，并在当天优先走硅基流动；次日自动重置为 OpenRouter 优先。
- `USAGE_RETENTION_DAYS`：用量记录保留天数（默认 `90`）
- `USAGE_MAX_RECORDS`：用量记录最大保留条数（默认 `20000`）
- `USAGE_CLEANUP_ON_WRITE`：每次记录写入后是否异步清理（默认 `true`）
- `OPENROUTER_MODEL_PRICING_JSON`：模型价格映射（可选，单位 USD / 1M tokens），用于估算费用
