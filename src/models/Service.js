import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Service = sequelize.define(
  'Service',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    city_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    start_time: {
      type: DataTypes.DATE,
      allowNull: false
    },

    end_time: {
      type: DataTypes.DATE,
      allowNull: true
    },

    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'on_hold'),
      defaultValue: 'pending'
    },

    total_km: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },

    total_value: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },

    location_lat: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },

    location_lng: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },

    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
observation: {
  type: DataTypes.JSON, // Mude de TEXT para JSON
  allowNull: true,
  defaultValue: [] // Array vazio por padrão
},

    // CONTROLE DE PAUSAS
    pause_history: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },

    resume_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },

    total_km_accumulated: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    }
  },
  {
    tableName: 'services',
    timestamps: true
  }
);

export default Service;
