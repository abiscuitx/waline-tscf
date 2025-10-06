# waline-tscf-admin

[waline-tscf](https://github.com/abiscuitx/waline-tscf)的admin前端。

> waline-tscf：一个基于 [Waline](https://github.com/walinejs/waline) 的评论系统，专为 [腾讯云函数 SCF](https://cloud.tencent.com/product/scf) 部署场景优化，增强后端性能，优化个人博客的前端样式。

## 主要特性

- 前端：admin/client
  - 样式定制：更改默认主题，定制个人博客样式
- 后端：server
  - SCF支持：适配腾讯云[Serverless应用中心](https://cloud.tencent.com/product/scf)运行环境，提供快速部署模板
  - 功能增强：优化注册登录、邮件通知、域名检查，支持通过环境变量输出多维度日志记录
  - 隐私保护：针对QQ邮箱头像获取，采用AES-256-GCM加密(需部署[waline-tscf-avatar服务](https://github.com/abiscuitx/waline-tscf-avatar))
  - 性能优化：通过依赖懒加载提升冷启动速度，结合缓存与map策略优化热启动性能
  - 资源加速：采用 jsDelivr 提供CDN加速，针对性优化MongoDB的连接性能
