# 模块 7 — 测量与显示

> **目标**: 完整实现电压探针、电流表、文本标注、音频 IO 等测量与显示元件。
> **优先级**: P1 — 模拟/数字元件补全

---

## 元件清单

| 元件 | dump type | 状态 | 说明 |
|------|-----------|------|------|
| `ProbeElm.java` | `probe` | ❌ | 电压探针（可关联 Scope） |
| `AmmeterElm.java` | `a` | ❌ | 电流表（串联显示电流值） |
| `OhmMeterElm.java` | `ohm` | ❌ | 欧姆表 |
| `OutputElm.java` | `o` | ✅ | 输出节点标签 |
| `TestPointElm.java` | `tp` | ❌ | 测试点 |
| `ScopeElm.java` | `scope` | ❌ | 内嵌示波器元件 |
| `PhaseCompElm.java` | `pc` | ❌ | 相位比较器 |
| `DataRecorderElm.java` | `rec` | ❌ | 数据记录器 |
| `StopTriggerElm.java` | `st` | ❌ | 触发停止仿真 |
| `TextElm.java` | `text` | ❌ | 文本标注 |
| `LabeledNodeElm.java` | `label` | ❌ | 命名节点（带标签） |
| `AudioOutputElm.java` | `audio` | ❌ | 音频输出（Web Audio API） |
| `AudioInputElm.java` | `aIn` | ❌ | 音频输入 |

---

## 实现优先级

1. `ProbeElm` — Scope 的前置依赖
2. `TextElm` — 电路标注
3. `LabeledNodeElm` — 命名节点
4. `AmmeterElm` / `OhmMeterElm`
5. `AudioOutputElm` — Web Audio API 集成
6. `TestPointElm` / `PhaseCompElm`
7. `DataRecorderElm` / `StopTriggerElm`
8. `AudioInputElm`

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
