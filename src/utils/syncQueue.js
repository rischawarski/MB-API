import { SyncQueue } from '../models/index.js';
import { Op } from 'sequelize';

class SyncManager {
  static async addToQueue(operation, tableName, data, userId) {
    try {
      return await SyncQueue.create({
        operation,
        table_name: tableName,
        data: JSON.stringify(data),
        user_id: userId,
        synced: false
      });
    } catch (error) {
      console.error('Erro ao adicionar na fila de sync:', error);
      throw error;
    }
  }

  static async getPendingOperations(userId, limit = 50) {
    try {
      return await SyncQueue.findAll({
        where: {
          user_id: userId,
          synced: false
        },
        order: [['created_at', 'ASC']],
        limit
      });
    } catch (error) {
      console.error('Erro ao buscar operações pendentes:', error);
      throw error;
    }
  }

  static async markAsSynced(queueIds) {
    try {
      return await SyncQueue.update(
        {
          synced: true,
          synced_at: new Date()
        },
        {
          where: { id: queueIds }
        }
      );
    } catch (error) {
      console.error('Erro ao marcar como sincronizado:', error);
      throw error;
    }
  }

  static async cleanupSynced(daysOld = 7) {
    try {
      const date = new Date();
      date.setDate(date.getDate() - daysOld);

      return await SyncQueue.destroy({
        where: {
          synced: true,
          created_at: { [Op.lt]: date }
        }
      });
    } catch (error) {
      console.error('Erro ao limpar sync antigos:', error);
      throw error;
    }
  }
}

export default SyncManager;
