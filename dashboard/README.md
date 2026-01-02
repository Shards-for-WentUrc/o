# 个人维护的 AstrBot 管理面板

当前状态：
- 已完成 Dashboard 全量 TypeScript 化（不再依赖/引用本地 JS 源码）
- 构建目标已对齐到 ES2022
- 本仓库内 `pnpm build` 与 `pnpm typecheck` 均可通过

## 开发

在 `dashboard/` 目录下：

```bash
pnpm install
pnpm dev
```

## 类型检查 & 构建

```bash
pnpm typecheck
pnpm build
```

## 规划

后续计划：迁移至 Nuxt.js，实现前后端分离（待排期）。

## 保留但不引用的 JS 文件（用于对比迁移）

以下 `.js` 文件目前仅作为迁移对照保留；项目实际运行与构建会优先解析同名的 `.ts`（见 `vite.config.ts` 的 `resolve.extensions` 设置），因此这些 JS 不应被业务代码显式引用：

- `src/utils/toast.js`
- `src/utils/sidebarCustomization.js`
- `src/utils/providerUtils.js`
- `src/utils/platformUtils.js`
- `src/stores/toast.js`
- `src/stores/common.js`

建议：如后续不再需要对照，可删除这些文件以避免误用。

