# file2web（前端单体版）

这是一个纯前端的 `file / text -> weekly-report html` 工具：

1. 上传 `PDF / DOCX / DOC / TXT / MD / CSV` 或直接输入文本。
2. 选择生成引擎：`结构化 + 模板` 或 `纯 LLM HTML`。
3. 配置模板、风格、部门上下文、领导关注点和自定义要求。
4. 前端直接调用 `.env` 中的 OpenRouter 接口生成并预览导出 HTML。

## 当前能力

- 双引擎生成
  - `结构化 + 模板`：先抽象通用报告数据结构，再套模板渲染
  - `纯 LLM HTML`：基于 system prompt 直接生成完整 HTML 页面
- 模板系统
  - 内置 10 种模板（叙事版、驾驶舱、正式简报、战略总览、风控闭环、科研管线、执行推进、预算资源、国际合作、人才发展）
  - 模板元数据包含“适配部门/适配领导/模块蓝图”，可用于推荐与 Prompt 编排
  - 每个模板目录均包含 `index.html + style.css + app.js`，前端会把模板 JSON 注入 HTML 并渲染
- 通用报告结构
  - 除 `summary/sections/highlights` 外，支持 `metrics/progress/risk/actions/decision/resource` 等扩展字段
- 组织上下文编排
  - 支持部门与领导视角输入，让同一份原文生成不同侧重点的报告
  - 前端支持“仅看推荐模板”，按部门 + 领导关注点自动排序模板
  - `llm-html` 模式增加基础清洗（移除 `script`、内联事件、`javascript:` 链接）

## 当前架构

- `src/`：React + Vite 单体应用源码（无后端服务）
- `template/`：模板资产目录（`01~10`），每个模板可独立预览并支持数据注入渲染
- `dist/`：前端构建输出目录

## 模板注入协议

模板 HTML 使用以下占位符：

- `__TEMPLATE_STYLE__`：注入对应模板 CSS
- `__TEMPLATE_SCRIPT__`：注入对应模板 JS
- `__TEMPLATE_DATA__`：注入结构化后的模板 JSON

前端渲染流程：

1. 先把上传文本抽取并结构化为通用 `StructuredDocument`
2. 按模板类型映射为该模板所需 `viewModel`（例如 narrative/dashboard/risk/pipeline）
3. 将 `viewModel` 注入模板 HTML，`app.js` 在浏览器中读取 JSON 并渲染页面

## 环境变量

项目会优先读取根目录 `.env`，支持两组变量名：

- 新字段（推荐）
  - `OPENROUTER_API_KEY`
  - `OPENROUTER_BASE_URL`（默认 `https://openrouter.ai/api/v1`）
  - `OPENROUTER_HTML_MODEL`（LLM 直出 HTML，默认 `minimax/minimax-m2.7`）
  - `OPENROUTER_STRUCTURED_MODEL`（结构化抽取模型，默认 `minimax/minimax-m2.7`，可改为免费模型）
- 兼容字段（历史命名）
  - `MINIMAX_API_KEY`
  - `MINIMAX_BASE_URL`
  - `MINIMAX_HTML_MODEL`
  - `MINIMAX_STRUCTURED_MODEL`
  - `OPENROUTER_MODEL` / `MINIMAX_MODEL`（仅作为结构化模型兜底回退）

其余可选字段：

- `MAX_SOURCE_CHARS`：参与生成的最大字符数（默认 `18000`）

## 快速启动

```bash
npm install
npm run dev
```

启动地址：

- 前端：`http://127.0.0.1:5173`

## 手动启动

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

构建输出目录：`dist`

## 重要说明

- 这是前端直连 LLM 的方案，API Key 会暴露在浏览器端，请仅用于内网、演示或受控环境。
- `.doc` 旧格式在浏览器侧无法稳定抽取，建议转为 `.docx` 后上传。
- 建议优先使用 `结构化 + 模板` 保证稳定性；`纯 LLM HTML` 模式灵活度更高但波动也更大。
