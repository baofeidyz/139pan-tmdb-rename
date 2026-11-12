# 快速开发手册

[返回 README](https://github.com/baofeidyz/139pan-tmdb-rename/blob/main/README.md) · [English README](https://github.com/baofeidyz/139pan-tmdb-rename/blob/main/README.en.md) · [快速使用指南](https://github.com/baofeidyz/139pan-tmdb-rename/blob/main/docs/quick-start.md)

## 本地环境与命令

需要 Git、Node.js 20 或更高版本；手工验证还需要现代浏览器和 Tampermonkey。项目没有第三方运行时依赖，也不需要执行 `npm install` 才能运行现有测试和构建。

```bash
git clone https://github.com/baofeidyz/139pan-tmdb-rename.git
cd 139pan-tmdb-rename
npm test
npm run build
npm run check
```

| 命令 | 作用 |
| --- | --- |
| `npm test` | 用 Node.js 内置测试运行器执行 `test/*.test.js` |
| `npm run build` | 合并元数据和源码，生成用户脚本 |
| `npm run check` | 依次执行测试和构建，作为提交前检查 |

## 目录结构

```text
.
├── src/                         # 用户脚本源码模块与元数据
├── test/                        # 离线单元测试
├── scripts/build.mjs            # 确定性构建脚本
├── docs/                        # 使用、开发和接口文档
├── openspec/                    # 需求、设计与任务记录
├── dist/                        # 本地构建产物，不提交 Git
└── package.json
```

## 模块职责

| 文件 | 主要职责 |
| --- | --- |
| `src/types.js` | 共享约定与基础工具 |
| `src/parser.js` | 文件名、集数和版本标签解析 |
| `src/matcher.js` | 文件与 TMDB 剧集匹配 |
| `src/plan.js` | 目标名称、计划生成与冲突校验 |
| `src/tmdb-client.js` | Token、剧集搜索与季度数据获取 |
| `src/139-client.js` | 文件列表、重命名、重试与结果校验 |
| `src/bridge.js` | 捕获并净化网页现有请求上下文 |
| `src/ui.js` | 面板渲染与交互 |
| `src/main.js` | 目录状态、流程编排与应用启动 |

各模块挂载到 `globalThis.GTR`，构建时按固定顺序拼接到一个 IIFE 中。新增或调整模块依赖时，必须同步检查 `scripts/build.mjs` 的 `sources` 顺序。

## 开发流程

1. 先为预期行为补充或更新对应的 `test/*.test.js`。
2. 在职责最接近的 `src/*.js` 中实现变更，避免把云盘适配逻辑混入通用解析或匹配模块。
3. 执行 `npm test`，确认离线行为和边界条件。
4. 执行 `npm run build`，检查生成文件开头的 userscript 元数据。
5. 执行 `npm run check` 作为最终本地检查。
6. 如需真实页面验证，先只验证注入、目录读取和预览；实际重命名必须使用可恢复的测试文件并经过明确确认。

## 测试策略

- 单元测试必须离线运行，不依赖真实账号、TMDB 服务或移动云盘接口。
- 网络客户端通过注入请求函数测试请求体、分页、错误与重试行为。
- DOM/UI 测试使用最小化测试替身，覆盖按钮状态、转义和交互逻辑。
- 文件名解析和匹配变更应增加中文、英文、特别篇、版本标签和异常输入样例。
- 修复回归时，先增加能稳定复现问题的测试。

## 手工验证清单

- 构建产物只匹配 `https://yun.139.com/w/*`。
- 面板能区分“等待授权”和“已捕获授权”。
- 进入不同目录后，旧计划会被清除。
- 未选择 TMDB 剧集时不会生成计划。
- 低置信度和未匹配项目可人工修正。
- 计划有冲突或没有选中项时不能执行。
- 执行前出现浏览器确认框。
- 成功、失败、状态过期和最终名称不一致能被区分。
- 页面与控制台中不输出 Authorization、Cookie 或 TMDB Token。

## 版本与构建

发布或分发新版本前：

1. 更新 `package.json` 与 `src/userscript.meta.txt` 中的版本号并保持一致。
2. 执行 `npm run check`。
3. 确认 `dist/139pan-tmdb-renamer.user.js` 是由当前源码重新生成的。
4. 检查元数据的 `@match`、`@connect` 和 `@grant` 是否仍是最小必要集合。

`dist/` 已加入 `.gitignore`，因此构建产物适合本地安装或作为发布附件，不应混入源码提交。

## 安全与问题报告

中国移动云盘适配使用网页内部接口，经过脱敏的已知结构记录在 [API 契约](https://github.com/baofeidyz/139pan-tmdb-rename/blob/main/docs/139pan-api-contract.md)。接口兼容性变更应同时更新客户端、测试和该文档。

Issue 或测试夹具中禁止出现 Authorization 请求头、Cookie、TMDB Token、真实文件 ID、目录 ID、账号信息或可识别个人媒体库的完整日志。

提交问题请使用 [GitHub Issues](https://github.com/baofeidyz/139pan-tmdb-rename/issues)，提供浏览器版本、脚本版本、已脱敏目录结构、最小复现步骤和实际错误文本。

## 关联项目

[guangyapan-tools](https://github.com/baofeidyz/guangyapan-tools) 是本项目 TMDB 辅助重命名工作流的来源项目。通用行为需要同步时，先比较两边的解析、匹配、计划和执行语义，再分别保留各自的云盘适配层。
