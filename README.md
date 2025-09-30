# Waline-TSCF

[![License](https://img.shields.io/github/license/abiscuitx/waline-tscf)](https://github.com/abiscuitx/waline-tscf/blob/main/LICENSE)
[![Version](https://img.shields.io/badge/version-2.0.0--beta.48-blue)](https://github.com/abiscuitx/waline-tscf)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

> 基于 Waline 的腾讯云函数 SCF 评论系统 | 个人博客定制版

一个基于 [Waline](https://github.com/walinejs/waline) 的评论系统，专为 [腾讯云函数 SCF](https://cloud.tencent.com/product/scf) 部署优化，包含个人博客定制化功能和样式。

## 主要修改
- 优化了腾讯云 SCF 部署适配
- 个人博客样式定制
- 数据库连接池管理
- 缓存机制和懒加载支持
- 增强的功能支持和日志分析

## 🚀 开发说明

### 基本步骤

1. **Fork 项目** → **Clone 到本地**
2. **启动 Dev Container** 或 **本地安装依赖**
3. **创建功能分支** (`git checkout -b feat/your-feature`)
4. **开发代码** → **运行测试**
5. **提交代码** (自动触发钩子检查)
6. **推送分支** → ** 创建 Pull Request**
7. **代码审查** → **✅合并到主分支**

### 核心命令

```bash
# 开发环境
pnpm admin:dev          # 启动管理后台开发服务器
pnpm client:dev         # 启动客户端开发服务器
pnpm server:dev         # 启动服务器开发环境
pnpm docs:dev          # 启动文档开发服务器

# 构建打包
pnpm build             # 构建所有包
pnpm admin:build       # 构建管理后台
pnpm client:build      # 构建客户端
pnpm docs:build        # 构建文档

# 代码质量
pnpm lint              # 运行所有 linter
pnpm test              # 运行单元测试

# 依赖管理
pnpm packages:update   # 更新所有依赖
```

### 🎯 VS Code 编辑器配置

#### 必装扩展

```json
{
  "recommendations": [
    "esbenp.prettier-vscode", // 代码格式化
    "dbaeumer.vscode-eslint", // ESLint 支持
    "stylelint.vscode-stylelint", // 样式检查
    "ms-vscode.vscode-typescript-next", // TypeScript 支持
    "vue.volar", // Vue 3 支持
    "ms-vscode-remote.remote-containers", // Dev Container 支持
    "streetsidesoftware.code-spell-checker", // 拼写检查
    "yzhang.markdown-all-in-one", // Markdown 增强
    "davidanson.vscode-markdownlint" // Markdown 规范检查
  ]
}
```

#### 工作区设置优化

```json
{
  // 格式化配置
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.fixAll.stylelint": true
  },

  // TypeScript 配置
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,

  // 文件关联
  "files.associations": {
    "*.vue": "vue"
  },

  // 排除文件
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.vuepress/.cache": true,
    "**/.vuepress/.temp": true
  },

  // 搜索排除
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/pnpm-lock.yaml": true
  }
}
```

### 🐳 Dev Container 使用指南

#### 快速启动

```bash
# 1. 安装 Docker Desktop
# 2. 安装 VS Code Remote-Containers 扩展
# 3. 打开项目，VS Code 会提示 "Reopen in Container"
# 4. 点击确认，自动构建开发环境
```

#### Container 功能

- ✅ 自动安装 Node.js 和 pnpm
- ✅ 自动执行 `pnpm i` 安装依赖
- ✅ 自动启动客户端开发服务器 (端口5173)
- ✅ 预配置所有开发工具

### 🎣 Git 钩子配置

#### 本地开发设置

```bash
# 1. 确保已安装依赖
pnpm install

# 2. 初始化 Husky (如果需要)
pnpm prepare

# 3. 验证钩子是否生效
git commit -m "test: commit message format"
```

#### 提交信息规范

```bash
# 格式: <type>(<scope>): <description>
feat(client): add new comment component
fix(server): resolve XSS security issue
docs(readme): update configuration guide
chore(deps): update dependencies
```

**类型说明:**

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建/工具配置

### 🔧 GitHub 仓库配置

#### 1. 分支保护规则

```yaml
# Settings > Branches > Add rule
Branch name pattern: main
☑️ Require a pull request before merging
☑️ Require status checks to pass before merging
  ☑️ Require branches to be up to date before merging
  Required status checks:
    - Test (ubuntu-latest, 20)
    - Test (ubuntu-latest, 22)
☑️ Require conversation resolution before merging
☑️ Include administrators
```

#### 2. Secrets 配置

```bash
# Settings > Secrets and variables > Actions
NPM_TOKEN=<your-npm-token>          # npm 发布权限
CODECOV_TOKEN=<codecov-token>       # 代码覆盖率
LEANCLOUD_ID=<leancloud-id>         # 数据库配置
LEANCLOUD_KEY=<leancloud-key>       # 数据库密钥
```

#### 3. Issue/PR 模板激活

```bash
# 自动激活的模板
.github/
├── ISSUE_TEMPLATE/
│   ├── bug_report.yml      # Bug 报告模板
│   ├── feature_request.yml # 功能请求模板
│   └── question.yml        # 问题咨询模板
└── pull_request_template.md # PR 模板
```

#### 4. 自动化功能配置

**Renovate 依赖更新:**

```json
{
  "extends": ["config:base"],
  "schedule": ["before 4am on Monday"],
  "packageRules": [
    {
      "matchDepTypes": ["devDependencies"],
      "automerge": true
    }
  ]
}
```

**Issue 自动处理:**

- 🏷️ 自动标签分配
- ⏰ 过期 Issue 自动关闭 (90天)
- 🤖 回复模板自动化

### 💡 最佳实践建议

#### 性能优化

- 使用 `pnpm` 而非 `npm/yarn` (项目配置要求)
- 启用 VS Code 的 TypeScript Hero 自动导入
- 配置合适的 `.vscode/settings.json`

#### 安全考虑

- 永远不要提交 `.env` 文件
- 使用 GitHub Secrets 管理敏感信息
- 定期更新依赖版本 (Renovate 自动化)

#### 团队协作

- 遵循 Conventional Commits 规范
- 编写清晰的 PR 描述
- 及时响应 Code Review 建议

## 🏗️ 项目架构

```
waline/
├── 📦 packages/           # 核心包目录
│   ├── admin/            # 管理后台
│   ├── api/              # API 接口层
│   ├── client/           # 客户端组件
│   ├── cloudbase/        # 腾讯云开发适配
│   ├── hexo-next/        # Hexo Next 主题插件
│   └── server/           # 服务器端
├── 📚 docs/              # 项目文档
├── 🧪 example/           # 使用示例
├── 🛠️ scripts/          # 构建脚本
├── ⚙️ 配置文件           # 项目配置
└── 📄 项目文件           # 项目说明文件
```

### 1. Monorepo 架构

- 统一依赖管理
- 代码共享和复用
- 统一构建流程

### 2. 模块化设计

- 客户端、服务端、管理后台分离
- 插件化扩展机制
- 多平台适配支持

### 3. 现代化工程

- TypeScript 全面覆盖
- 自动化测试和 CI/CD
- 规范化代码提交流程

### 4. 多技术栈支持

- 前端: Vue 3 + React
- 后端: Node.js + ThinkJS
- 构建: Vite + Rollup
- 文档: VuePress

## 📦 核心包详解

### 1. packages/admin - 管理后台

```
admin/
├── index.html           # 入口页面
├── package.json         # 包配置
├── vite.config.ts       # Vite 构建配置
├── .babelrc            # Babel 配置
└── src/                # 源代码
    ├── components/     # React 组件
    ├── pages/          # 页面组件
    ├── services/       # API 服务
    ├── store/          # 状态管理
    ├── utils/          # 工具函数
    └── locales/        # 国际化文件
```

**技术栈**: React + Vite + TypeScript
**功能**: 评论管理、用户管理、系统配置等

### 2. packages/client - 客户端组件

```
client/
├── README.md           # 客户端文档
├── LICENSE             # 许可证
├── package.json        # 包配置
├── rollup.config.ts    # Rollup 构建配置
├── vite.config.ts      # Vite 开发配置
├── tsconfig.json       # TypeScript 配置
├── __tests__/          # 单元测试
├── template/           # HTML 模板
└── src/
    ├── components/     # Vue 组件
    ├── composables/    # Vue 3 组合式 API
    ├── config/         # 配置管理
    ├── entries/        # 入口文件
    ├── styles/         # 样式文件
    ├── typings/        # 类型定义
    ├── utils/          # 工具函数
    └── widgets/        # 小部件
```

**技术栈**: Vue 3 + TypeScript + Rollup
**功能**: 评论组件、点赞功能、用户交互界面

### 3. packages/server - 服务器端

```
server/
├── README.md           # 服务端文档
├── package.json        # 包配置
├── index.js            # 主入口
├── vanilla.js          # 原生 JS 入口
├── development.js      # 开发环境入口
├── Dockerfile*         # Docker 配置文件
├── docker-compose.yml  # Docker Compose 配置
├── __tests__/          # 单元测试
└── src/
    ├── config/         # 配置管理
    ├── controller/     # 控制器
    ├── logic/          # 业务逻辑
    ├── middleware/     # 中间件
    ├── service/        # 服务层
    ├── extend/         # 扩展功能
    └── locales/        # 国际化
```

**技术栈**: Node.js + ThinkJS 框架
**功能**: API 接口、数据库操作、用户认证、评论管理

### 4. packages/api - API 接口层

```
api/
├── package.json        # 包配置
├── rollup.config.ts    # 构建配置
├── tsconfig.json       # TypeScript 配置
└── src/               # API 定义和类型
```

**功能**: 统一的 API 接口定义和类型声明

### 5. packages/cloudbase - 腾讯云cloudbas适配方案

**功能**: 腾讯云开发平台的部署适配器

### 6. packages/hexo-next - Hexo 插件

**功能**: 为 Hexo Next 主题提供的 Waline 集成插件

## 📚 文档系统

### docs/ - 项目文档

```
docs/
├── README.md           # 文档说明
├── package.json        # 文档构建配置
├── tsconfig.json       # TypeScript 配置
└── src/               # VuePress 文档源码
```

**技术栈**: VuePress
**内容**: 用户指南、API 文档、部署教程等

## 🧪 示例和测试

### example/ - 使用示例

```
example/
├── README.md           # 示例说明
├── package.json        # 依赖配置
├── index.cjs          # 示例服务器
├── vercel.json        # Vercel 部署配置
├── .env.example       # 环境变量模板
└── robots.txt         # SEO 配置
```

**功能**: 提供完整的 Waline 使用示例和部署模板

## ⚙️ 工程化配置

### 构建和开发工具

- **包管理器**: pnpm (v10.17.0)
- **构建工具**: Vite, Rollup
- **类型检查**: TypeScript
- **代码规范**: ESLint + Prettier + Stylelint
- **Git 钩子**: Husky + nano-staged
- **提交规范**: Commitizen + Conventional Commits

### 配置文件说明

```
├── .eslintrc.*         # ESLint 配置
├── .prettierrc.*       # Prettier 配置
├── .stylelintrc.*      # Stylelint 配置
├── commitlint.config.* # 提交信息规范
├── tsconfig.*          # TypeScript 配置
├── vitest.config.*     # 单元测试配置
└── pnpm-workspace.yaml # pnpm 工作区配置
```

## 🔧 其他配置

### 📁 .devcontainer/ - 开发容器配置

```json
{
  "name": "Waline Workspace",
  "updateContentCommand": "pnpm i",
  "postAttachCommand": "pnpm run client:dev",
  "forwardPorts": [5173],
  "customizations": {
    "codespaces": {
      "openFiles": ["packages/client/src/init.ts"]
    }
  }
}
```

**功能**:

- 🐳 VS Code Dev Container 和 GitHub Codespaces 支持
- 🚀 自动安装依赖并启动客户端开发服务器
- 🌐 端口转发配置 (5173)
- 📂 自动打开关键文件

### 📁 .github/ - GitHub 自动化配置

```
.github/
├── workflows/              # GitHub Actions 工作流
│   ├── test.yml           # 测试工作流
│   ├── codeql-analysis.yml # 代码安全扫描
│   ├── docker-test.yml    # Docker 测试
│   ├── docs-deploy.yml    # 文档部署
│   ├── release-*.yml      # 包发布流程
│   └── issue-*.yml        # Issue 自动化处理
├── ISSUE_TEMPLATE/        # Issue 模板
├── DISCUSSION_TEMPLATE/   # 讨论模板
├── renovate.json         # Renovate 依赖更新配置
└── stale.yml            # 过期 Issue/PR 处理
```

#### 🔄 主要 CI/CD 工作流

- **test.yml**: Node.js 20/22 多版本测试，包含构建、代码检查、单元测试
- **release-\*.yml**: 自动化包发布到 npm
- **docs-deploy.yml**: 自动部署文档到 GitHub Pages
- **codeql-analysis.yml**: GitHub 安全代码扫描

### 📁 .husky/ - Git 钩子管理

```bash
# .husky/commit-msg
pnpm commitlint --edit $1

# .husky/pre-commit
pnpm nano-staged
```

**功能**:

- 🔍 **commit-msg**: 提交信息格式验证
- 🧹 **pre-commit**: 代码格式化和 lint 检查
- 📝 遵循 Conventional Commits 规范

### 📁 .vscode/ - VS Code 工作区配置

```json
{
  "cSpell.words": [
    "akismet",
    "aliyun",
    "cloudbase",
    "darkmode",
    "waline",
    "walinejs",
    "pageview",
    "katex"
  ]
}
```

**功能**:

- 🔤 自定义拼写检查词典
- 🚫 避免项目特定术语的拼写误报

### 📄 环境和配置文件详解

#### .env.example - 环境变量模板

```bash
LEAN_ID=<Your LeanCloud ID>
LEAN_KEY=<Your LeanCloud Key>
LEAN_MASTER_KEY=<Your LeanCloud Master Key>
LEAN_SERVER=<Your LeanCloud Server>
```

**用途**: LeanCloud 数据库配置模板

#### .gitignore - Git 忽略规则

关键忽略项：

```ignore
node_modules/           # 依赖包
dist/                  # 构建产物
.env*                  # 环境变量文件
coverage/              # 测试覆盖率报告
**/.vuepress/.cache/   # VuePress 缓存
.DS_Store              # macOS 系统文件
```

#### .markdownlint-cli2.mjs - Markdown 规范配置

```javascript
export default {
  config: {
    MD013: false,        # 禁用行长度限制
    MD033: {            # 允许特定 HTML 标签
      allowed_elements: ['br', 'kbd', 'script', 'span']
    }
  }
}
```

#### .stylelintrc.yml - 样式代码规范

```yaml
extends:
  - stylelint-config-hope
rules:
  media-feature-range-notation: prefix
  no-descending-specificity: null
```

## 许可证

本项目采用 GPL-2.0 许可证，详见 [LICENSE](LICENSE) 文件。
