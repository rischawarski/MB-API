// utils/notifications.js
class NotificationManager {
  // Notificar início de serviço
  static async notifyServiceStart(service, user) {
    try {
      console.log('🔔 NOTIFICAÇÃO: Serviço Iniciado');
      console.log('📋 Serviço:', {
        id: service.id,
        user: service.User?.name || user.name,
        city: service.City?.name,
        start_time: service.start_time
      });
      console.log(`✅ Notificação: Serviço #${service.id} iniciado por ${user.name}`);
      return true;
    } catch (error) {
      console.error('❌ Erro na notificação:', error);
      return false;
    }
  }

  static async notifyServiceCompletion(service, user) {
    try {
      console.log('🔔 NOTIFICAÇÃO: Serviço Concluído');
      console.log('📋 Serviço:', {
        id: service.id,
        user: service.User?.name || user.name,
        city: service.City?.name,
        total_value: service.total_value,
        duration: service.end_time - service.start_time
      });
      console.log(`✅ Notificação: Serviço #${service.id} concluído por ${user.name}`);
      return true;
    } catch (error) {
      console.error('❌ Erro na notificação:', error);
      return false;
    }
  }

  static async notifyServiceOnHold(service, user) {
    try {
      console.log('🔔 NOTIFICAÇÃO: Serviço em Espera');
      console.log('📋 Serviço:', {
        id: service.id,
        user: service.User?.name || user.name,
        city: service.City?.name
      });
      console.log(`✅ Notificação: Serviço #${service.id} colocado em espera por ${user.name}`);
      return true;
    } catch (error) {
      console.error('❌ Erro na notificação:', error);
      return false;
    }
  }

  static async notifyServiceResume(service, user) {
    try {
      console.log('🔔 NOTIFICAÇÃO: Serviço Retomado');
      console.log('📋 Serviço:', {
        id: service.id,
        user: service.User?.name || user.name,
        city: service.City?.name,
        resume_count: service.resume_count,
        total_km_accumulated: service.total_km_accumulated,
        additional_km: service.additional_km || 0
      });
      console.log(`✅ Notificação: Serviço #${service.id} retomado por ${user.name}`);
      console.log(`🔄 Número de retomadas: ${service.resume_count}`);
      console.log(`🚗 KM total acumulado: ${service.total_km_accumulated} km`);
      return true;
    } catch (error) {
      console.error('❌ Erro na notificação de retomada:', error);
      return false;
    }
  }

  static async notifyMaterialAdded(service, user, material, quantity) {
    try {
      console.log('🔔 NOTIFICAÇÃO: Material Adicionado');
      console.log('📋 Detalhes:', {
        service_id: service.id,
        user: user.name,
        material: material.name,
        quantity: quantity,
        unit_price: material.price,
        total_price: quantity * material.price
      });
      console.log(`✅ Notificação: Material "${material.name}" adicionado ao serviço #${service.id}`);
      return true;
    } catch (error) {
      console.error('❌ Erro na notificação de material:', error);
      return false;
    }
  }

  static async notifyServiceError(service, user, error) {
    try {
      console.log('🔔 NOTIFICAÇÃO: Erro no Serviço');
      console.log('❌ Erro:', {
        service_id: service?.id,
        user: user?.name,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      console.log(`⚠️ Notificação: Erro no serviço #${service?.id} - ${error.message}`);
      return true;
    } catch (notificationError) {
      console.error('❌ Erro na notificação de erro:', notificationError);
      return false;
    }
  }

  static async notifyServiceUpdate(service, user, updates) {
    try {
      console.log('🔔 NOTIFICAÇÃO: Serviço Atualizado');
      console.log('📋 Atualizações:', {
        service_id: service.id,
        user: user.name,
        updates: updates,
        timestamp: new Date().toISOString()
      });
      console.log(`✅ Notificação: Serviço #${service.id} atualizado por ${user.name}`);
      return true;
    } catch (error) {
      console.error('❌ Erro na notificação de atualização:', error);
      return false;
    }
  }

  static async notifyAdmin(eventType, data) {
    try {
      console.log('🔔 NOTIFICAÇÃO ADMIN: Atividade Importante');
      console.log('📋 Evento:', {
        type: eventType,
        data: data,
        timestamp: new Date().toISOString()
      });
      console.log(`📢 Notificação Admin: ${eventType} - ${JSON.stringify(data)}`);
      return true;
    } catch (error) {
      console.error('❌ Erro na notificação admin:', error);
      return false;
    }
  }

  static async notifyDailyStats(stats) {
    try {
      console.log('🔔 NOTIFICAÇÃO: Estatísticas Diárias');
      console.log('📊 Estatísticas:', {
        date: new Date().toLocaleDateString('pt-BR'),
        total_services: stats.total_services,
        completed_services: stats.completed_services,
        in_progress_services: stats.in_progress_services,
        on_hold_services: stats.on_hold_services,
        total_revenue: stats.total_revenue
      });
      console.log(`📈 Estatísticas do dia: ${stats.completed_services} serviços concluídos`);
      return true;
    } catch (error) {
      console.error('❌ Erro na notificação de estatísticas:', error);
      return false;
    }
  }

  static async notifyUserServiceStatus(service, user, status) {
    try {
      console.log('🔔 NOTIFICAÇÃO USUÁRIO: Status do Serviço');
      console.log('📋 Status:', {
        service_id: service.id,
        user: user.name,
        status: status,
        timestamp: new Date().toISOString()
      });
      console.log(`📱 Notificação usuário: Serviço #${service.id} - ${status}`);
      return true;
    } catch (error) {
      console.error('❌ Erro na notificação do usuário:', error);
      return false;
    }
  }
}

export default NotificationManager;
