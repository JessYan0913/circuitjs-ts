# 模块 16 — Electron 桌面应用

> **目标**: 实现 Electron 桌面应用，支持原生文件对话框、系统菜单、拖放加载。
> **优先级**: P4 — 部署与扩展
> **原始参考**: `E:\circuitjs1\app\`（原始 Electron wrapper）

---

## 原始 → 目标

| 原始 | TS | 状态 |
|------|-----|------|
| `app/main.js` | `packages/electron/src/main.ts` | ✅ 完成 |
| `app/preload.js` | `packages/electron/src/preload.ts` | ✅ 完成 |
| — | `packages/electron/` | ✅ 已实现 |

---

## 待实现

- [x] **BrowserWindow 创建** — 加载 UI 包构建后的 index.html
- [x] **原生菜单** — File Open/Save 使用系统对话框

### preload 桥接 — `window.circuitApi`

- [x] `readFile(path)` — 读取电路文件
- [x] `writeFile(path, data)` — 保存电路文件
- [x] `showOpenDialog()` — 文件选择器
- [x] `showSaveDialog()` — 保存对话框

### 其他功能

- [x] **拖放加载** — 拖拽文件到窗口自动加载
- [x] **剪贴板操作** — 系统剪贴板集成
- [x] **窗口配置** — 大小、图标、标题

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
