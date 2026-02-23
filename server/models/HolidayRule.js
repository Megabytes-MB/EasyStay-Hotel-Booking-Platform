const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const HolidayRule = sequelize.define(
  'HolidayRule',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    holidayType: {
      type: DataTypes.ENUM('official', 'custom', 'campaign'),
      allowNull: false,
      defaultValue: 'custom',
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    discountRate: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: false,
      defaultValue: 0.9,
      validate: {
        min: 0.01,
        max: 1,
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    isAutoSynced: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    source: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'manual',
    },
    sourceUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    syncYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'holiday_rules',
    timestamps: false,
    indexes: [
      { fields: ['startDate', 'endDate'] },
      { fields: ['isActive'] },
      { fields: ['holidayType'] },
      { fields: ['source', 'syncYear'] },
    ],
  }
);

module.exports = HolidayRule;

