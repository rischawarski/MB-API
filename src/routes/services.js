// src/routes/servicesRouter.js - VERSÃO CORRIGIDA

import express from 'express';
import { body, param, query } from 'express-validator';
import ServiceController from '../controllers/serviceController.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authMiddleware);

// ======================
// ROTAS DO WEB (React)
// ======================

// 1. ROTA PRINCIPAL PARA O WEB - DEVE SER ESTA MESMA
router.get('/', ServiceController.getAllServices);

// ======================
// ROTAS ESPECÍFICAS (DEVE VIR ANTES DAS GENÉRICAS)
// ======================

// 1. Serviços do usuário logado
router.get('/my-services', ServiceController.getUserServices);

// 2. Serviços em andamento
router.get('/current', ServiceController.getCurrentServices);

// 3. Serviços pausados  
router.get('/paused', ServiceController.getPausedServices);

// 4. Histórico com paginação
router.get('/history', ServiceController.getServiceHistory);

// 5. Estatísticas do usuário
router.get('/stats', ServiceController.getUserStats);

// 6. Dashboard/estatísticas gerais
router.get('/stats/dashboard', ServiceController.getDashboardStats);

// 7. Todos os serviços (com filtros) - RENOMEADA PARA EVITAR CONFLITO
router.get('/all', ServiceController.getAllServices);

// 8. Debug
router.get('/debug/structure', ServiceController.debugStructure);

// ======================
// ROTAS DE AÇÃO
// ======================

// 9. Iniciar serviço
router.post('/start', ServiceController.startService);

// 10. Adicionar material
router.post('/materials', ServiceController.addMaterial);

// 11. REMOVER MATERIAL - MOVER PARA CIMA DAS ROTAS COM :service_id
router.delete('/materials/:material_id', ServiceController.removeMaterialFromService);

// ======================
// ROTAS COM PARÂMETROS (DEVEM VIR DEPOIS)
// ======================

// 12. Buscar serviço por ID
router.get('/:service_id', ServiceController.getServiceById);

// 13. Atualizar serviço
router.put('/:service_id', ServiceController.updateService);

// 14. Deletar serviço
router.delete('/:service_id', ServiceController.deleteService);

// 15. Finalizar serviço
router.put('/:service_id/complete', ServiceController.completeService);

// 16. Colocar em espera
router.put('/:service_id/hold', ServiceController.putServiceOnHold);

// 17. Retomar serviço
router.put('/:service_id/resume', ServiceController.resumeService);

// 18. Adicionar nota
router.post('/:service_id/notes', ServiceController.addServiceNote);

// 19. Atualizar localização
router.put('/:service_id/location', ServiceController.updateServiceLocation);

router.put('/materials/:material_id', ServiceController.updateServiceMaterial);

// 20. Histórico de pausas de um serviço
router.get('/:service_id/history', (req, res) => {
  res.status(200).json({ 
    success: true,
    message: 'Endpoint em desenvolvimento',
    service_id: req.params.service_id 
  });
});

export default router;