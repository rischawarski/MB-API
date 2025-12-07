import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SyncQueue = sequelize.define('SyncQueue', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  operation: { type: DataTypes.STRING, allowNull: false },
  table_name: { type: DataTypes.STRING, allowNull: false },
  data: { type: DataTypes.JSON, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  synced: { type: DataTypes.BOOLEAN, defaultValue: false },
  synced_at: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'sync_queue',
  timestamps: true
});

export default SyncQueue; // ✅ default export
