const User = require('./User');
const Hotel = require('./Hotel');
const Booking = require('./Booking');
const HolidayRule = require('./HolidayRule');

// 定义模型关联
User.hasMany(Hotel, {
  foreignKey: 'merchantId',
  as: 'hotels',
  onDelete: 'CASCADE',
});

Hotel.belongsTo(User, {
  foreignKey: 'merchantId',
  as: 'merchant',
});

Hotel.hasMany(Booking, {
  foreignKey: 'hotelId',
  as: 'bookings',
  onDelete: 'CASCADE',
});

Booking.belongsTo(Hotel, {
  foreignKey: 'hotelId',
  as: 'hotel',
});

User.hasMany(Booking, {
  foreignKey: 'userId',
  as: 'bookings',
  onDelete: 'SET NULL',
});

Booking.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// 导出模型
module.exports = {
  User,
  Hotel,
  Booking,
  HolidayRule,
};
