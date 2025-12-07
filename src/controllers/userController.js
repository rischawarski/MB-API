// src/controllers/userController.js
import { User } from '../models/index.js';
import { body, param, validationResult } from 'express-validator';

export default class UserController {
  // Listar todos os usuários (apenas admin)
  static async getUsers(req, res) {
    try {
      const { page = 1, limit = 10, role, active } = req.query;
      const where = {};

      if (role) where.role = role;
      if (active !== undefined) where.is_active = active === 'true';

      const users = await User.findAll({
        where,
        attributes: { exclude: ['password'] },
        order: [['name', 'ASC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      });

      const total = await User.count({ where });

      res.json({
        success: true,
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  }

  // Buscar usuário por ID (apenas admin)
  static async getUserById(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id, { attributes: { exclude: ['password'] } });

      if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

      res.json({ success: true, user });
    } catch (error) {
      console.error('Get user by id error:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  }

  // Criar usuário (apenas admin)
  static async createUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { name, email, password, role } = req.body;

      const userExists = await User.findOne({ where: { email } });
      if (userExists) return res.status(400).json({ error: 'Email já cadastrado' });

      const user = await User.create({
        name,
        email,
        password,
        role: role || 'user'
      });

      const userResponse = await User.findByPk(user.id, { attributes: { exclude: ['password'] } });

      res.status(201).json({
        success: true,
        message: 'Usuário criado com sucesso',
        user: userResponse
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  }

  // Atualizar usuário (apenas admin)
  static async updateUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { id } = req.params;
      const { name, email, role, is_active, password } = req.body;

      const user = await User.findByPk(id);
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

      if (email && email !== user.email) {
        const emailExists = await User.findOne({ where: { email } });
        if (emailExists) return res.status(400).json({ error: 'Email já está em uso' });
        user.email = email;
      }

      if (name) user.name = name;
      if (role) user.role = role;
      if (is_active !== undefined) user.is_active = is_active;
      if (password) user.password = password;

      await user.save();

      const userResponse = await User.findByPk(user.id, { attributes: { exclude: ['password'] } });

      res.json({
        success: true,
        message: 'Usuário atualizado com sucesso',
        user: userResponse
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  }

  // Desativar/Ativar usuário (apenas admin)
  static async toggleUserStatus(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id);
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

      if (parseInt(id) === req.user.id)
        return res.status(400).json({ error: 'Não é possível desativar sua própria conta' });

      user.is_active = !user.is_active;
      await user.save();

      res.json({
        success: true,
        message: `Usuário ${user.is_active ? 'ativado' : 'desativado'} com sucesso`,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          is_active: user.is_active
        }
      });
    } catch (error) {
      console.error('Toggle user status error:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  }

  // Deletar usuário (apenas admin)
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id);
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

      if (parseInt(id) === req.user.id)
        return res.status(400).json({ error: 'Não é possível deletar sua própria conta' });

      await user.destroy();

      res.json({ success: true, message: 'Usuário deletado com sucesso' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  }

  // Estatísticas de usuários (apenas admin)
  static async getUserStats(req, res) {
    try {
      const totalUsers = await User.count();
      const activeUsers = await User.count({ where: { is_active: true } });
      const adminUsers = await User.count({ where: { role: 'admin', is_active: true } });
      const regularUsers = await User.count({ where: { role: 'user', is_active: true } });

      const recentUsers = await User.findAll({
        attributes: { exclude: ['password'] },
        order: [['created_at', 'DESC']],
        limit: 5
      });

      res.json({
        success: true,
        stats: { total_users: totalUsers, active_users: activeUsers, admin_users: adminUsers, regular_users: regularUsers },
        recent_users: recentUsers
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  }
}
