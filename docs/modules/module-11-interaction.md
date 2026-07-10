# 模块 11 — 交互系统

> **目标**: 完善鼠标/键盘交互、元件操作、撤销/重做系统。
> **优先级**: P2 — UI 和交互系统
> **原始 Java 源码位置**: `E:\circuitjs1\src\com\lushprojects\circuitjs1\client\`

---

## 原始 Java → 目标 TS

| Java | TS | 状态 |
|------|-----|------|
| `CirSim.java` (鼠标/键盘事件部分) | `packages/ui/canvas/InteractionHandler.ts` | ✅ 已实现 |
| `Scrollbar.java` | — | ❌ |
| `ScrollValuePopup.java` | — | ❌ |
| — | `packages/ui/components/CircuitCanvas.tsx` | ✅ 已实现 |

---

## 当前状态

- [x] 基本鼠标事件（mousedown/mousemove/mouseup）
- [x] 悬停检测（检测鼠标下元件）
- [x] 开关点击切换（`mouseUp()` → `toggle()`）
- [x] 端点拖拽
- [x] 平移（中键/Alt+拖拽）
- [x] 滚轮缩放
- [x] add-element 创建模式
- [x] 元件移动 drag（选中后拖拽移动）
- [x] 删除（Delete/Backspace）

### 待完善

#### 拾取与操作

- [x] **拾取优先级**: 元件 > 节点 > 导线
- [x] **元件旋转 flip** — X/Y 轴翻转（快捷键 X/Y）
- [x] **导线绘制** — 空白处拖拽创建导线
- [x] **导线分割** — 拖拽导线中间点生成两个导线 + 节点
- [x] **框选** — Shift+拖曳矩形选择
- [x] **复制/粘贴** — Ctrl+C/V（粘贴带偏移）

#### 撤销/重做

- [x] **撤销栈**: Java 维护 `undoStack`，`maxUndo=32`
- [x] **Ctrl+Z / Ctrl+Y**
- [ ] **撤销栈序列化** — circuit dump 中保存 undo 栈

#### 上下文菜单

- [x] **右键上下文菜单** — 元件/空白区域不同菜单

#### 键盘快捷键

| 按键 | 功能 | 状态 |
|------|------|------|
| Delete | 删除选中 | ✅ |
| X | 水平翻转 | ✅ |
| Y | 垂直翻转 | ✅ |
| Ctrl+C | 复制 | ✅ |
| Ctrl+V | 粘贴 | ✅ |
| Ctrl+Z | 撤销 | ✅ |
| Ctrl+Y | 重做 | ✅ |
| Ctrl+A | 全选 | ✅ |
| ↑↓←→ | 微调位置 | ✅ |
| Space | 仿真启停 | ✅ |

#### 触摸支持

- [x] **移动设备手势**: 双指缩放/平移
- [x] **双击编辑属性**

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
