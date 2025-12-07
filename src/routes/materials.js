import express from 'express';
import { body, param } from 'express-validator';

import MaterialController from '../controllers/materialController.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authMiddleware);

// Listar materiais
router.get('/', MaterialController.getMaterials);

// Obter material por ID
router.get(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID inválido')],
  MaterialController.getMaterialById
);

// Criar material (apenas admin)
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Nome é obrigatório'),
    body('price').isFloat({ min: 0 }).withMessage('Preço inválido'),
    body('unit').optional().isString(),
    body('description').optional().isString(),
    body('is_active').optional().isBoolean()
  ],
  MaterialController.createMaterial
);

// Atualizar material (apenas admin)
router.put(
  '/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    body('name').optional().notEmpty(),
    body('price').optional().isFloat({ min: 0 }),
    body('unit').optional().isString(),
    body('description').optional().isString(),
    body('is_active').optional().isBoolean()
  ],
  MaterialController.updateMaterial
);

// Deletar material (apenas admin)
router.delete(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID inválido')],
  MaterialController.deleteMaterial
);

// Alternar status do material (apenas admin)
router.patch(
  '/:id/toggle-status',
  [param('id').isInt({ min: 1 }).withMessage('ID inválido')],
  MaterialController.toggleMaterialStatus
);

router.get('/active', MaterialController.getActiveMaterials); 

export default router;
