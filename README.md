# 供应商协同门户 · 前端

Vue 3 + Vite + TypeScript + Ant Design Vue，对接 `srm-portal-backend`。

## 开发

1. 先启动后端（默认端口 **30157**，与根目录 `application.yml` 一致）。
2. 安装依赖并启动：

```bash
cd srm-portal-frontend
npm install
npm run dev
```

浏览器访问 Vite 提示的地址（一般为 `http://127.0.0.1:5173`）。  
请求通过代理转发到 `VITE_API_PROXY_TARGET`（见 `.env.development`）。

## 与 PRD / 后端对应关系

| 能力 | 页面 | 后端接口 |
|------|------|----------|
| 工作台快捷入口 | `/dashboard` | — |
| 新订单列表 | `/orders` | `GET /api/collaboration/orders/new?userId=` |
| 确认/驳回订单 | `/orders/:id` | `POST .../confirm` `POST .../reject` |
| 创建 ASN | `/asn/create` | `POST /api/collaboration/asn` |
| 时间轴 | `/asn/:id` | `GET .../asn/:id` `GET .../timeline` |
| 供应商资料 | `/profile` | `GET /api/users/:id/supplier-profile` |

## MVP 登录说明

当前使用 **blade_user.id** 作为会话标识（本地存储），与后端 `operatorUserId` / `userId` 一致，便于联调；正式环境应替换为 OAuth2/SSO。
