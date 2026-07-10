# 模块 11 — 交互系统

> **目标**: 完善鼠标/键盘交互、元件操作、撤销/重做系统。
> **优先级**: P2 — UI 和交互系统

---

## 原始 Java → 目标 TS

| Java | TS | 状态 |
|------|-----|------|
| `CirSim.java` (鼠标/键盘事件) | `packages/ui/canvas/InteractionHandler.ts` | ✅ 基础 |
| `Scrollbar.java` | — | ❌ |
| `ScrollValuePopup.java` | — | ❌ |
| — | `packages/ui/components/CircuitCanvas.tsx` | ✅ |

---

## 当前状态

- [x] 基本鼠标事件（mousedown/mousemove/mouseup）
- [x] 悬停检测
- [x] 开关点击切换
- [x] 端点拖拽
- [x] 平移（中键/Alt）
- [x] 滚轮缩放
- [x] add-element 创建模式

---

## 待完善

### 拾取与操作

- [ ] **拾取优先级**: 元件 > 节点 > 导线
- [ ] **元件移动 drag** — 选中后拖拽移动
- [ ] **元件旋转 flip** — X/Y 轴翻转（快捷键 X/Y）
- [ ] **导线绘制** — 空白处拖拽创建导线
- [ ] **导线分割** — 拖拽导线中间点生成两个导线 + 节点
- [ ] **框选** — Shift+拖曳矩形选择
- [ ] **复制/粘贴** — Ctrl+C/V（粘贴带偏移）
- [ ] **删除** — Delete/Backspace

### 撤销/重做

- [ ] **撤销栈**: 原始维护 `undoStack`，`maxUndo=32`
- [ ] **Ctrl+Z / Ctrl+Y**
- [ ] **撤销栈序列化** — circuit dump 中保存 undo 栈

### 上下文菜单

- [ ] **右键上下文菜单** — 元件/空白区域不同菜单

### 键盘快捷键

| 按键 | 功能 |
|------|------|
| Delete | 删除选中 |
| X | 水平翻转 |
| Y | 垂直翻转 |
| Ctrl+C | 复制 |
| Ctrl+V | 粘贴 |
| Ctrl+Z | 撤销 |
| Ctrl+Y | 重做 |
| Ctrl+A | 全选 |
| ↑↓←→ | 微调位置 |
| Space | 仿真启停 |

### 触摸支持

- [ ] **移动设备手势**: 双指缩放/平移
- [ ] **双击编辑属性**

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
