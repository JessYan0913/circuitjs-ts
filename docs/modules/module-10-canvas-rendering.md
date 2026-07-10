# 模块 10 — Canvas 绘制系统

> **目标**: 完善 Canvas 2D 图形上下文包装器、电路渲染主循环、绘制辅助函数。
> **优先级**: P2 — UI 和交互系统

---

## 原始 Java → 目标 TS

| Java | TS | 状态 |
|------|-----|------|
| `Graphics.java` | `packages/ui/canvas/CanvasGraphics.ts` | ✅ |
| `Color.java` | `packages/ui/canvas/CanvasGraphics.ts` | ✅ |
| `Polygon.java` | (缺失) | ❌ |
| — | `packages/ui/canvas/CircuitRenderer.ts` | ✅ |
| — | `packages/ui/canvas/renderer.ts` | ✅ |

---

## 当前状态

- [x] 基本网格绘制
- [x] 电压着色导线
- [x] 元件绘制 dispatch
- [x] 节点圆点（junction dots）
- [x] 当前动画点（current dots）
- [x] 悬停高亮

---

## 待完善

- [ ] **`getVoltageColor(v)` 彩虹映射算法** — 0V=绿, +5V=红, -5V=蓝，线性插值
- [ ] **`drawCoil(p1, p2, v1, v2, n)`** — 4 段圆弧线圈算法（电感用）
- [ ] **`drawThickLine()` / `drawThickCircle()`** — 粗线绘制
- [ ] **`interpPoint(p1, p2, f)`** — 沿连线线性插值, f=0→p1, f=1→p2
- [ ] **`interpPoint(p1, p2, f, g)`** — 带横向偏移插值（多引脚元件）
- [ ] **`createArrow()`** — 箭头多边形生成
- [ ] **`drawDots(p1, p2, pos)`** — 电流动画点
- [ ] **`fillPolygon()`** — 填充多边形
- [ ] **选中高亮框** — 蓝色虚线框
- [ ] **网格对齐** — 吸附到网格交叉点
- [ ] **Scope 波形绘制** — 波形曲线、刻度网格、触发标记
- [ ] **抗锯齿设置** — `imageSmoothingEnabled`
- [ ] **缩放居中** — zoom 以鼠标位置为中心

---

## 实现笔记

- `drawCoil` 用于电感绘制，需要精确复现 4 段半圆弧的几何算法
- `getVoltageColor` 直接影响导线着色的视觉效果
- `interpPoint` 是大量元件绘制的基础函数

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
