```markdown
# EasyStay 酒店预订管理平台

## 项目介绍

EasyStay 是一个酒店预订管理平台，包括：
- **PC 后台管理系统**（该项目）：供酒店商户和管理员使用
- 支持酒店信息管理、预订查询、收入统计等功能

## 技术栈

### 前端（Admin）
- React 18 + TypeScript
- Vite
- Ant Design
- React Router
- Axios

### 后端（Server）
- Node.js + Express
- CORS 跨域支持

## 项目结构

```
├── admin/                  # 前端管理系统
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   ├── components/    # 公共组件
│   │   ├── hooks/         # 自定义 Hooks
│   │   ├── config.ts      # 常量配置
│   │   └── App.tsx        # 应用入口
│   └── package.json
│
├── server/                 # 后端 API
│   ├── index.js           # 服务器入口
│   └── package.json
│
└── README.md
```

## 功能模块

### 1. 用户认证（5 分）
- 登录/注册功能
- 支持商户和管理员两种角色

### 2. 酒店管理（8 分）
- CRUD 操作
- 审核工作流（待审核 → 已批准/已拒绝）

### 3. 权限控制（8 分）
- 基于角色的访问控制（RBAC）
- 商户只能看自己的数据
- 管理员可以看所有数据

### 4. 预订查询（8 分）
- 查看预订列表
- 预订状态管理

### 5. 收入统计（8 分）
- 总收入统计
- 按酒店分类统计
- 数据可视化

### 6. 交互优化（8 分）
- Loading 动画
- 表单验证
- 错误提示

### 7. 代码整理（8 分）
- 常量配置
- 公共 Hooks
- 代码注释

## 快速开始

### 安装依赖

```bash
# 前端
cd admin
npm install

# 后端
cd server
npm install
```

### 启动开发

```bash
# 后端（3000 端口）
cd server
npm run dev

# 前端（5173 端口）
cd admin
npm run dev
```

### 首次使用

1. 打开 `http://localhost:5173/login`
2. 点"去注册"按钮
3. 注册一个商户账号（角色选"商户"）
4. 登录后再注册一个管理员账号（角色选"管理员"）

### 推荐账号

- 商户：`merchant1` / `123456`
- 管理员：`admin1` / `123456`


## API 文档

### 认证相关
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录

### 酒店相关
- `GET /api/hotels` - 获取酒店列表
- `POST /api/hotels` - 新增酒店
- `PUT /api/hotels/:id` - 编辑/审核酒店
- `POST /api/hotels/upload-image` - 上传酒店图片并返回 URL
- `PUT /api/hotels/:id/images` - 更新酒店图片列表
- `PUT /api/hotels/:id/star-level` - 更新酒店星级（1-5）
- `DELETE /api/hotels/:id` - 删除酒店

#### 酒店字段说明（新增/编辑）

- `rating`：住客星级，范围 `0-5`，可带小数（如 `4.6`）
- `starLevel`：酒店星级，范围 `1-5`，必须是整数（如 `4`）
- `images`：酒店图片 URL 数组（最多 20 张）

上传图片示例（商户/管理员登录后）：

```bash
curl -X POST http://localhost:3000/api/hotels/upload-image \
	-H "Authorization: Bearer <token>" \
	-F "image=@./hotel.jpg"
```

返回示例：

```json
{
	"code": 200,
	"message": "图片上传成功",
	"data": {
		"url": "http://localhost:3000/uploads/hotels/hotel-xxxx.jpg"
	}
}
```

示例：

```json
{
	"name": "易宿精选酒店·静安店",
	"city": "上海",
	"location": "静安区南京西路 100 号",
	"longitude": 121.456789,
	"latitude": 31.234567,
	"pricePerNight": 599,
	"rating": 4.7,
	"starLevel": 4,
	"images": [
		"https://example.com/hotel-1.jpg",
		"https://example.com/hotel-2.jpg"
	]
}
```

### 预订相关
- `GET /api/bookings` - 获取预订列表
- `POST /api/bookings` - 新增预订
- `PUT /api/bookings/:id` - 更新预订状态

### 统计相关
- `GET /api/statistics/revenue` - 获取收入统计

## 开发指南

### 环境变量

在 `admin/.env` 中配置：

```
VITE_API_BASE_URL=http://localhost:3000
```

### 代码规范

- 使用 TypeScript 进行类型检查
- 使用 Ant Design 组件库
- 遵循 React Hooks 最佳实践

## 部署

### 前端构建

```bash
cd admin
npm run build
```

### 后端部署

使用 PM2 或其他进程管理工具：

```bash
pm2 start server/index.js --name "easyStay-api"
```

## 后续优化方向

1. 使用真实数据库（MySQL/MongoDB）
2. 实现 JWT 认证
3. 添加图片上传功能
4. 集成支付接口
5. 小程序用户端开发
6. 单元测试和集成测试

## 许可证

MIT
```
