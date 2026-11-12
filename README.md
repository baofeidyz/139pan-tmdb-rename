# 中国移动云盘 TMDB 重命名助手

[English](https://github.com/baofeidyz/139pan-tmdb-rename/blob/main/README.en.md) · [快速使用](https://github.com/baofeidyz/139pan-tmdb-rename/blob/main/docs/quick-start.md) · [快速开发](https://github.com/baofeidyz/139pan-tmdb-rename/blob/main/docs/development.md) · [API 契约](https://github.com/baofeidyz/139pan-tmdb-rename/blob/main/docs/139pan-api-contract.md)

一个运行在 Tampermonkey 中的中国移动云盘剧集重命名工具。它读取当前云盘目录中的视频文件，利用 TMDB 剧集元数据生成可审核的重命名计划，并且只在用户确认后执行。

本项目移植并延续了 [guangyapan-tools](https://github.com/baofeidyz/guangyapan-tools) 中经过验证的 TMDB 辅助重命名流程；本仓库负责中国移动云盘（`yun.139.com`）适配。

## 功能特点

- 根据文件名、季集编号和 TMDB 元数据自动匹配剧集
- 支持常规季度、`S00` 特别篇和人工校正
- 在执行前展示原文件名、目标文件名、置信度和警告
- 保留版本标签，检测重名及计划冲突
- 执行前再次检查云端状态，执行后校验最终文件名
- 对已成功操作的文件生成当前会话恢复计划
- 不把移动云盘凭据写入源码或持久化存储

## 环境要求

- Chrome、Edge 或 Firefox 等现代浏览器
- [Tampermonkey](https://www.tampermonkey.net/) 用户脚本管理器
- [TMDB Read Access Token](https://www.themoviedb.org/settings/api)
- Node.js 20 或更高版本（仅本地构建和开发需要）

## 快速使用

### 1. 安装脚本

从 [GitHub Releases](https://github.com/baofeidyz/139pan-tmdb-rename/releases/latest) 下载最新的 `139pan-tmdb-renamer.user.js`，打开文件并允许 Tampermonkey 安装。

也可以从源码构建：

```bash
git clone https://github.com/baofeidyz/139pan-tmdb-rename.git
cd 139pan-tmdb-rename
npm run build
```

若浏览器没有自动打开 Tampermonkey，请在 Tampermonkey 中新建脚本，把 `dist/139pan-tmdb-renamer.user.js` 的完整内容粘贴进去并保存。

### 2. 整理目录

推荐使用“剧名/季度”的目录结构，并让季度目录包含 `Sxx`：

```text
低智商犯罪/
└── S01/
    ├── 低智商犯罪 第1集.mp4
    └── 低智商犯罪 第2集.mp4
```

脚本会从当前目录名识别季度号，并从上一级目录或当前选择的文件夹识别剧名。

### 3. 生成并执行计划

1. 登录 [中国移动云盘网页版](https://yun.139.com/w/)，进入 `Sxx` 季度目录。
2. 刷新一次当前文件列表，让脚本捕获页面已有的授权请求。
3. 点击页面上的“TMDB 重命名”入口。
4. 粘贴 TMDB Read Access Token 并保存。
5. 搜索并确认正确的 TMDB 剧集，然后检查预览结果。
6. 修正低置信度或未匹配项目，只勾选需要处理的文件。
7. 点击执行并在浏览器确认框中再次确认。

第一次使用时，建议先在可恢复的测试目录中处理少量文件。完整说明、状态解释与排错方法见[快速使用指南](https://github.com/baofeidyz/139pan-tmdb-rename/blob/main/docs/quick-start.md)。

## 快速开发

本项目没有第三方运行时依赖，测试使用 Node.js 内置测试运行器。

```bash
git clone https://github.com/baofeidyz/139pan-tmdb-rename.git
cd 139pan-tmdb-rename
npm test
npm run build
npm run check
```

构建产物位于 `dist/139pan-tmdb-renamer.user.js`。模块会按 `scripts/build.mjs` 中的固定顺序合并，因此新增模块时需要同时更新构建清单。详细架构、测试策略和提交前检查见[快速开发手册](https://github.com/baofeidyz/139pan-tmdb-rename/blob/main/docs/development.md)。

## 安全与隐私

- 所有重命名都必须经过预览、勾选和浏览器二次确认。
- 移动云盘授权上下文只保存在当前页面内存中，页面刷新后会重新捕获。
- TMDB Token 只保存到用户脚本的隔离存储中。
- 自动化测试不会访问真实 TMDB 或移动云盘账号。
- 中国移动云盘内部接口可能变化，兼容性说明见[内部 API 契约](https://github.com/baofeidyz/139pan-tmdb-rename/blob/main/docs/139pan-api-contract.md)。

## 相关项目

- [guangyapan-tools](https://github.com/baofeidyz/guangyapan-tools)：本项目工作流的来源项目，面向光鸭云盘。

## 反馈与贡献

发现问题时，请在 [GitHub Issues](https://github.com/baofeidyz/139pan-tmdb-rename/issues) 中附上浏览器版本、脚本版本、目录结构、已脱敏的原始文件名以及错误信息。请勿提交 Token、Authorization 请求头、Cookie、文件 ID 或其他账号信息。
