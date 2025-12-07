import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authMiddleware } from '../middlewares/auth.js';
import {
  getCities,
  getCityById,
  createCity,
  updateCity,
  deleteCity,
  toggleCityStatus,
  getActiveCities
} from '../controllers/cityController.js';


const router = Router();

// Aplicar autenticação em todas as rotas
router.use(authMiddleware);

// Listar cidades
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('active').optional().isIn(['true', 'false', 'all']),
  query('search').optional().trim().isLength({ min: 1, max: 100 })
], getCities);

// Obter cidade por ID
router.get('/:id', [
  param('id').isInt({ min: 1 })
], getCityById);

// Criar cidade (apenas admin)
router.post('/', [
  body('name')
    .notEmpty().withMessage('O nome da cidade é obrigatório')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('O nome deve ter entre 2 e 100 caracteres'),
  body('km_rate')
    .notEmpty().withMessage('A taxa por KM é obrigatória')
    .isFloat({ min: 0.01 }).withMessage('A taxa por KM deve ser um número positivo'),
  body('state')
    .notEmpty().withMessage('O estado é obrigatório')
    .trim()
    .isLength({ min: 2, max: 2 }).withMessage('O estado deve ter exatamente 2 caracteres')
    .isUppercase().withMessage('O estado deve estar em maiúsculas'),
  body('is_active').optional().isBoolean().toBoolean()
], createCity);

// Atualizar cidade (apenas admin)
router.put('/:id', [
  param('id').isInt({ min: 1 }),
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('O nome não pode estar vazio')
    .isLength({ min: 2, max: 100 }).withMessage('O nome deve ter entre 2 e 100 caracteres'),
  body('km_rate')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('A taxa por KM deve ser um número positivo'),
  body('state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 2 }).withMessage('O estado deve ter exatamente 2 caracteres')
    .isUppercase().withMessage('O estado deve estar em maiúsculas'),
  body('is_active').optional().isBoolean().toBoolean()
], updateCity);

// Deletar cidade (apenas admin)
router.delete('/:id', [
  param('id').isInt({ min: 1 })
], deleteCity);

// Alternar status da cidade (apenas admin)
router.patch('/:id/toggle-status', [
  param('id').isInt({ min: 1 })
], toggleCityStatus);

// Middleware para tratar erros de validação (no final)
router.use((req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
});

router.get('/active', getActiveCities);

export default router;