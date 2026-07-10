# 模块 10 — Canvas 绘制系统

> **目标**: 完善 Canvas 2D 图形上下文包装器、电路渲染主循环、绘制辅助函数。
> **优先级**: P2 — UI 和交互系统
> **状态**: ✅ 已完成
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
| — | `packages/ui/canvas/WaveformRenderer.ts` | ✅ 已实现 |
| — | `packages/ui/canvas/scope-capture.ts` | ✅ 已实现 |

---

## CanvasGraphics 当前能力

- [x] `setColor()` — 支持 string 和 ColorObj
- [x] `setLineWidth()` / `getColor()`
- [x] `drawLine()` / `drawThickLine()` / `drawThickCircle()`
- [x] `drawCoil()` — `arc()` 半圆弧线圈绘制（匹配 Java 4 段半圆弧算法）
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
- [x] 选中高亮框（蓝色虚线 boundingBox）
- [x] Scope 波形绘制（网格、曲线、标记）
- [x] 抗锯齿关闭 (`imageSmoothingEnabled = false`)

### 已实现

- [x] **选中高亮框** — 蓝色虚线框，基于 boundingBox 绘制
- [x] **网格对齐** — 吸附到网格交叉点（`snapGrid()`）
- [x] **Scope 波形绘制** — `WaveformRenderer.ts`：波形曲线、刻度网格、零线标记
- [x] **抗锯齿设置** — `imageSmoothingEnabled = false`
- [x] **缩放居中** — zoom 以鼠标位置为中心
- [x] **`drawCoil` 对齐 Java 4 段半圆弧算法** — 使用 `ctx.arc()` 半圆弧，`lineCap = 'round'`

### 新增文件

| 文件 | 说明 |
|------|------|
| `packages/ui/src/canvas/WaveformRenderer.ts` | 示波器波形绘制（网格、曲线、标记） |
| `packages/ui/src/canvas/scope-capture.ts` | 示波器数据捕获工具（环形缓冲区） |

---

## 实现笔记

- `drawCoil` 用于电感绘制，当前使用 Canvas `arc()` 半圆弧绘制（匹配 Java 4 段半圆弧算法），带 `lineCap = 'round'`
- `getVoltageColor` 直接影响导线着色的视觉效果
- `interpPoint` 系是大量元件绘制的基础函数
- 选中高亮使用蓝色虚线矩形 (`strokeStyle = '#4488FF'`, `setLineDash([3, 3])`)
- 抗锯齿通过 `ctx.imageSmoothingEnabled = false` 全局关闭，保证像素精确渲染
- 缩放已实现以鼠标位置为中心 (`zoom()` 方法中使用标准缩放公式)

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
