# EasyStay 酒店预订平台

EasyStay 是一个全栈酒店预订与管理平台，包含用户端、商家管理端和管理员审核后台三个部分。

- `mobile/`: Taro + React 18 + TypeScript 微信小程序/H5 用户端
- `admin/`: React 18 + TypeScript + Ant Design PC 管理后台（商家/管理员）
- `server/`: Node.js + Express + Sequelize + MySQL 后端 API

## 主要功能

### 用户端（mobile）

- 用户注册与登录
- 酒店浏览、搜索、筛选
- 酒店详情查看（房型、设施、位置、地图导航）
- 在线预订酒店（选择房型、入住日期、离店日期）
- 订单查询与管理
- 收藏酒店功能
- 节假日折扣自动计算

### 商家端（admin）

- 酒店信息管理（新增、编辑、下架）
- 房型与价格管理
- 订单管理（查看、确认、取消）
- 收入统计与数据可视化
  - 总收入、订单数量、已确认/待确认订单统计
  - 按酒店维度统计
- 首页广告位申请与审核状态查看

### 管理员端（admin）

- 酒店入驻申请审核（通过/拒绝 + 拒绝原因反馈）
- 酒店状态管理
- 首页广告位申请审核
- 用户与商家账号管理
- 平台数据监管与统计

## 技术栈

### 前端

- **移动端**: Taro 3.x + React 18 + TypeScript + Zustand + Sass + dayjs
- **管理端**: React 18 + TypeScript + Vite + Ant Design + React Router

### 后端

- **运行时**: Node.js
- **框架**: Express / Koa
- **数据库**: MySQL + Sequelize ORM
- **认证**: JWT
- **文件上传**: Multer

## 项目结构

```
.
├── admin/                    # React 管理后台
│   ├── src/
│   │   ├── pages/           # 酒店管理、订单管理、收入统计等页面
│   │   ├── components/      # 公共组件
│   │   ├── hooks/           # 自定义 Hooks
│   │   └── config.ts        # API 配置
│   └── package.json
├── mobile/                   # Taro 用户端
│   ├── src/
│   │   ├── pages/           # 酒店列表、详情、预订等页面
│   │   ├── components/      # 公共组件
│   │   ├── services/        # API 调用
│   │   ├── store/           # Zustand 状态管理
│   │   └── utils/           # 工具函数
│   └── package.json
├── server/                   # Express 后端 API
│   ├── models/              # Sequelize 模型定义
│   ├── routes/              # API 路由
│   ├── middleware/          # 中间件（认证、错误处理等）
│   ├── config/              # 数据库配置
│   ├── index.js             # 服务入口
│   └── package.json
└── README.md
```

## 环境要求

- Node.js 16+
- npm 8+ 或 pnpm
- MySQL 5.7 或 8.x
- 微信开发者工具（用于小程序开发）

## 快速启动

### 1. 安装依赖

```bash
# 后端
cd server
npm install

# 管理端
cd ../admin
npm install

# 移动端
cd ../mobile
npm install
```

### 2. 配置数据库与环境变量

**后端环境配置** (`server/.env`)

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=easy_stay

JWT_SECRET=dev-secret
JWT_EXPIRE=7d

PORT=3000
NODE_ENV=development
```

**管理端 API 地址** (`admin/src/config.ts`)

```typescript
export const API_BASE_URL = 'http://localhost:3000';
```

### 3. 初始化数据库

确保 MySQL 服务运行，数据库会在服务启动时自动创建和同步表结构。

如果需要手动添加审核反馈字段，执行以下 SQL：

```sql
USE easy_stay;
ALTER TABLE hotels ADD COLUMN rejectReason VARCHAR(500) DEFAULT NULL COMMENT '拒绝原因';
ALTER TABLE hotels ADD COLUMN rejectTime DATETIME DEFAULT NULL COMMENT '拒绝时间';
```

### 4. 启动服务

**启动后端**（在 `server/` 目录）

```bash
npm run dev
```

服务默认监听 `http://localhost:3000`

**启动管理端**（在 `admin/` 目录）

```bash
npm run dev
```

访问 `http://localhost:5173`

**启动移动端**（在 `mobile/` 目录）

```bash
npm run dev:weapp
```

然后在微信开发者工具中导入项目根目录。

## 核心功能说明

### 酒店审核流程

1. 商家提交酒店信息（状态：`pending`）
2. 管理员审核：
   - **通过**: 状态变为 `approved`
   - **拒绝**: 状态变为 `rejected`，并需填写拒绝原因
3. 商家可在管理端查看拒绝原因，修改后重新提交

### 收入统计

- 商家可查看自己名下酒店的总收入、订单数量
- 数据按酒店维度统计
- 支持按订单状态（已确认/待确认）统计
- 管理员可查看全平台数据

### 预订与折扣

- 用户选择房型和日期后提交预订
- 系统自动计算节假日折扣
- 支持多个节假日规则叠加（按最低折扣计算）
- 订单显示原价、折扣价、节假日名称

## API 文档

### 认证相关

- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录

### 酒店相关

- `GET /api/hotels` - 获取酒店列表（支持筛选）
- `GET /api/hotels/:id` - 获取酒店详情
- `POST /api/hotels` - 新增酒店（商家）
- `PUT /api/hotels/:id` - 编辑/审核酒店
  - 商家可编辑自己的酒店
  - 管理员可审核酒店状态和拒绝原因
- `DELETE /api/hotels/:id` - 删除酒店
- `POST /api/hotels/upload-image` - 上传酒店图片

### 预订相关

- `GET /api/bookings` - 获取预订列表
- `POST /api/bookings` - 新增预订
- `PUT /api/bookings/:id` - 更新预订状态

### 统计相关

- `GET /api/statistics/revenue` - 获取收入统计数据
  - 支持按角色过滤（admin/merchant）
  - 商家只能查看自己的数据

### 广告位相关

- `PUT /api/hotels/:id/home-ad` - 首页广告位申请/审核

## 常见问题

### Q: 如何本地测试拒绝酒店功能？

A: 
1. 用管理员账号登录管理后台
2. 进入"酒店审核"页面
3. 找到待审核的酒店，点击"拒绝酒店"
4. 在弹窗中填写拒绝原因，提交
5. 商家刷新后台，在酒店列表中能看到拒绝原因

### Q: 小程序真机调试时无法连接后端？

A: 
- 确保手机和电脑在同一局域网
- 在 `mobile/` 中将 API 地址改为电脑局域网 IP（如 `http://192.168.x.x:3000`）
- 小程序真机不支持 `localhost`

### Q: 如何重置数据库？

A: 
1. 停止后端服务
2. 执行 SQL：`DROP DATABASE easy_stay;`
3. 重启后端，会自动重新创建数据库和表

## 开发指南

### 添加新的 API 端点

1. 在 `server/routes/` 中创建或修改路由文件
2. 定义请求/响应格式
3. 在前端 `services/` 或 `hooks/` 中调用接口

### 修改数据库表

1. 修改 `server/models/` 中的模型定义
2. 重启后端服务（Sequelize 会自动同步 `alter: true`）
3. 或手动执行 `npm run db:sync`

### 前端组件开发

- 管理端使用 Ant Design 组件库
- 移动端使用 Taro 组件
- 推荐使用自定义 Hooks 抽象逻辑

## 后续优化方向

- [ ] 接入在线支付（支付宝/微信支付）
- [ ] 用户评论与评分系统
- [ ] 优惠券与营销活动
- [ ] 更多数据可视化图表
- [ ] 单元测试与集成测试
- [ ] 性能优化与缓存策略

## License

MIT
```