import express from 'express';
import { body } from 'express-validator';

import AuthController from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/auth.js';
import { handleValidationErrors } from '../middlewares/validation.js';

const router = express.Router();

/* -------------------------- LOGIN -------------------------- */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Senha é obrigatória'),
    handleValidationErrors
  ],
  AuthController.login
);

/* ---------------------- VERIFICAR TOKEN --------------------- */
router.get('/verify', authMiddleware, AuthController.verifyToken);

/* ------------------------- MEU PERFIL ------------------------ */
router.get('/me', authMiddleware, AuthController.getProfile);

/* --------------------- ATUALIZAR PERFIL ---------------------- */
router.put(
  '/profile',
  authMiddleware,
  [
    body('name').optional().notEmpty().withMessage('Nome não pode ser vazio'),
    body('email').optional().isEmail().withMessage('Email inválido'),
    handleValidationErrors
  ],
  AuthController.updateProfile
);

/* ----------------------- ALTERAR SENHA ----------------------- */
router.put(
  '/change-password',
  authMiddleware,
  [
    body('current_password')
      .notEmpty()
      .withMessage('Senha atual é obrigatória'),

    body('new_password')
      .isLength({ min: 6 })
      .withMessage('Nova senha deve ter pelo menos 6 caracteres'),

    handleValidationErrors
  ],
  AuthController.changePassword
);

export default router;
