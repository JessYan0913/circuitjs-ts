# 模块 17 — MCP Server

> **目标**: 实现 Model Context Protocol (MCP) 服务器，允许 AI 工具与电路仿真交互。
> **优先级**: P4 — 部署与扩展
> **原始参考**: `E:\circuitjs1\app\main.js`（实验性 MCP-over-SSE）

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
| `packages/mcp-server/src/index.ts` | ✅ 完整实现 |
| `packages/mcp-server/` | ✅ 功能完备 |

---

## 已实现

- [x] **StdioTransport**（基于 `@modelcontextprotocol/sdk` 的 `McpServer`）

### 工具定义

- [x] `load_circuit` — 从文本加载电路（支持旧文本格式和 XML 格式）
- [x] `export_circuit` — 导出电路文本
- [x] `start_simulation` — 启动仿真
- [x] `stop_simulation` — 停止仿真
- [x] `get_voltage` — 查询节点电压
- [x] `step_simulation` — 单步仿真（支持 steps 或 duration 参数）
- [ ] `take_screenshot` — 截图输出（需要 Graphics/Canvas 环境，MCP 纯 CLI 环境中不可用）
- [x] `list_components` — 列出所有元件及其状态（位置、电压差、电流、功率）
- [x] `get_node_list` — 获取所有节点电压

### 集成

- [x] 与 `@circuitjs/core` 的 SimulationManager 和 Serializer 集成

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
