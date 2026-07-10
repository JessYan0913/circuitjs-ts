# 模块 1 — MNA 矩阵求解器

> **目标**: 改进节点分析（MNA）矩阵构建、LU 分解求解、瞬态仿真迭代控制。
> **优先级**: P0 — 核心仿真正确性

---

## 原始 Java → 目标 TS

| Java | TS | 状态 |
|------|-----|------|
| `CirSim.java` (矩阵部分) | `packages/core/circuit/SimulationManager.ts` | ✅ 核心 |
| `RowInfo.java` | `packages/core/matrix/RowInfo.ts` | ✅ |
| `Diode.java` | (在 `DiodeComponent.ts` 内联) | ✅ |
| `Inductor.java` | (在 `InductorComponent.ts` 内联) | ✅ |
| — | `packages/core/matrix/MNAMatrix.ts` | ✅ |
| — | `packages/core/matrix/LUSolver.ts` | ✅ |

---

## 当前状态

核心数值计算已基本实现。

- [x] LU 分解（选主元）
- [x] MNA 矩阵构建和 stamp
- [x] `simplifyMatrix()` — 消去已知电流行
- [x] Newton-Raphson 迭代（非线性器件）
- [x] 自适应步长
- [x] 浮点节点稳定（大电阻接地）

---

## 待完善确认

- [ ] **`RowInfo.type` 枚举值完全一致**: `ROW_NORMAL=0`, `ROW_CONST=1`, `ROW_CURRENT=2`
- [ ] **`converged` 阈值确认**: 应为 `1e-7`
- [ ] **矩阵维度公式**: `circuitMatrixSize = nodeCount + voltSourceCount`（确认 TS 端一致）
- [ ] **LSETimeout / timeoutCount** — 仿真卡死时的超时退出保护
- [ ] **梯形积分 vs 后向欧拉切换** — 影响电感和电容的 companion 模型
- [ ] **`createMatrix()` 完整调用流程** — 何时新建、何时复用

---

## 实现笔记

- 非线性器件（二极管、BJT）需要 `nonLinear() = true` 标记
- 瞬态分析流程：`beginStep()` → `stamp()` → `solve()` → `doIteration()` 循环直到收敛
- 自适应步长：步长减半重试

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
