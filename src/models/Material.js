import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Material extends Model {}

Material.init(
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0
      }
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'un'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    sequelize,
    modelName: 'Material',
    tableName: 'materials',
    timestamps: true,
    underscored: true
  }
);

export default Material;


