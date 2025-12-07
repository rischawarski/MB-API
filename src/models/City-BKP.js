const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const City = sequelize.define('City', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  km_rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Valor por quilômetro'
  },
  state: {
    type: DataTypes.STRING(2),
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'cities'
});

module.exports = City;