const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  username: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: {
      msg: '用户名已存在',
    },
    validate: {
      len: {
        args: [3, 50],
        msg: '用户名长度必须在 3-50 个字符之间',
      },
    },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('admin', 'merchant', 'user'),
    allowNull: false,
    defaultValue: 'user',
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  avatar: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  nickname: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  wechatOpenId: {
    type: DataTypes.STRING(128),
    allowNull: true,
    unique: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false,
  tableName: 'users',
  hooks: {
    // 保存前自动 hash 密码
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    // 更新前检查密码是否改变
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
  },
});

// 实例方法：验证密码
User.prototype.verifyPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// 实例方法：获取公开信息（不含密码）
User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

module.exports = User;
