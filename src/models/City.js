// src/models/city.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';


const City = sequelize.define('City', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: {
        msg: 'O nome da cidade é obrigatório'
      },
      len: {
        args: [2, 100],
        msg: 'O nome deve ter entre 2 e 100 caracteres'
      }
    }
  },
  km_rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      isDecimal: {
        msg: 'A taxa por KM deve ser um número decimal'
      },
      min: {
        args: [0.01],
        msg: 'A taxa por KM deve ser maior que zero'
      }
    },
    comment: 'Valor por quilômetro'
  },
  state: {
    type: DataTypes.STRING(2),
    allowNull: false,
    validate: {
      len: {
        args: [2, 2],
        msg: 'O estado deve ter exatamente 2 caracteres'
      },
      isUppercase: {
        msg: 'O estado deve estar em maiúsculas'
      }
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'cities',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default City;
