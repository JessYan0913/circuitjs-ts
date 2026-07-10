# 模块 6 — 变压器、传输线、机电

> **目标**: 完整实现变压器、传输线、机电类元件。
> **优先级**: P1 — 模拟/数字元件补全

---

## 元件清单

| 元件 | dump type | 状态 | 说明 |
|------|-----------|------|------|
| `TransformerElm.java` | `tform` | ❌ | 变压器（互感耦合，4 post） |
| `TappedTransformerElm.java` | `tform2` | ❌ | 中心抽头变压器（5 post） |
| `CustomTransformerElm.java` | `ctrans` | ❌ | 自定义匝数比 |
| `TransLineElm.java` | `tline` | ❌ | 传输线（延迟线模型） |
| `CrystalElm.java` | `xtal` | ❌ | 晶振（RLC 串联谐振） |
| `RelayElm.java` | `relay` | ❌ | 继电器（线圈控制触点） |
| `TimeDelayRelayElm.java` | `tdrelay` | ❌ | 延时继电器 |
| `DCMotorElm.java` | `dcm` | ❌ | 直流电机 |
| `LampElm.java` | `lamp` | ❌ | 白炽灯（阻抗随温度/电流变化） |
| `LEDElm.java` | `led` | ❌ | 发光二极管 |
| `LEDArrayElm.java` | `ledarray` | ❌ | LED 阵列 |
| `SparkGapElm.java` | `spark` | ❌ | 放电间隙（击穿导通） |

---

## 变压器 MNA 关键逻辑

- **M**: 互感系数
- **K = M/√(L1·L2)**: 耦合系数
- **stamp 矩阵**: 4×4 导纳矩阵块

---

## 实现优先级

1. `Transformer` — 最常用
2. `TransLine` — 传输线模型
3. `LED` — 常用输出指示
4. `Lamp` / `Relay` / `DCMotor`
5. `Crystal` / `SparkGap`
6. `LEDArray` / `TappedTransformer` / `CustomTransformer`

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
