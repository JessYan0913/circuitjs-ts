# 模块 16 — Electron 桌面应用

> **目标**: 实现 Electron 桌面应用，支持原生文件对话框、系统菜单、拖放加载。
> **优先级**: P4 — 部署与扩展
> **原始参考**: `E:\circuitjs1\app\`（原始 Electron wrapper）

---

## 原始 → 目标

| 原始 | TS | 状态 |
|------|-----|------|
| `app/main.js` | `packages/electron/src/main.ts` | ❌ 仅占位符 |
| `app/preload.js` | `packages/electron/src/preload.ts` | ❌ |
| — | `packages/electron/` | ❌ 空目录 |

---

## 待实现

- [ ] **BrowserWindow 创建** — 加载 UI 包构建后的 index.html
- [ ] **原生菜单** — File Open/Save 使用系统对话框

### preload 桥接 — `window.circuitApi`

- [ ] `readFile(path)` — 读取电路文件
- [ ] `writeFile(path, data)` — 保存电路文件
- [ ] `showOpenDialog()` — 文件选择器
- [ ] `showSaveDialog()` — 保存对话框

### 其他功能

- [ ] **拖放加载** — 拖拽文件到窗口自动加载
- [ ] **剪贴板操作** — 系统剪贴板集成
- [ ] **窗口配置** — 大小、图标、标题

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
