# 模块 15 — 高级模型

> **目标**: 实现数学表达式解析器、二极管/晶体管模型参数库。
> **优先级**: P3 — 高级功能

---

## 原始 Java → 目标 TS

| Java | TS | 状态 |
|------|-----|------|
| `Expr.java` | (新建) `packages/core/models/Expr.ts` | ❌ |
| `DiodeModel.java` | (新建) `packages/core/models/DiodeModels.ts` | ❌ |
| `TransistorModel.java` | (新建) `packages/core/models/TransistorModels.ts` | ❌ |

---

## 15.1 Expr.java — 表达式解析器

- 支持变量、数值常量、数学函数（sin, cos, sqrt, abs, sign）
- 运算符 `+ - * / ^ %`
- 用于自定义逻辑、自定义函数元件

**实现步骤:**
- [ ] 词法分析（tokenization）
- [ ] 语法分析（递归下降 or 调车场算法）
- [ ] 求值执行
- [ ] 错误处理

---

## 15.2 DiodeModel.java

内置二极管模型库:
- [ ] 1N4148（通用开关二极管）
- [ ] 1N4001（整流二极管）
- [ ] 自定义模型参数编辑

模型参数:
```
saturationCurrent (Is), seriesResistance, emissionCoefficient (N)
breakdownVoltage, breakdownCurrent
```

---

## 15.3 TransistorModel.java

内置晶体管模型库:
- [ ] NPN 型号库（2N3904, BC547）
- [ ] PNP 型号库（2N3906, BC557）
- [ ] MOSFET 型号库
- [ ] 自定义模型参数编辑

模型参数:
```
beta (forward), beta_r (reverse), Vt (thermal voltage)
Vbe (base-emitter voltage), Va (early voltage)
```

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
