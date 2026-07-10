# 模块 17 — MCP Server

> **目标**: 实现 Model Context Protocol (MCP) 服务器，允许 AI 工具与电路仿真交互。
> **优先级**: P4 — 部署与扩展

---

## 原始参考

circuitjs1 `app/main.js` 中已有 MCP-over-SSE 实验性实现，提供:
- `load_circuit` — 上传电路文件
- `export_circuit` — 导出电路数据
- `start_simulation` — 启动仿真
- `stop_simulation` — 停止仿真
- `get_voltage` — 查询节点电压
- `take_screenshot` — 截图输出

---

## 目标 TS

| 文件 | 状态 |
|------|------|
| `packages/mcp-server/src/index.ts` | ❌ 仅占位符 |

---

## 待实现

- [ ] **StdioTransport**（基于 `@modelcontextprotocol/sdk`）

### 工具定义

- [ ] `load_circuit` — 从文本加载电路
- [ ] `export_circuit` — 导出电路文本
- [ ] `start_simulation` — 启动仿真
- [ ] `stop_simulation` — 停止仿真
- [ ] `get_voltage` — 查询节点电压
- [ ] `step_simulation` — 单步仿真
- [ ] `take_screenshot` — 截图输出
- [ ] `list_components` — 列出所有元件
- [ ] `get_node_list` — 获取所有节点

### 集成

- [ ] 与 `@circuitjs/core` 的 SimulationManager 集成

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
