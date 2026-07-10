# 模块 10 — Canvas 绘制系统

> **目标**: 完善 Canvas 2D 图形上下文包装器、电路渲染主循环、绘制辅助函数。
> **优先级**: P2 — UI 和交互系统
> **原始 Java 源码位置**: `E:\circuitjs1\src\com\lushprojects\circuitjs1\client\`

---

## 原始 Java → 目标 TS

| Java | TS | 状态 |
|------|-----|------|
| `Graphics.java` | `packages/ui/canvas/CanvasGraphics.ts` | ✅ 已实现 |
| `Color.java` | `packages/shared/src/types.ts:ColorObj` | ✅ 已实现 |
| `Polygon.java` | `packages/shared/src/types.ts:Polygon` + `packages/core/components/base/Polygon.ts` | ✅ 已实现 |
| — | `packages/ui/canvas/CircuitRenderer.ts` | ✅ 已实现 |
| — | `packages/ui/canvas/renderer.ts` | ✅ 已实现 |
| — | `packages/core/components/drawutils.ts` | ✅ 已实现 |

---

## CanvasGraphics 当前能力

- [x] `setColor()` — 支持 string 和 ColorObj
- [x] `setLineWidth()` / `getColor()`
- [x] `drawLine()` / `drawThickLine()` / `drawThickCircle()`
- [x] `drawCoil()` — 贝塞尔曲线线圈绘制（3 段半圆弧）
- [x] `drawPolyline()` / `drawPolygon()` / `fillPolygon()`
- [x] `drawOval()` / `fillOval()`
- [x] `drawRect()` / `fillRect()` / `drawRoundRect()` / `fillRoundRect()`
- [x] `drawString()` / `setFontSize()` / `setFont()` / `measureWidth()`
- [x] `textAlign()` / `textBaseline()`
- [x] `clipRect()` / `setClip()`
- [x] `save()` / `restore()`
- [x] `getContext()`

---

## drawutils 当前能力

- [x] `setVoltageRange()` / `getVoltageColor()` — 彩虹色电压映射
- [x] `distance()` — 两点距离
- [x] `interpPoint()` / `interpPointOut()` — 线性插值
- [x] `interpPointPerp()` / `interpPointPerpOut()` — 带垂直偏移插值
- [x] `interpPoint2()` — 对称双点插值
- [x] `calcLeads()` — 引线端点计算
- [x] `drawThickLineXY()` / `drawThickLinePt()` — 粗线绘制
- [x] `drawThickPolygon()` — 粗多边形
- [x] `drawThickCircle()` — 粗圆
- [x] `drawPost()` — 连接点绘制
- [x] `drawCenteredText()` — 居中文本
- [x] `drawValues()` — 元件值标注
- [x] `drawCoil()` — Canvas transform 线圈绘制（梯度色）
- [x] `drawDots()` — 电流动画点

---

## 当前渲染流程

- [x] 基本网格绘制
- [x] 电压着色导线
- [x] 元件绘制 dispatch（`CircuitRenderer.render()`）
- [x] 节点圆点（junction dots）
- [x] 当前动画点（current dots）
- [x] 悬停高亮

### 待完善

- [ ] **选中高亮框** — 蓝色虚线框
- [ ] **网格对齐** — 吸附到网格交叉点
- [ ] **Scope 波形绘制** — 波形曲线、刻度网格、触发标记
- [ ] **抗锯齿设置** — `imageSmoothingEnabled`
- [ ] **缩放居中** — zoom 以鼠标位置为中心
- [ ] **`drawCoil` 对齐 Java 4 段半圆弧算法** — 当前使用贝塞尔曲线近似

---

## 实现笔记

- `drawCoil` 用于电感绘制，当前使用 Canvas bezierCurveTo 近似
- `getVoltageColor` 直接影响导线着色的视觉效果
- `interpPoint` 系是大量元件绘制的基础函数

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
