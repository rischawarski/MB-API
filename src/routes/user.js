import express from 'express';
import { body, param, query } from 'express-validator';

import UserController from '../controllers/userController.js';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.js';

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authMiddleware);
router.use(adminMiddleware); // Apenas admin acessa estas rotas

// Listar usuários
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('role').optional().isIn(['admin', 'user']),
    query('active').optional().isBoolean()
  ],
  UserController.getUsers
);

// Estatísticas de usuários
router.get('/stats', UserController.getUserStats);

// Buscar usuário por ID
router.get(
  '/:id',
  [param('id').isInt({ min: 1 })],
  UserController.getUserById
);

// Criar usuário
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Nome é obrigatório'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Senha deve ter pelo menos 6 caracteres'),
    body('role')
      .optional()
      .isIn(['admin', 'user'])
      .withMessage('Role deve ser admin ou user')
  ],
  UserController.createUser
);

// Atualizar usuário
router.put(
  '/:id',
  [
    param('id').isInt({ min: 1 }),
    body('name').optional().notEmpty().withMessage('Nome não pode ser vazio'),
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('role')
      .optional()
      .isIn(['admin', 'user'])
      .withMessage('Role deve ser admin ou user'),
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active deve ser booleano'),
    body('password')
      .optional()
      .isLength({ min: 6 })
      .withMessage('Senha deve ter pelo menos 6 caracteres')
  ],
  UserController.updateUser
);

// Alternar status do usuário
router.patch(
  '/:id/toggle-status',
  [param('id').isInt({ min: 1 })],
  UserController.toggleUserStatus
);

// Deletar usuário
router.delete(
  '/:id',
  [param('id').isInt({ min: 1 })],
  UserController.deleteUser
);

export default router;
