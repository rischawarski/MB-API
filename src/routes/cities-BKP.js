const express = require('express');
const { body, param, validationResult } = require('express-validator');
const CityController = require('../controllers/cityControllerBKP');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authMiddleware);

// Listar cidades
router.get('/', CityController.getCities);

// Criar cidade (apenas admin)
router.post('/', [
  body('name').notEmpty(),
  body('km_rate').isFloat({ min: 0 }),
  body('state').isLength({ min: 2, max: 2 })
], CityController.createCity);

// Atualizar cidade (apenas admin)
router.put('/:id', [
  param('id').isInt({ min: 1 }),
  body('name').optional().notEmpty(),
  body('km_rate').optional().isFloat({ min: 0 }),
  body('state').optional().isLength({ min: 2, max: 2 })
], CityController.updateCity);

module.exports = router;