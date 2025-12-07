// models/User.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import bcrypt from 'bcryptjs';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  name: {
    type: DataTypes.STRING,
    allowNull: false
  },

  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },

  password: {
    type: DataTypes.STRING,
    allowNull: false
  },

  role: {
    type: DataTypes.ENUM('admin', 'user'),
    defaultValue: 'user'
  },

  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'users',

  hooks: {
    async beforeCreate(user) {
      if (user.password && !user.password.startsWith('$2a$')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },

    async beforeUpdate(user) {
      if (user.changed('password') && !user.password.startsWith('$2a$')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

// ➤ Método de instância para checar senha
User.prototype.checkPassword = async function (password) {
  if (!password || !this.password) return false;

  try {
    return await bcrypt.compare(password, this.password);
  } catch {
    return false;
  }
};

export default User;
