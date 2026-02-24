const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const sequelize = require('./config/database');
const { User, Hotel, Booking } = require('./models');

// 导入路由
const authRoutes = require('./routes/auth');
const hotelRoutes = require('./routes/hotels');
const bookingRoutes = require('./routes/bookings');
const statisticsRoutes = require('./routes/statistics');
const mapRoutes = require('./routes/map');
const holidayRoutes = require('./routes/holidays');

const app = express();
const PORT = process.env.PORT || 3000;

const ensureDatabaseExists = async () => {
  const host = process.env.DB_HOST;
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;

  if (!host || !user || !database) {
    throw new Error('数据库环境变量不完整，请检查 DB_HOST/DB_USER/DB_NAME');
  }

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: false,
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.end();
};

// ==================== 中间件配置 ====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================== API 路由 ====================
// 测试接口
app.get('/ping', (req, res) => {
  res.send('pong');
});

// 认证路由
app.use('/api/auth', authRoutes);

// 酒店路由
app.use('/api/hotels', hotelRoutes);

// 预订路由
app.use('/api/bookings', bookingRoutes);

// 统计路由
app.use('/api/statistics', statisticsRoutes);

// 地图路由
app.use('/api/map', mapRoutes);

// 节假日与活动路由
app.use('/api/holidays', holidayRoutes);

// ==================== 错误处理 ====================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    code: 500,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ==================== 数据库同步与启动 ====================
const startServer = async () => {
  try {
    await ensureDatabaseExists();
    console.log('✅ Database ensured successfully.');

    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');

    // 同步数据库（创建表）
    await sequelize.sync({ alter: true });
    console.log('✅ Database tables synchronized successfully.');

    // 启动服务器
    app.listen(PORT, () => {
      console.log(`✅ Server is running on http://localhost:${PORT}`);
      console.log(`📝 API Documentation:`);
      console.log(`   - Auth: POST /api/auth/login, /api/auth/register, /api/auth/wechat-login, /api/auth/wechat-bind`);
      console.log(`   - Hotels: GET /api/hotels, POST /api/hotels, PUT /api/hotels/:id, DELETE /api/hotels/:id`);
      console.log(`   - Bookings: GET /api/bookings, POST /api/bookings, PUT /api/bookings/:id, DELETE /api/bookings/:id`);
      console.log(`   - Statistics: GET /api/statistics/revenue`);
      console.log(`   - Map(Tencent->Baidu fallback): GET /api/map/regeo?longitude=...&latitude=...`);
      console.log(`   - Map(Tencent->Baidu fallback): GET /api/map/search?keyword=...&region=...`);
      console.log(`   - Holidays: GET /api/holidays, GET /api/holidays/manage, POST /api/holidays/sync`);
      console.log(`   - Map Keys: TENCENT_MAP_KEY, BAIDU_MAP_AK`);
    });
  } catch (error) {
    console.error('❌ Unable to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
