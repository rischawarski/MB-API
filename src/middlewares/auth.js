import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token de acesso não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    }

    req.user = user;
    next();

  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

export const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Acesso negado. Requer permissão de administrador.'
    });
  }

  next();
};
