# 模块 7 — 测量与显示

> **目标**: 完整实现电压探针、电流表、文本标注、音频 IO 等测量与显示元件。
> **优先级**: P1 — 模拟/数字元件补全
> **原始 Java 源码位置**: `E:\circuitjs1\src\com\lushprojects\circuitjs1\client\`

---

## 元件清单

| 元件 | dump type | Java type | 状态 | 说明 |
|------|-----------|-----------|------|------|
| `OutputElm.java` | `o` | 字符 `'O'` | ✅ | 输出节点标签（已实现为 OutputComponent） |
| `ProbeElm.java` | `probe` | 字符 `'p'` | ❌ | 电压探针（可关联 Scope） |
| `AmmeterElm.java` | `a` | 370 | ❌ | 电流表（串联显示电流值） |
| `OhmMeterElm.java` | `ohm` | 216 | ❌ | 欧姆表 |
| `TestPointElm.java` | `tp` | 368 | ❌ | 测试点 |
| `ScopeElm.java` | `scope` | 403 | ❌ | 内嵌示波器元件 |
| `PhaseCompElm.java` | `pc` | 161 | ❌ | 相位比较器 |
| `DataRecorderElm.java` | `rec` | 210 | ❌ | 数据记录器 |
| `StopTriggerElm.java` | `st` | 408 | ❌ | 触发停止仿真 |
| `TextElm.java` | `text` | 字符 `'x'` | ❌ | 文本标注 |
| `LabeledNodeElm.java` | `label` | 207 | ❌ | 命名节点（带标签） |
| `AudioOutputElm.java` | `audio` | 211 | ❌ | 音频输出（Web Audio API） |
| `AudioInputElm.java` | `aIn` | 411 | ❌ | 音频输入 |

---

## 已实现输出元件 `OutputComponent`

- [x] **dump type**: `O`（大写 `'O'`）
- [x] **stamp**: 10MΩ 电阻接地，不负载电路
- [x] **绘制**: 圆形 + V 标签

---

## 实现优先级

1. `TextElm` — 电路标注（基于 `GraphicElm`）
2. `LabeledNodeElm` — 命名节点
3. `ProbeElm` — Scope 的前置依赖
4. `AmmeterElm` / `OhmMeterElm`
5. `AudioOutputElm` — Web Audio API 集成
6. `TestPointElm` / `PhaseCompElm`
7. `DataRecorderElm` / `StopTriggerElm`
8. `AudioInputElm`

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
