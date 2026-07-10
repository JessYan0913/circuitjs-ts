# 模块 0 — 基础层 (Base Layer)

> **目标**: 搭建所有元件的抽象基类、电路节点/链接模型、几何类型、图形上下文包装器。
> **优先级**: P0 — 核心仿真正确性
> **原始 Java 源码位置**: `E:\circuitjs1\src\com\lushprojects\circuitjs1\client\`

---

## 原始 Java → 目标 TS 对照

| Java | TS | 状态 |
|------|-----|------|
| `CircuitElm.java` | `packages/core/components/base/CircuitComponent.ts` | ✅ 核心 (已补充 interpPoint, setBbox, createPolygon 等) |
| `CircuitNode.java` | `packages/shared/src/types.ts:CircuitNode` | ✅ |
| `CircuitNodeLink.java` | `packages/shared/src/types.ts:CircuitNodeLink` | ✅ |
| `Point.java` | `packages/shared/src/types.ts:Point` + `packages/core/components/base/Point.ts` | ✅ 含 equals/hashCode/setLocation |
| `Polygon.java` | `packages/shared/src/types.ts:Polygon` + `packages/core/components/base/Polygon.ts` | ✅ 工厂函数 + 射线命中检测 |
| `Rectangle.java` | `packages/shared/src/types.ts:Rect` | ✅ |
| `Color.java` | `packages/shared/src/types.ts:ColorObj` | ✅ |
| `Font.java` | `packages/ui/canvas/CanvasGraphics.ts` | ✅ |
| `Graphics.java` | `packages/ui/canvas/CanvasGraphics.ts` | ✅ 含 drawRect/clipRect/drawThickLine/Circle |
| `GraphicElm.java` | `packages/core/components/base/GraphicElm.ts` | ✅ |
| `Adjustable.java` | `packages/shared/src/types.ts:Adjustable` | ✅ 接口定义 |
| `RowInfo.java` | `packages/core/matrix/RowInfo.ts` | ✅ (新增 ROW_CURRENT) |

---

## 已实现的功能

### CircuitComponent 已完成清单

- [x] **`getInfo()` 返回格式对齐** — 返回 `string[]`，状态栏/标签用
- [x] **`getDumpId()` / `getDumpClass()`** — 序列化标识符
- [x] **`needsShortcut()` / `getShortcut()`** — 键盘快捷键映射
- [x] **`setBoundingBox()` + `boundingBox`** — 命中检测
- [x] **`getPost(n)`** — 节点坐标访问 (2 post 默认, 芯片类最多 128)
- [x] **`volts[]` 数组** — 每个引脚电压存储 (Float64Array)
- [x] **`current` 属性** — 主电流值
- [x] **`currentLabel` 显示** — 电流标签 bounding box
- [x] **封装后缀/前缀格式** — `getPrefix()` / `getSuffix()`
- [x] **`Point` 类** — `pointEquals`/`pointHashCode`/`setLocation`/`copyPoint`

### CircuitComponent 新增 Java 兼容方法

- [x] **`interpPoint()`** — 4 个重载: 标准插值 / 填充已有 / 垂直偏移 / 对称双点
- [x] **`createPolygon()`** — 3 个重载: 3 点 / 4 点 / 数组
- [x] **`calcArrow()`** — 箭头多边形 + `drawArrow()` 快捷方法
- [x] **`setBbox()` / `adjustBbox()`** — 边界框设置/扩展 (4 个重载)
- [x] **`initBoundingBox()`** — 构造函数中调用
- [x] **`getBoundingBox()`** — 边界框 getter
- [x] **`draw2Leads()`** — 电压色引线绘制
- [x] **`setVoltageColor()` / `getVoltageColor()`** — 电压→颜色映射
- [x] **`drawDots()`** — 电流动画点
- [x] **`drawCenteredText()`** — 居中文本 + 边界框
- [x] **`drawValues()`** — 元件值标注
- [x] **`needsHighlight()`** — 高亮检测
- [x] **`selectRect()`** — 矩形选择
- [x] **`setPosition()`** — 内部子元件定位
- [x] **`getNode()` / `getPostVoltage()` / `getCurrent()` / `setCurrent()`**
- [x] **`newPointArray()`** — Point 数组创建
- [x] **`flipPosts()`** — 交换端点
- [x] **`allowMove()`** — 碰撞检测
- [x] **静态方法** — `drawThickLine`, `drawThickCircle`, `drawPolygon`, `fillPolygon`

### Graphics 已完成清单

- [x] `drawLine`, `drawCoil`, `drawThickLine`, `drawThickCircle`
- [x] `fillPolygon`, `drawString`, `setColor`, `setFont`
- [x] `drawRoundRect`, `fillRect`, `drawPolygon`, `setClip`/`clipRect`
- [x] `drawRect` — 描边矩形 (Java `Graphics.drawRect`)
- [x] **电压颜色映射 `getVoltageColor(v)`** — -5V~5V → 红/灰/绿
- [x] **选色函数** — `selectColor`, `needsHighlight`, `lightGrayColor`, `selectedColor`
- [x] **跟踪字段** — `currentFontSize`, `currentFont`, `lastColor`

### 缺失文件

- [x] **`GraphicElm`** — 非电气图形元件基类
- [x] **`Adjustable` 接口** — 绑定滑块的可调参数
- [x] **`Polygon` 类** — 接口+工厂+命中检测+平移

---

## Java 对照差异分析（待完善）

以下项目与 `CircuitElm.java` 相比尚未完全还原，建议在后续元件移植过程中逐步补齐：

### 高优先级（建议近期补齐）

| 缺失项 | Java 来源 | 说明 |
|--------|-----------|------|
| `static voltageRange/colorScale` | `CircuitElm.java:30-32` | 静态颜色刻度配置 |
| `static currentMult/powerMult` | `CircuitElm.java:33` | 电流/功率动画倍率 |
| `static whiteColor/selectColor/lightGrayColor` | `CircuitElm.java:39` | 静态颜色常量引用 |
| `static CirSim sim` | `CircuitElm.java:38` | 仿真器引用（各元件需访问 sim） |
| `static initClass()` | `CircuitElm.java:99-111` | 类级初始化（字体/格式/刻度） |
| `setColorScale()` | `CircuitElm.java:116-136` | 颜色刻度初始化 |
| `drawPost()` | `CircuitElm.java:548-551` | 连接点绘制（目前 renderer 中有独立实现） |
| `drawHandles()` | `CircuitElm.java:469-481` | 选中手柄绘制 |
| `getHandleGrabbedClose()` | `CircuitElm.java:483-492` | 手柄命中检测 |
| `lastHandleGrabbed` | `CircuitElm.java:62` | 手柄跟踪字段 |

### 中优先级（元件移植时需实现）

| 缺失项 | Java 来源 | 说明 |
|--------|-----------|------|
| `getNodeAtPoint()` | `CircuitElm.java:525-535` | 按坐标查找节点 |
| `drawPosts()` | `CircuitElm.java:453-467` | 选中时绘制所有 post |
| `getConnection()` / `getConnectionNode()` | `CircuitElm.java:929, 921-925` | 节点连通性检测 |
| `hasGroundConnection()` | `CircuitElm.java:932` | 接地检测 |
| `canViewInScope()` | `CircuitElm.java:937` | 示波器兼容性 |
| `getCurrentIntoNode()` | `CircuitElm.java:984-990` | 指定节点的电流 |
| `doAdjust()` / `setupAdjust()` | `CircuitElm.java:833-834` | 滑块配置回调 |
| `updateModels()` | `CircuitElm.java:981` | 模型更新回调 |
| `getScopeValue()` / `getScopeUnits()` | `CircuitElm.java:909-915` | 示波器值查询 |
| `getBasicInfo()` | `CircuitElm.java:840-844` | 基础信息数组构建 |

### 低优先级（保留作参考）

| 缺失项 | Java 来源 | 说明 |
|--------|-----------|------|
| `static abs/sign/min/max` | `CircuitElm.java:952-955` | TS 中可直接用 `Math.*` |
| `static distance()` | `CircuitElm.java:956-959` | Point.ts 中已有 `pointDistance` |
| `static showFormat/shortFormat` | `CircuitElm.java:42` | 数字格式化（后续格式化模块） |
| `SCALE_AUTO/1/M/MU` | `CircuitElm.java:46-49` | 显示刻度常量 |
| `getUnitText()` / `getVoltageText()` 等 | `CircuitElm.java:732-803` | 单位文本格式化 |
| `setPowerColor()` / `setConductanceColor()` | `CircuitElm.java:872-907` | 功耗/电导着色 |
| `mouseElmRef` | `CircuitElm.java:44` | 鼠标悬停引用（在交互层实现） |
| `setMouseElm()` / `isMouseElm()` | `CircuitElm.java:967-979` | 鼠标悬停管理 |
| `comparePair()` | `CircuitElm.java:938-940` | 端点比对 |
| `draggingDone()` | `CircuitElm.java:973` | 拖拽完成回调 |
| `allowMove()` | `CircuitElm.java:416-430` | 当前为 stub (返回 true)，实际需 sim.elmList |

### Graphics.java 对比差异

| 缺失项 | 说明 |
|--------|------|
| `drawLock()` | `Graphics.java:141-153` — 锁图标绘制（特定 UI 元素，非核心） |
| `setLineDash()` | `Graphics.java:161-163` — 虚线设置（后续需要时添加） |
| `viewFullScreen()` / `exitFullScreen()` | `Graphics.java:173-209` — 全屏 API（平台相关） |

### Adjustable.java 对比

Java 的 `Adjustable` 是一个完整的 UI 类（实现 `Command`，含 `Scrollbar`、`Label`、serialization），TS 当前只定义了最小接口。完整的 UI 控件归入模块 12 (UI 层) 实现。

---

## 实现笔记

- `CircuitComponent` 基类结构完整（stamp, draw, getInfo, interpPoint, setBbox, createPolygon 等）
- 节点分配、NodeMap 机制已实现
- 矩阵 RowInfo 已搬运（含新增 ROW_CURRENT）
- `Graphics` 接口和 `CanvasGraphics` 完整实现 Java 所有核心方法
- `GraphicElm`, `Adjustable`, `Polygon` 文件均已创建
- 点工具函数（Point.ts）含 equals/hashCode/setLocation/toString

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
