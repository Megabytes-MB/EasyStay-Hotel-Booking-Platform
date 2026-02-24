# EasyStay Mobile（微信小程序端）

`mobile/` 是 EasyStay 的用户端工程，基于 Taro + React + TypeScript，面向酒店浏览、筛选、详情、下单和个人中心。

## 技术栈

- Taro 3.x
- React 18
- TypeScript
- Zustand（状态管理）
- Sass
- dayjs

## 当前功能

- 首页城市选择与搜索入口
- 首页广告位酒店轮播（后端 `home-ads`）
- 城市选择页（历史记录、热门、字母索引、定位反查）
- 酒店列表筛选（价格、星级、房型、标签、日期）
- 按评分/价格/距离排序（距离排序依赖地图搜索定位）
- 酒店详情（轮播、收藏、地图、导航、房型选择）
- 预订下单（联动后端节假日折扣规则）
- 登录注册（账号密码、短信验证码、微信手机号一键登录）
- 个人中心（收藏、订单列表、订单移除）

## 目录结构

```text
mobile/
├─ config/
├─ src/
│  ├─ app.tsx
│  ├─ app.config.ts
│  ├─ config/api.ts
│  ├─ utils/request.ts
│  ├─ services/          # auth/hotel/booking/map/holiday
│  ├─ store/             # useAuthStore/useOrderStore
│  ├─ components/
│  └─ pages/             # home/list/detail/login/user/city-picker
└─ package.json
```

## 快速启动

### 1. 安装依赖

```bash
cd mobile
npm install
```

### 2. 启动后端（必须）

```bash
cd ../server
npm install
npm run dev
```

### 3. 启动小程序开发编译

```bash
cd ../mobile
npm run dev:weapp
```

### 4. 微信开发者工具导入

- 导入目录：仓库根目录（不是 `mobile/` 子目录）
- 编译输出目录：`mobile/dist`
- 项目配置：使用根目录 `project.config.json`

## 常用命令

```bash
# 微信小程序
npm run dev:weapp
npm run build:weapp

# H5（可选）
npm run dev:h5
npm run build:h5
```

## 环境配置

### API 地址

默认从 `src/config/api.ts` 读取：

- 开发：`http://localhost:3000`
- 生产：`https://your-production-api.com`（占位）

构建时可用环境变量覆盖：

```env
TARO_APP_API_BASE_URL=http://localhost:3000
```

### 地图与定位

小程序端调用后端：

- `GET /api/map/regeo`
- `GET /api/map/search`

地图 Key 必须配置在 `server/.env`（不要放到小程序前端）：

- `TENCENT_MAP_KEY`
- `BAIDU_MAP_AK`（回退方案）

### 微信与短信

以下能力依赖后端云配置：

- 微信手机号登录：`WECHAT_APPID` `WECHAT_SECRET`
- 短信验证码：`ALIBABA_CLOUD_ACCESS_KEY_ID` 等 `ALIYUN_*` 变量

## 关键页面

- `src/pages/home/index.tsx`: 首页、广告位、快捷筛选入口
- `src/pages/city-picker/index.tsx`: 城市选择、定位、字母索引
- `src/pages/list/index.tsx`: 列表筛选、排序、虚拟列表
- `src/pages/detail/index.tsx`: 详情、地图、下单、节假日折扣展示
- `src/pages/login/index.tsx`: 登录注册、验证码、微信手机号登录
- `src/pages/user/index.tsx`: 收藏与订单管理

## 常见问题

### 1. 真机请求失败

- 不要使用 `localhost`，改成电脑局域网 IP
- 手机和电脑需在同一局域网
- 小程序后台配置合法 HTTPS 域名（上线环境）

### 2. 定位失败

- 检查小程序定位授权
- 检查后端地图 Key 是否已配置
- 检查 `/api/map/regeo` 和 `/api/map/search` 是否可访问

### 3. 微信手机号登录失败

- 确认 `WECHAT_APPID`/`WECHAT_SECRET` 正确
- 确认当前在微信小程序环境，不是 H5
