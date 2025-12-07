import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ServiceMaterial = sequelize.define('ServiceMaterial', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  service_id: { type: DataTypes.INTEGER, allowNull: false },
  material_id: { type: DataTypes.INTEGER, allowNull: false },
  quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 1 },
  unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  total_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
}, {
  tableName: 'service_materials',
  timestamps: true
});

export default ServiceMaterial; 
