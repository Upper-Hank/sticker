# AGENTS.md

AI 协作指引。

## 开发命令

```bash
npm run dev     # 启动开发服务器
npm run build   # 构建
npm run lint    # 代码检查
npm run preview # 预览构建
```

## 技术约定

- 使用 CSS 文件（非 CSS Modules），样式文件与组件同名
- GSAP 动画统一使用 `gsap.context()` 包裹，组件卸载时调用 `revert()` 清理
- 静态资源放在 `src/assets/`，通过 import 引入
- React 组件统一使用函数组件 + Hooks
