// src/controllers/authController.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { User } from '../models/index.js';

class AuthController {
  // Login
  static async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      console.log('🔐 Tentativa de login:', email);

      const user = await User.findOne({ where: { email } });
      if (!user || !user.is_active) {
        console.log('❌ Usuário não encontrado ou inativo');
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      console.log('✅ Usuário encontrado:', user.email);
      console.log('🔍 Hash da senha no banco:', user.password.substring(0, 20) + '...');

      let isPasswordValid = false;

      try {
        isPasswordValid = await user.checkPassword(password);
      } catch (error) {
        console.log('❌ checkPassword falhou:', error.message);
      }

      if (!isPasswordValid) {
        try {
          isPasswordValid = await bcrypt.compare(password, user.password);
        } catch (error) {
          console.log('❌ Fallback bcrypt falhou:', error.message);
        }
      }

      if (!isPasswordValid) {
        console.log('❌ Todas as verificações falharam');
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      console.log('✅ Login bem-sucedido');

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          is_active: user.is_active
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  }

  // Meu perfil
  static async getProfile(req, res) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      res.json({ success: true, user });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  }

  // Atualizar perfil
  static async updateProfile(req, res) {
    try {
      const { name, email, current_password, new_password } = req.body;

      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      if (email && email !== user.email) {
        const exists = await User.findOne({ where: { email } });
        if (exists) return res.status(400).json({ error: 'Email já está em uso' });
        user.email = email;
      }

      if (name) user.name = name;

      if (new_password) {
        if (!current_password)
          return res.status(400).json({ error: 'Senha atual é obrigatória' });

        let valid = false;

        try {
          valid = await user.checkPassword(current_password);
        } catch {
          valid = await bcrypt.compare(current_password, user.password);
        }

        if (!valid) return res.status(400).json({ error: 'Senha atual incorreta' });

        user.password = new_password;
      }

      await user.save();

      const updatedUser = await User.findByPk(user.id, {
        attributes: { exclude: ['password'] }
      });

      res.json({
        success: true,
        message: 'Perfil atualizado com sucesso',
        user: updatedUser
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  }

  // Verificar token
  static async verifyToken(req, res) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] }
      });

      res.json({
        success: true,
        user,
        valid: true
      });
    } catch (error) {
      console.error('Verify token error:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  }

  // Alterar senha
  static async changePassword(req, res) {
    try {
      const { current_password, new_password } = req.body;

      if (!current_password || !new_password) {
        return res
          .status(400)
          .json({ error: 'Senha atual e nova senha são obrigatórias' });
      }

      if (new_password.length < 6) {
        return res
          .status(400)
          .json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
      }

      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      let valid = false;

      try {
        valid = await user.checkPassword(current_password);
      } catch {
        valid = await bcrypt.compare(current_password, user.password);
      }

      if (!valid) {
        return res.status(400).json({ error: 'Senha atual incorreta' });
      }

      user.password = new_password;
      await user.save();

      res.json({
        success: true,
        message: 'Senha alterada com sucesso'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  }
}

// ✔️ Export ES Modules
export default AuthController;
