// src/routes/sync.js
import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import SyncManager from '../utils/syncQueue.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

// Aplicar autenticação em todas as rotas
router.use(authMiddleware);

// Sincronizar dados pendentes
router.post('/push', [
  body('operations').isArray()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { operations } = req.body;
  const results = [];

  for (const op of operations) {
    try {
      const result = await SyncManager.addToQueue(
        op.operation,
        op.table,
        op.data,
        req.user.id
      );

      results.push({
        id: op.local_id,
        success: true,
        server_id: result.id
      });
    } catch (error) {
      results.push({
        id: op.local_id,
        success: false,
        error: error.message
      });
    }
  }

  res.json({ results });
});

// Buscar dados atualizados
router.get('/pull', async (req, res) => {
  try {
    const { last_sync } = req.query;
    const lastSyncDate = last_sync ? new Date(last_sync) : new Date(0);

    const updates = {
      services: [],
      materials: [],
      cities: [],
      service_materials: []
    };

    res.json({
      last_sync: new Date().toISOString(),
      updates
    });
  } catch (error) {
    console.error('Erro no sync pull:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Export default para ES Modules
export default router;
