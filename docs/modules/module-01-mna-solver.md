# 模块 1 — MNA 矩阵求解器

> **目标**: 改进节点分析（MNA）矩阵构建、LU 分解求解、瞬态仿真迭代控制。
> **优先级**: P0 — 核心仿真正确性
> **原始 Java 源码位置**: `E:\circuitjs1\src\com\lushprojects\circuitjs1\client\`

---

## 原始 Java → 目标 TS

| Java | TS | 状态 |
|------|-----|------|
| `CirSim.java` (矩阵部分) | `packages/core/circuit/SimulationManager.ts` | ✅ 已实现 |
| `RowInfo.java` | `packages/core/matrix/RowInfo.ts` | ✅ 已实现 |
| `Diode.java` | `packages/core/components/active/DiodeModel.ts` | ✅ 已实现 |
| `Inductor.java` | (在 `InductorComponent.ts` 内联伴随模型) | ✅ 已实现 |
| — | `packages/core/matrix/MNAMatrix.ts` | ✅ 已实现 |
| — | `packages/core/matrix/LUSolver.ts` | ✅ 已实现 |
| — | `packages/core/circuit/StampContextImpl.ts` | ✅ 已实现 |

---

## 当前实现状态

### MNA 矩阵 (MNAMatrix)
- [x] 稠密矩阵 `Float64Array` 行优先存储
- [x] `stampResistor` / `stampConductance`
- [x] `stampVoltageSource` / `stampCurrentSource`
- [x] `stampCCCS` / `stampVCCurrentSource` / `stampVCVS`
- [x] `simplify()` — 消去 ROW_CONST 行（浮空节点折叠）
- [x] `saveOrig()` / `resetToOrig()` — 非线性迭代矩阵恢复
- [x] `markNonLinear()` / `markRightSideChanging()`
- [x] `updateVoltageSource()`

### LU 求解器 (LUSolver)
- [x] Crout 方法 LU 分解 + 选主元
- [x] 前代/回代求解
- [x] 奇异性容错（极小值填充）

### 仿真管理器 (SimulationManager)
- [x] `analyzeCircuit()` — 节点分配、矩阵构建、stamp 流程
- [x] `assignNodeNumbers()` — 基于坐标的节点编号（同 (x,y) 同节点）
- [x] `runOneStep()` — 单步仿真主循环
- [x] Newton-Raphson 迭代（非线性器件）
- [x] 自适应步长（成功 3 步翻倍，收敛失败减半）
- [x] 浮点节点稳定（大电阻 100MΩ 接地）
- [x] 电压源电流回读（`applySolvedVoltages`）
- [x] 节点电压保存/恢复（`saveNodeVoltages` / `restoreNodeVoltages`）
- [x] 电流动画更新（`updateCurrentAnimation`）

### 待完善确认

| 项目 | 状态 | 说明 |
|------|------|------|
| **`RowInfo.type` 枚举值** | ✅ 已确认 | `ROW_NORMAL=0`, `ROW_CONST=1`（Java 无 `ROW_CURRENT`，已移除） |
| **`converged` 阈值** | ✅ 已确认 | Java CirSim 在 Diode/limitStep 中使用 `0.01` 阈值；无矩阵级 `1e-13`/`1e-6` 检查。已添加 NaN/Infinity 矩阵检查 |
| **矩阵维度公式** | ✅ 已确认 | `circuitMatrixSize = nodeCount - 1 + voltSourceCount`，TS 端一致 |
| **LSETimeout / timeoutCount** | ❌ 不存在 | Java 源码中无此机制 | 不对照 |
| **梯形积分 vs 后向欧拉切换** | ✅ 已实现 | Capacitor/Inductor 均支持 `integrationMethod` 切换（per-component `useTrapezoidal` 标记） |
| **`createMatrix()` 完整调用流程** | ✅ 已确认 | `analyzeCircuit()` → `stampCircuit()` → `simplifyMatrix()` → LU factor；`reStamp()` 在步长变化时重建 |
| **Wire 闭合优化** | ✅ 已实现 | Union-Find 合并导线连接的节点；导线不再 stamp 为电压源；电流通过 `calcWireCurrents()` 从邻居元件计算 |

### Java 对照发现的 TS 缺陷修正

| 问题 | 文件 | 修正内容 |
|------|------|----------|
| 电容后向欧拉伴随模型公式错误 | CapacitorComponent | 后向欧拉 `curSourceValue = -vd/compResistance`（无 `-current`项） |
| 电感后向欧拉伴随模型公式错误 | InductorComponent | 后向欧拉 `curSourceValue = current`（无 `vd/compResistance`项） |
| 导线作为 0V 电压源 stamp | WireComponent → SimulationManager | 改为 Union-Find 合并节点，导线不再 stamp |
| 缺少 NaN/Infinity 矩阵检查 | SimulationManager | Newton-Raphson 循环中添加矩阵 NaN/Infinity 检查 |
| `ROW_CURRENT=2` 多余枚举值 | shared/types.ts | 已移除（Java RowInfo 无此值） |

---

## 实现笔记

- 非线性器件（二极管、BJT）需要 `nonLinear() = true` 标记
- 瞬态分析流程：`analyzeCircuit()` → `runOneStep()` 循环
  - `startIteration()` → 伴随模型预计算
  - Newton-Raphson: `stamp()` → `doStep()` → `luFactor()` → `luSolve()` → `applySolvedVoltages()`
- 自适应步长：步长减半重试，最多 100 次子迭代
- StampContextImpl 作为 StampContext 接口实现，包装 MNAMatrix 操作

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
