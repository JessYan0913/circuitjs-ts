# 模块 0 — 基础层 (Base Layer)

> **目标**: 搭建所有元件的抽象基类、电路节点/链接模型、几何类型、图形上下文包装器。
> **优先级**: P0 — 核心仿真正确性

---

## 原始 Java → 目标 TS 对照

| Java | TS | 状态 |
|------|-----|------|
| `CircuitElm.java` | `packages/core/components/base/CircuitComponent.ts` | ✅ 核心 |
| `CircuitNode.java` | `packages/shared/src/types.ts:CircuitNode` | ✅ |
| `CircuitNodeLink.java` | `packages/shared/src/types.ts:CircuitNodeLink` | ✅ |
| `Point.java` | `packages/shared/src/types.ts:Point` | ✅ |
| `Polygon.java` | (缺失) | ❌ |
| `Rectangle.java` | `packages/shared/src/types.ts` | ✅ |
| `Color.java` | `packages/ui/canvas/CanvasGraphics.ts` | ✅ |
| `Font.java` | `packages/ui/canvas/CanvasGraphics.ts` | ✅ |
| `Graphics.java` | `packages/ui/canvas/CanvasGraphics.ts` | ✅ |
| `GraphicElm.java` | `packages/core/components/base/` | ❌ |
| `Adjustable.java` | (缺失) | ❌ |
| `RowInfo.java` | `packages/core/matrix/RowInfo.ts` | ✅ |

---

## 待完善清单

### CircuitComponent 接口对齐

- [ ] **`getInfo()` 返回格式对齐** — 原始返回 `String[]`，TS 端确保格式一致（状态栏依赖）
- [ ] **`getDumpId()` / `getDumpClass()`** — 序列化标识符字符串与原始 1:1 对应
- [ ] **`needsShortcut()` / `getShortcut()`** — 键盘快捷键映射
- [ ] **`setBoundingBox()` + boundingBox** — 命中检测依赖此框
- [ ] **`getPost(n)` — 节点坐标访问** — 简单元件 2 post，芯片类最多 128
- [ ] **`volts[]` 数组** — 每个引脚电压存储
- [ ] **`current` 属性** — 主电流值
- [ ] **`currentLabel` 显示**
- [ ] **封装后缀/前缀格式** — 电阻 `R`、电容 `C` 等
- [ ] **`Point` 类** — `equals`/`hashCode` 一致性

### Graphics API 覆盖

- [ ] `drawLine`, `drawCoil`, `drawThickLine`, `drawThickCircle`
- [ ] `fillPolygon`, `drawString`, `setColor`, `setFont`
- [ ] `drawRoundRect`, `fillRect`, `drawPolygon`, `setClip`
- [ ] **电压颜色映射 `getVoltageColor(v)`** — -5V~5V → 彩虹色
- [ ] **选色函数** — `selectColor`, `needsHighlight`, `lightGrayColor`, `selectedColor`

### 缺失文件

- [ ] **`GraphicElm`** — 非电气图形元件基类（Box、Text 等）
- [ ] **`Adjustable` 接口** — 绑定滑块的可调参数
- [ ] **`Polygon` 类** — 多边形

---

## 实现笔记

- `CircuitComponent` 基类结构已搭建（stamp, draw, getInfo 接口）
- 节点分配、NodeMap 机制已实现
- 矩阵 RowInfo 已搬运

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
