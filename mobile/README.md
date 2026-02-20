# EasyStay Mobile（微信小程序端）

## 项目介绍

`mobile/` 是 EasyStay 的用户端小程序工程，基于 Taro + React + TypeScript 开发，主要面向酒店浏览、搜索筛选、下单预订和个人中心场景。

当前版本已支持：
- 首页广告位酒店展示
- 城市选择页（搜索/历史/热门/字母索引）
- 进入城市页自动定位
- 酒店列表筛选（房型、价格、日期）
- 酒店详情、收藏、下单

## 技术栈

- Taro 3.x（微信小程序/H5）
- React 18 + TypeScript
- Zustand（状态管理）
- Sass（样式）
- dayjs（日期处理）

## 项目结构

```text
mobile/
├── config/                      # Taro 构建配置（dev/prod）
├── src/
│   ├── app.tsx                  # 应用入口
│   ├── app.config.ts            # 小程序路由与全局配置
│   ├── config/api.ts            # API 路径常量
│   ├── services/                # 业务请求层（auth/hotel/booking/map）
│   ├── store/                   # 状态管理（auth/order）
│   ├── components/              # 公共组件
│   └── pages/                   # 页面（home/list/detail/login/user/city-picker）
└── package.json
```

## 快速开始

### 1. 安装依赖

```bash
cd mobile
npm install
```

### 2. 启动后端

```bash
cd server
npm install
npm run dev
```

### 3. 启动小程序编译

```bash
cd mobile
npm run dev:weapp
```

### 4. 微信开发者工具导入

- 导入目录：项目根目录（包含 `project.config.json`）
- 编译输出目录：`mobile/dist`
- AppID：测试号或你自己的小程序 AppID

## 常用命令

```bash
# 微信小程序开发
npm run dev:weapp

# 微信小程序打包
npm run build:weapp

# H5 开发/打包（可选）
npm run dev:h5
npm run build:h5
```

## 接口与环境配置

移动端请求基于 `mobile/src/utils/request.ts`，默认读取 `mobile/src/config/api.ts` 的 `API_BASE_URL`。

若你希望通过环境变量覆盖 API 地址，可在构建时注入：

```env
TARO_APP_API_BASE_URL=http://localhost:3000
```

### 定位与城市识别说明

- 小程序端通过 `Taro.getLocation` 获取经纬度
- 后端接口 `GET /api/map/regeo` 负责逆地理编码
- 当前为腾讯位置服务服务端模式，需在 `server/.env` 配置：

```env
TENCENT_MAP_KEY=你的腾讯位置服务Key
```

注意：`TENCENT_MAP_KEY` 配在服务端，不放到小程序前端代码里。

## 关键页面

- `src/pages/home/index.tsx`：首页与目的地入口
- `src/pages/city-picker/index.tsx`：城市选择页与定位逻辑
- `src/pages/list/index.tsx`：酒店列表与筛选
- `src/pages/detail/index.tsx`：酒店详情、地图、预订
- `src/pages/user/index.tsx`：我的页面与订单入口

## 常见问题

### 1) 小程序请求失败：`url not in domain list`

开发阶段可在微信开发者工具勾选“不校验合法域名”。  
上线前需在小程序后台配置合法 HTTPS 域名。

### 2) 定位失败或定位不准

- 先确认小程序定位权限已开启
- 确认后端已配置 `TENCENT_MAP_KEY`
- 确认后端 `/api/map/regeo` 可访问

### 3) 本机调试正常，真机请求失败

- 不要使用 `localhost`，改为电脑局域网 IP（如 `http://192.168.1.100:3000`）
- 手机和电脑需在同一局域网
