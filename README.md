# waline-tscf

一个基于 [Waline](https://github.com/walinejs/waline) 的评论系统，专为 [腾讯云函数 SCF](https://cloud.tencent.com/product/scf) 部署场景优化，增强后端性能，优化个人博客的前端样式。

## 主要特性

- 前端：admin/client
  - 样式定制：更改默认主题，定制个人博客样式
- 后端：server
  - SCF支持：适配[腾讯云函数serverless](https://cloud.tencent.com/product/scf)运行环境，提供快速部署模板
  - 功能增强：优化注册登录及邮件通知逻辑，支持通过环境变量输出多维度日志记录
  - 隐私保护：针对QQ邮箱头像获取，采用AES-256-GCM加密(需部署[waline-tscf-avatar服务](https://github.com/abiscuitx/waline-tscf-avatar))
  - 性能优化：通过依赖懒加载提升冷启动速度，结合缓存与map策略优化热启动性能
  - 资源加速：采用 jsDelivr 提供CDN加速，针对性优化MongoDB的连接性能

## 快速部署

详情查看：[waline-tscf-starter](https://github.com/abiscuitx/waline-tscf-starter)

## 项目架构

### 主要目录

```
waline/
├── 📦 packages/           # 核心包目录
│   ├── admin/            # 管理后台
│   ├── api/              # API工具集
│   ├── client/           # 客户端
│   └── server/           # 服务器端
├── 📚 docs/              # 项目文档
├── 🧪 example/           # 使用示例
├── 🛠️ scripts/          # 构建脚本
├── ⚙️ 配置文件           # 项目配置

```

- 项目:Monorepo
- 前端: Vue 3 + React
- 后端: Node.js + ThinkJS
- 构建: Vite + Rollup
- 文档: VuePress

### packages/admin - 管理后台

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

- 技术栈: React + Vite + TypeScript
- 功能: 评论管理、用户管理、系统配置等

### packages/client - 客户端

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

- 技术栈: Vue 3 + TypeScript + Rollup
- 功能: 评论组件、点赞功能、用户交互界面

### packages/server - 服务器端

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

- 技术栈: Node.js + ThinkJS 框架
- 功能: API 接口、数据库操作、用户认证、评论管理

### packages/api - API工具集

```
api/
├── package.json        # 包配置
├── rollup.config.ts    # 构建配置
├── tsconfig.json       # TypeScript 配置
└── src/               # API 定义和类型
```

- 技术栈：TypeScript
- 功能: 统一的 API 接口定义和类型声明

### 工程化配置

```
├── .eslintrc.*         # ESLint 配置
├── .prettierrc.*       # Prettier 配置
├── .stylelintrc.*      # Stylelint 配置
├── commitlint.config.* # 提交信息规范
├── tsconfig.*          # TypeScript 配置
├── vitest.config.*     # 单元测试配置
└── pnpm-workspace.yaml # pnpm 工作区配置
```

- 包管理器: pnpm
- 构建工具: Vite, Rollup
- 类型检查: TypeScript
- 代码规范: ESLint + Prettier + Stylelint
- Git 钩子: Husky + nano-staged
- 提交规范: Commitizen + Conventional Commits

## 开发说明

### pnpm脚本

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

### 提交规范

- feat: 新功能
- fix: Bug 修复
- docs: 文档更新
- style: 代码格式调整
- refactor: 代码重构
- test: 测试相关
- chore: 构建/工具配置

### VS Code配置扩展

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

### VS Code工作区

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

## 许可证

本项目采用 GPL-2.0 许可证，详见 [LICENSE](LICENSE) 文件。
