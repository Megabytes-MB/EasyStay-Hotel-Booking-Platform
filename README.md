# EasyStay Hotel Booking Platform

EasyStay 是一个酒店预订平台示例项目，包含三端：

- `server/`: Node.js + Express + Sequelize + MySQL 后端 API
- `admin/`: React + Vite + Ant Design 管理后台（管理员/商户）
- `mobile/`: Taro + React 微信小程序用户端

当前仓库以 `server` 作为统一数据源，`admin` 和 `mobile` 都直接调用后端接口。

## 当前能力概览

- 多角色账号体系：`admin`、`merchant`、`user`
- 酒店管理与审核
- 首页广告位申请与审核（商户申请、管理员审核）
- 预订下单/查询/状态变更
- 节假日活动规则管理与自动同步（`/api/holidays/sync`）
- 节假日折扣价计算（按日命中最低折扣规则）
- 地图逆地理/地点搜索（腾讯地图，超限时可回退百度地图）
- 小程序手机号验证码注册、微信手机号一键登录

## 目录结构

```text
.
├─ admin/                     # React 管理后台
├─ mobile/                    # Taro 小程序端
├─ server/                    # Express API + Sequelize 模型
├─ packages/shared/           # 预留共享目录（当前为空）
├─ project.config.json        # 微信开发者工具项目配置（根目录导入）
└─ README.md
```

## 环境要求

- Node.js 18+
- npm 9+
- MySQL 8.x（或兼容版本）

## 快速启动

### 1. 安装依赖

```bash
cd server && npm install
cd ../admin && npm install
cd ../mobile && npm install
```

### 2. 配置后端环境变量

```bash
cd server
cp .env.example .env
```

至少需要正确配置以下变量：

- 数据库：`DB_HOST` `DB_PORT` `DB_NAME` `DB_USER` `DB_PASSWORD`
- JWT：`JWT_SECRET`
- 地图：`TENCENT_MAP_KEY`（建议）和/或 `BAIDU_MAP_AK`

可选能力变量：

- 微信登录：`WECHAT_APPID` `WECHAT_SECRET`
- 阿里云短信验证码：`ALIBABA_CLOUD_ACCESS_KEY_ID` 等 `ALIYUN_*`
- 法定节假日同步源：`HOLIDAY_SYNC_URL_TEMPLATE`

### 3. 启动后端

```bash
cd server
npm run dev
```

默认监听 `http://localhost:3000`。服务启动时会自动：

- 检查并创建数据库（若不存在）
- 执行 Sequelize `sync({ alter: true })`

### 4. 启动管理后台

```bash
cd admin
npm run dev
```

默认地址 `http://localhost:5173`。

### 5. 启动小程序编译

```bash
cd mobile
npm run dev:weapp
```

然后在微信开发者工具导入仓库根目录（使用根目录 `project.config.json`）。

## 常用脚本

### server

- `npm run dev`: nodemon 启动
- `npm run start`: node 启动
- `npm run db:sync`: 手动同步数据库结构

### admin

- `npm run dev`: 开发模式
- `npm run build`: TypeScript 构建检查 + Vite 打包
- `npm run preview`: 预览构建产物

### mobile

- `npm run dev:weapp`: 微信小程序开发编译
- `npm run build:weapp`: 微信小程序生产构建
- `npm run dev:h5`: H5 开发编译
- `npm run build:h5`: H5 生产构建

## API 概览

- 认证：`/api/auth/*`
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/send-code`
  - `POST /api/auth/wechat-login`
- 酒店：`/api/hotels/*`
  - 列表/详情/增删改
  - 图片上传
  - 星级更新
  - 首页广告位申请与审核
- 预订：`/api/bookings/*`
- 统计：`GET /api/statistics/revenue`
- 地图：`/api/map/regeo`、`/api/map/search`
- 节假日：`/api/holidays/*`、`POST /api/holidays/sync`

## 已知注意事项

- `admin/src/config.ts` 中 `API_BASE_URL` 当前写死为 `http://localhost:3000`。
- 小程序真机调试时不要使用 `localhost`，请改为局域网 IP 并保证手机和电脑同网段。
- 短信验证码、微信手机号登录依赖真实云配置，未配置时仅能使用账号密码流程。

## License

MIT
