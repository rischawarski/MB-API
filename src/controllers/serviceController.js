// src/controllers/serviceController.js
import { Service, ServiceMaterial, Material, City, User } from '../models/index.js';
import CalculationService from '../utils/calculations.js';
import NotificationManager from '../utils/notifications.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';

export default class ServiceController {
  // Métodos que JÁ EXISTEM (mantenha como estão)
  static async startService(req, res) {
    try {
      const { city_id, location_lat, location_lng, address, total_km } = req.body;

      if (!city_id) {
        return res.status(400).json({ error: 'Cidade é obrigatória' });
      }

      const service = await Service.create({
        user_id: req.user.id,
        city_id,
        start_time: new Date(),
        status: 'in_progress',
        location_lat: location_lat ?? null,
        location_lng: location_lng ?? null,
        address: address ?? '',
        total_km: total_km ?? 0,
        total_km_accumulated: total_km ?? 0,
        resume_count: 0,
        pause_history: []
      });

      const serviceWithRelations = await Service.findByPk(service.id, {
        include: [
          { 
            model: City,
            as: 'City' // 🔴 ADICIONADO
          },
          { 
            model: User, 
            as: 'User', // 🔴 ADICIONADO
            attributes: ['id', 'name', 'email'] 
          }
        ]
      });

      try {
        await NotificationManager.notifyServiceStart(serviceWithRelations, req.user);
      } catch (notificationError) {
        console.warn('Erro na notificação (não crítico):', notificationError.message);
      }

      res.status(201).json({
        success: true,
        message: 'Serviço iniciado com sucesso',
        service: serviceWithRelations
      });
    } catch (error) {
      console.error('Erro ao iniciar serviço:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor ao iniciar serviço' });
    }
  }

  static async addMaterial(req, res) {
    try {
      const { service_id, material_id, quantity } = req.body;

      const service = await Service.findByPk(service_id);
      if (!service) return res.status(404).json({ error: 'Serviço não encontrado' });
      if (service.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const material = await Material.findByPk(material_id);
      if (!material) return res.status(404).json({ error: 'Material não encontrado' });

      const existingMaterial = await ServiceMaterial.findOne({ where: { service_id, material_id } });
      let serviceMaterial;

      if (existingMaterial) {
        const unit_price = material.price;
        const total_price = CalculationService.calculateMaterialTotal(
          parseFloat(existingMaterial.quantity) + parseFloat(quantity),
          unit_price
        );
        existingMaterial.quantity += parseFloat(quantity);
        existingMaterial.total_price = total_price;
        await existingMaterial.save();
        serviceMaterial = existingMaterial;
      } else {
        const unit_price = material.price;
        const total_price = CalculationService.calculateMaterialTotal(quantity, unit_price);
        serviceMaterial = await ServiceMaterial.create({
          service_id,
          material_id,
          quantity,
          unit_price,
          total_price
        });
      }

      await ServiceController.updateServiceTotal(service_id);

      res.status(201).json({
        ...serviceMaterial.toJSON(),
        action: existingMaterial ? 'updated' : 'created'
      });
    } catch (error) {
      console.error('Erro ao adicionar material:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async completeService(req, res) {
    try {
      const { service_id } = req.params;
      const service = await Service.findByPk(service_id, {
        include: [
          { 
            model: ServiceMaterial, 
            as: 'ServiceMaterials', 
            include: [{ model: Material, as: 'Material' }] // 🔴 ADICIONADO
          },
          { 
            model: City,
            as: 'City' // 🔴 ADICIONADO
          },
          { 
            model: User,
            as: 'User' // 🔴 ADICIONADO
          }
        ]
      });

      if (!service) return res.status(404).json({ error: 'Serviço não encontrado' });
      if (service.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });

      service.status = 'completed';
      service.end_time = new Date();

      const totals = CalculationService.calculateServiceTotal(service, service.ServiceMaterials);
      service.total_value = totals.total_value;
      await service.save();

      await NotificationManager.notifyServiceCompletion(service, req.user);

      res.json(service);
    } catch (error) {
      console.error('Erro ao finalizar serviço:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async putServiceOnHold(req, res) {
    try {
      const { service_id } = req.params;
      const { reason } = req.body;

      const service = await Service.findByPk(service_id);
      if (!service) return res.status(404).json({ error: 'Serviço não encontrado' });
      if (service.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });

      let pauseHistory = Array.isArray(service.pause_history) ? service.pause_history : [];

      pauseHistory.push({
        paused_at: new Date(),
        paused_by: req.user.id,
        reason: reason ?? '',
        previous_km: service.total_km_accumulated ?? service.total_km,
        resumed_at: null
      });

      service.status = 'on_hold';
      service.pause_history = pauseHistory;
      await service.save();

      const serviceWithRelations = await Service.findByPk(service.id, { 
        include: [
          { model: City, as: 'City' }, // 🔴 ADICIONADO
          { model: User, as: 'User' } // 🔴 ADICIONADO
        ] 
      });
      await NotificationManager.notifyServiceOnHold(serviceWithRelations, req.user);

      res.json(service);
    } catch (error) {
      console.error('Erro ao colocar serviço em espera:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async resumeService(req, res) {
    try {
      const serviceId = req.params.service_id || req.params.id;
      if (!serviceId) return res.status(400).json({ success: false, error: 'ID do serviço é obrigatório' });

      const additionalKmValue = parseFloat(req.body.additional_km ?? 0);
      if (isNaN(additionalKmValue) || additionalKmValue < 0) {
        return res.status(400).json({ success: false, error: 'Quilometragem adicional inválida' });
      }

      const service = await Service.findByPk(serviceId, { 
        include: [
          { model: City, as: 'City' }, // 🔴 ADICIONADO
          { model: User, as: 'User' } // 🔴 ADICIONADO
        ] 
      });
      if (!service) return res.status(404).json({ success: false, error: 'Serviço não encontrado' });
      if (service.status !== 'on_hold') return res.status(400).json({ success: false, error: 'Serviço não está pausado' });
      if (service.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Acesso negado' });

      let pauseHistory = Array.isArray(service.pause_history) ? service.pause_history : [];

      const lastPauseIndex = pauseHistory.length - 1;
      if (lastPauseIndex >= 0 && pauseHistory[lastPauseIndex] && !pauseHistory[lastPauseIndex].resumed_at) {
        pauseHistory[lastPauseIndex] = {
          ...pauseHistory[lastPauseIndex],
          resumed_at: new Date(),
          additional_km: additionalKmValue,
          resumed_by: req.user.id
        };
      } else {
        pauseHistory.push({
          paused_at: new Date(),
          resumed_at: new Date(),
          additional_km: additionalKmValue,
          reason: 'Retomada automática',
          paused_by: req.user.id,
          resumed_by: req.user.id
        });
      }

      service.status = 'in_progress';
      service.pause_history = pauseHistory;
      service.resume_count = (parseInt(service.resume_count ?? 0)) + 1;
      service.total_km_accumulated = (parseFloat(service.total_km_accumulated ?? service.total_km ?? 0)) + additionalKmValue;

      await service.save();
      try { await NotificationManager.notifyServiceResume(service, req.user); } catch (e) {}

      res.json({
        success: true,
        message: 'Serviço retomado com sucesso',
        service,
        additional_km: additionalKmValue,
        total_km_accumulated: service.total_km_accumulated
      });
    } catch (error) {
      console.error('Erro ao retomar serviço:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor ao retomar serviço' });
    }
  }

  // ==============================================
  // NOVOS MÉTODOS ESSENCIAIS - CORRIGIDOS
  // ==============================================

  // 1. LISTAR TODOS OS SERVIÇOS
  static async getAllServices(req, res) {
    try {
      const { 
        status, 
        city, 
        technician, 
        location,
        dateFrom,
        dateTo 
      } = req.query;
      
      const whereClause = {};
      const includeClause = [
        { 
          model: City,
          as: 'City' // 🔴 ADICIONADO
        },
        { 
          model: User, 
          as: 'User', // 🔴 ADICIONADO
          attributes: ['id', 'name', 'email'] 
        },
        { 
          model: ServiceMaterial, 
          as: 'ServiceMaterials', // 🔴 JÁ EXISTE
          include: [{ 
            model: Material,
            as: 'Material' // 🔴 ADICIONADO
          }]
        }
      ];
      
      // Filtro por status
      if (status && status !== 'all') {
        whereClause.status = status;
      }
      
      // Filtro por cidade (via nome da cidade)
      if (city) {
        includeClause[0].where = { name: { [Op.like]: `%${city}%` } };
      }
      
      // Filtro por técnico (via nome do usuário)
      if (technician) {
        includeClause[1].where = { name: { [Op.like]: `%${technician}%` } };
      }
      
      // Filtro por local/endereço
      if (location) {
        whereClause.address = { [Op.like]: `%${location}%` };
      }
      
      // Filtro por data
      if (dateFrom || dateTo) {
        whereClause.start_time = {};
        if (dateFrom) whereClause.start_time[Op.gte] = new Date(dateFrom);
        if (dateTo) whereClause.start_time[Op.lte] = new Date(dateTo);
      }
      
      const services = await Service.findAll({
        where: whereClause,
        include: includeClause,
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: services,
        filters: req.query,
        count: services.length
      });
    } catch (error) {
      console.error('Erro ao listar serviços:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor ao listar serviços' 
      });
    }
  }

  // 2. BUSCAR SERVIÇO POR ID - CORRIGIDO
  static async getServiceById(req, res) {
    try {
      const { service_id } = req.params;

      const service = await Service.findByPk(service_id, {
        include: [
          { 
            model: City,
            as: 'City' // 🔴 ADICIONADO
          },
          { 
            model: User, 
            as: 'User', // 🔴 ADICIONADO
            attributes: ['id', 'name', 'email'] 
          },
          { 
            model: ServiceMaterial, 
            as: 'ServiceMaterials', // 🔴 JÁ EXISTE
            include: [{ 
              model: Material,
              as: 'Material' // 🔴 ADICIONADO
            }]
          }
        ]
      });

      if (!service) {
        return res.status(404).json({ 
          success: false, 
          error: 'Serviço não encontrado' 
        });
      }

      // Converte para objeto simples para garantir
      const serviceData = service.get({ plain: true });
      
      // DEBUG - Remova depois
      console.log('📋 Service ID:', service_id);
      console.log('📋 Observation field:', serviceData.observation);
      console.log('📋 Type:', typeof serviceData.observation);
      
      // Se observation for string JSON, parseia
      if (serviceData.observation && typeof serviceData.observation === 'string') {
        try {
          serviceData.observation = JSON.parse(serviceData.observation);
        } catch (error) {
          console.warn('⚠️ Não foi possível parsear observation como JSON:', error);
        }
      }

      res.json({
        success: true,
        data: serviceData
      });
    } catch (error) {
      console.error('Erro ao buscar serviço:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor ao buscar serviço' 
      });
    }
  }

  // 3. ATUALIZAR SERVIÇO - CORRIGIDO
  static async updateService(req, res) {
    try {
      const { service_id } = req.params;
      const updateData = req.body;

      console.log('📝 Atualizando serviço:', service_id, updateData);

      const service = await Service.findByPk(service_id);
      if (!service) {
        return res.status(404).json({ 
          success: false, 
          error: 'Serviço não encontrado' 
        });
      }

      // Campos que podem ser atualizados (adicione mais conforme necessário)
      const allowedFields = [
        'address', 
        'city_id', 
        'status', 
        'total_km',
        'priority',
        'observation',
        'customer_name',
        'description'
      ];
      
      const filteredData = {};
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          // Se for observation, mantém como array/JSON
          if (field === 'observation') {
            filteredData[field] = updateData[field];
          } else {
            filteredData[field] = updateData[field];
          }
        }
      });

      // Se houver dados para atualizar
      if (Object.keys(filteredData).length > 0) {
        await service.update(filteredData);
      }

      // Recalcular totais se KM ou materiais mudaram
      if (updateData.total_km !== undefined) {
        await ServiceController.updateServiceTotal(service_id);
      }

      // Buscar serviço atualizado com relações
      const updatedService = await Service.findByPk(service_id, {
        include: [
          { 
            model: City,
            as: 'City' // 🔴 ADICIONADO
          },
          { 
            model: User, 
            as: 'User', // 🔴 ADICIONADO
            attributes: ['id', 'name', 'email'] 
          },
          { 
            model: ServiceMaterial, 
            as: 'ServiceMaterials', // 🔴 JÁ EXISTE
            include: [{ 
              model: Material,
              as: 'Material' // 🔴 ADICIONADO
            }]
          }
        ]
      });

      res.json({
        success: true,
        message: 'Serviço atualizado com sucesso',
        data: updatedService
      });
    } catch (error) {
      console.error('Erro ao atualizar serviço:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor ao atualizar serviço' 
      });
    }
  }

  // 4. DELETAR SERVIÇO
  static async deleteService(req, res) {
    try {
      const { service_id } = req.params;

      const service = await Service.findByPk(service_id);
      if (!service) {
        return res.status(404).json({ 
          success: false, 
          error: 'Serviço não encontrado' 
        });
      }

      // Primeiro deleta os materiais associados
      await ServiceMaterial.destroy({ where: { service_id } });

      // Depois deleta o serviço
      await service.destroy();

      res.json({
        success: true,
        message: 'Serviço deletado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao deletar serviço:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor ao deletar serviço' 
      });
    }
  }

  // 5. DASHBOARD/ESTATÍSTICAS - CORRIGIDO
  static async getDashboardStats(req, res) {
    try {
      const services = await Service.findAll({
        include: [
          { 
            model: City,
            as: 'City' // 🔴 ADICIONADO
          },
          { 
            model: User,
            as: 'User' // 🔴 ADICIONADO
          },
          { 
            model: ServiceMaterial, 
            as: 'ServiceMaterials', // 🔴 JÁ EXISTE
            include: [{ 
              model: Material,
              as: 'Material' // 🔴 ADICIONADO
            }]
          }
        ]
      });

      const stats = {
        total: services.length,
        completed: services.filter(s => s.status === 'completed').length,
        in_progress: services.filter(s => s.status === 'in_progress').length,
        on_hold: services.filter(s => s.status === 'on_hold').length,
        
        total_km: services.reduce((sum, s) => sum + (s.total_km_accumulated || s.total_km || 0), 0),
        total_revenue: 0,
        
        by_city: {},
        by_technician: {}
      };

      // Calcula receita total
      services.forEach(service => {
        const cityRate = service.City?.km_rate || 0;
        const km = service.total_km_accumulated || service.total_km || 0;
        const materialsTotal = (service.ServiceMaterials || []).reduce(
          (sum, m) => sum + (parseFloat(m.total_price) || 0), 0
        );
        
        stats.total_revenue += (km * cityRate) + materialsTotal;
        
        // Agrupa por cidade
        const cityName = service.City?.name || 'Desconhecida';
        stats.by_city[cityName] = (stats.by_city[cityName] || 0) + 1;
        
        // Agrupa por técnico
        const techName = service.User?.name || 'Desconhecido';
        stats.by_technician[techName] = (stats.by_technician[techName] || 0) + 1;
      });

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor ao obter estatísticas' 
      });
    }
  }

  // Método auxiliar já existente
  static async updateServiceTotal(service_id) {
    try {
      const service = await Service.findByPk(service_id, {
        include: [{
          model: ServiceMaterial,
          as: 'ServiceMaterials' // 🔴 ADICIONADO
        }]
      });

      if (service) {
        const totals = CalculationService.calculateServiceTotal(
          service, 
          service.ServiceMaterials
        );
        await service.update({
          total_value: totals.total_value,
          materials_value: totals.materials_value
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar total do serviço:', error);
    }
  }

  static async debugStructure(req, res) {
    try {
      const service = await Service.findOne({
        include: [
          { 
            model: City,
            as: 'City' // 🔴 ADICIONADO
          },
          { 
            model: User,
            as: 'User' // 🔴 ADICIONADO
          },
          { 
            model: ServiceMaterial, 
            as: 'ServiceMaterials', // 🔴 JÁ EXISTE
            include: [{ 
              model: Material,
              as: 'Material' // 🔴 ADICIONADO
            }]
          }
        ]
      });
      
      if (!service) {
        return res.json({
          message: 'Nenhum serviço encontrado para debug',
          structure: 'Vazio'
        });
      }
      
      res.json({
        message: 'Estrutura do primeiro serviço',
        data: service,
        plain: service.get({ plain: true })
      });
    } catch (error) {
      console.error('Erro no debug:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getUserServices(req, res) {
    try {
      const userId = req.user.id;
      
      const services = await Service.findAll({
        where: { user_id: userId },
        include: [
          { 
            model: City,
            as: 'City' // 🔴 ADICIONADO
          },
          { 
            model: User, 
            as: 'User', // 🔴 ADICIONADO
            attributes: ['id', 'name', 'email'] 
          },
          { 
            model: ServiceMaterial, 
            as: 'ServiceMaterials', // 🔴 JÁ EXISTE
            include: [{ 
              model: Material,
              as: 'Material' // 🔴 ADICIONADO
            }]
          }
        ],
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: services,
        count: services.length
      });
    } catch (error) {
      console.error('Erro ao listar serviços do usuário:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor ao listar serviços do usuário' 
      });
    }
  }

  // Serviços em andamento do usuário - CORRIGIDO
  static async getCurrentServices(req, res) {
    try {
      const userId = req.user.id;
      
      const services = await Service.findAll({
        where: { 
          user_id: userId,
          status: 'in_progress'
        },
        include: [
          { 
            model: City,
            as: 'City' // 🔴 ADICIONADO
          },
          { 
            model: User, 
            as: 'User', // 🔴 ADICIONADO
            attributes: ['id', 'name', 'email'] 
          }
        ],
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: services,
        count: services.length
      });
    } catch (error) {
      console.error('Erro ao listar serviços em andamento:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  }

  // Serviços pausados do usuário - CORRIGIDO
  static async getPausedServices(req, res) {
    try {
      const userId = req.user.id;
      
      const services = await Service.findAll({
        where: { 
          user_id: userId,
          status: 'on_hold'
        },
        include: [
          { 
            model: City,
            as: 'City' // 🔴 ADICIONADO
          },
          { 
            model: User, 
            as: 'User', // 🔴 ADICIONADO
            attributes: ['id', 'name', 'email'] 
          }
        ],
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: services,
        count: services.length
      });
    } catch (error) {
      console.error('Erro ao listar serviços pausados:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  }

  // Histórico de serviços (com paginação) - CORRIGIDO
  static async getServiceHistory(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, status } = req.query;
      const offset = (page - 1) * limit;
      
      const whereClause = { user_id: userId };
      
      // Filtrar por status se especificado
      if (status) {
        whereClause.status = status;
      } else {
        // Por padrão, mostra serviços finalizados
        whereClause.status = 'completed';
      }
      
      const { count, rows } = await Service.findAndCountAll({
        where: whereClause,
        include: [
          { 
            model: City,
            as: 'City' // 🔴 ADICIONADO
          },
          { 
            model: User, 
            as: 'User', // 🔴 ADICIONADO
            attributes: ['id', 'name', 'email'] 
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Erro ao listar histórico de serviços:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  }

  // Estatísticas do usuário - CORRIGIDO
  static async getUserStats(req, res) {
    try {
      const userId = req.user.id;
      
      // Total de serviços
      const totalServices = await Service.count({
        where: { user_id: userId }
      });
      
      // Serviços completados
      const completedServices = await Service.count({
        where: { 
          user_id: userId,
          status: 'completed'
        }
      });
      
      // Serviços em andamento
      const inProgressServices = await Service.count({
        where: { 
          user_id: userId,
          status: 'in_progress'
        }
      });
      
      // Serviços pausados
      const onHoldServices = await Service.count({
        where: { 
          user_id: userId,
          status: 'on_hold'
        }
      });
      
      // Quilometragem total
      const totalKm = await Service.sum('total_km_accumulated', {
        where: { user_id: userId }
      }) || 0;
      
      // Serviços por mês (últimos 6 meses)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const servicesByMonth = await Service.findAll({
        where: {
          user_id: userId,
          created_at: { [Op.gte]: sixMonthsAgo }
        },
        attributes: [
          [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m'), 'month'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['month'],
        order: [['month', 'DESC']],
        raw: true
      });

      res.json({
        success: true,
        data: {
          totals: {
            all: totalServices,
            completed: completedServices,
            in_progress: inProgressServices,
            on_hold: onHoldServices,
            km: parseFloat(totalKm) || 0
        },
        by_month: servicesByMonth,
        completion_rate: totalServices > 0 
          ? Math.round((completedServices / totalServices) * 100) 
          : 0
        }
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  }

  // Adicionar observação ao serviço - CORRIGIDO
  static async addServiceNote(req, res) {
    try {
      const { service_id } = req.params;
      const { note } = req.body;
      
      if (!note || note.trim() === '') {
        return res.status(400).json({ 
          success: false, 
          error: 'A observação não pode estar vazia' 
        });
      }
      
      const service = await Service.findByPk(service_id);
      if (!service) {
        return res.status(404).json({ 
          success: false, 
          error: 'Serviço não encontrado' 
        });
      }
      
      // Verifica se o usuário tem permissão
      if (service.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          error: 'Acesso negado' 
        });
      }
      
      // HISTÓRICO DE OBSERVAÇÕES (JSON)
      let observations = service.observation || [];
      
      // Se for string, tenta parsear (para compatibilidade)
      if (typeof observations === 'string') {
        try {
          observations = JSON.parse(observations);
        } catch {
          // Se não for JSON válido, começa novo array
          observations = [];
        }
      }
      
      // Garante que é um array
      if (!Array.isArray(observations)) {
        observations = [];
      }
      
      // Adiciona nova observação ao histórico
      observations.push({
        note: note.trim(),
        created_by: req.user.id,
        created_at: new Date(),
        user_name: req.user.name || req.user.email
      });
      
      // Salva o array atualizado
      service.observation = observations;
      await service.save();
      
      res.json({
        success: true,
        message: 'Observação adicionada com sucesso',
        data: { 
          observations,
          count: observations.length 
        }
      });
    } catch (error) {
      console.error('Erro ao adicionar observação:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  }

  // Atualizar localização do serviço
  static async updateServiceLocation(req, res) {
    try {
      const { service_id } = req.params;
      const { location_lat, location_lng, address } = req.body;
      
      const service = await Service.findByPk(service_id);
      if (!service) {
        return res.status(404).json({ 
          success: false, 
          error: 'Serviço não encontrado' 
        });
      }
      
      // Verifica se o usuário tem permissão
      if (service.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          error: 'Acesso negado' 
        });
      }
      
      // Atualiza a localização
      const updateData = {};
      if (location_lat !== undefined) updateData.location_lat = location_lat;
      if (location_lng !== undefined) updateData.location_lng = location_lng;
      if (address !== undefined) updateData.address = address;
      
      await service.update(updateData);
      
      res.json({
        success: true,
        message: 'Localização atualizada com sucesso',
        data: service
      });
    } catch (error) {
      console.error('Erro ao atualizar localização:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  }

  static async removeMaterialFromService(req, res) {
    try {
      const { material_id } = req.params;
      
      // Encontra e remove o ServiceMaterial
      const serviceMaterial = await ServiceMaterial.findByPk(material_id);
      if (!serviceMaterial) {
        return res.status(404).json({ 
          success: false, 
          error: 'Material do serviço não encontrado' 
        });
      }
      
      // Verifica permissão
      const service = await Service.findByPk(serviceMaterial.service_id);
      if (!service) {
        return res.status(404).json({ 
          success: false, 
          error: 'Serviço não encontrado' 
        });
      }
      
      if (service.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          error: 'Acesso negado' 
        });
      }
      
      // Remove o material
      await serviceMaterial.destroy();
      
      // Atualiza totais do serviço
      await ServiceController.updateServiceTotal(service.id);
      
      res.json({
        success: true,
        message: 'Material removido do serviço com sucesso'
      });
    } catch (error) {
      console.error('Erro ao remover material do serviço:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  }

  static async updateServiceMaterial(req, res) {
    try {
      const { material_id } = req.params;
      const { quantity } = req.body;
      
      console.log(`✏️ Atualizando material ${material_id}:`, quantity);
      
      if (!quantity || quantity <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Quantidade inválida' 
        });
      }
      
      // Encontra o ServiceMaterial
      const serviceMaterial = await ServiceMaterial.findByPk(material_id, {
        include: [{ 
          model: Material,
          as: 'Material' // 🔴 ADICIONADO
        }]
      });
      
      if (!serviceMaterial) {
        return res.status(404).json({ 
          success: false, 
          error: 'Material do serviço não encontrado' 
        });
      }
      
      // Verifica permissão
      const service = await Service.findByPk(serviceMaterial.service_id);
      if (!service) {
        return res.status(404).json({ 
          success: false, 
          error: 'Serviço não encontrado' 
        });
      }
      
      if (service.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          error: 'Acesso negado' 
        });
      }
      
      // Atualiza quantidade
      serviceMaterial.quantity = parseFloat(quantity);
      serviceMaterial.total_price = serviceMaterial.unit_price * parseFloat(quantity);
      await serviceMaterial.save();
      
      // Atualiza totais do serviço
      await ServiceController.updateServiceTotal(service.id);
      
      // Busca material atualizado com relacionamentos
      const updatedMaterial = await ServiceMaterial.findByPk(material_id, {
        include: [{ 
          model: Material,
          as: 'Material' // 🔴 ADICIONADO
        }]
      });
      
      res.json({
        success: true,
        message: 'Quantidade atualizada com sucesso',
        data: updatedMaterial
      });
    } catch (error) {
      console.error('Erro ao atualizar quantidade do material:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  }
}



// // src/controllers/serviceController.js
// import { Service, ServiceMaterial, Material, City, User } from '../models/index.js';
// import CalculationService from '../utils/calculations.js';
// import NotificationManager from '../utils/notifications.js';
// import { Op } from 'sequelize';
// import sequelize from '../config/database.js';

// export default class ServiceController {
//   // Métodos que JÁ EXISTEM (mantenha como estão)
//   static async startService(req, res) {
//     try {
//       const { city_id, location_lat, location_lng, address, total_km } = req.body;

//       if (!city_id) {
//         return res.status(400).json({ error: 'Cidade é obrigatória' });
//       }

//       const service = await Service.create({
//         user_id: req.user.id,
//         city_id,
//         start_time: new Date(),
//         status: 'in_progress',
//         location_lat: location_lat ?? null,
//         location_lng: location_lng ?? null,
//         address: address ?? '',
//         total_km: total_km ?? 0,
//         total_km_accumulated: total_km ?? 0,
//         resume_count: 0,
//         pause_history: []
//       });

//       const serviceWithRelations = await Service.findByPk(service.id, {
//         include: [
//           { model: City },
//           { model: User, attributes: ['id', 'name', 'email'] }
//         ]
//       });

//       try {
//         await NotificationManager.notifyServiceStart(serviceWithRelations, req.user);
//       } catch (notificationError) {
//         console.warn('Erro na notificação (não crítico):', notificationError.message);
//       }

//       res.status(201).json({
//         success: true,
//         message: 'Serviço iniciado com sucesso',
//         service: serviceWithRelations
//       });
//     } catch (error) {
//       console.error('Erro ao iniciar serviço:', error);
//       res.status(500).json({ success: false, error: 'Erro interno do servidor ao iniciar serviço' });
//     }
//   }

//   static async addMaterial(req, res) {
//     try {
//       const { service_id, material_id, quantity } = req.body;

//       const service = await Service.findByPk(service_id);
//       if (!service) return res.status(404).json({ error: 'Serviço não encontrado' });
//       if (service.user_id !== req.user.id && req.user.role !== 'admin') {
//         return res.status(403).json({ error: 'Acesso negado' });
//       }

//       const material = await Material.findByPk(material_id);
//       if (!material) return res.status(404).json({ error: 'Material não encontrado' });

//       const existingMaterial = await ServiceMaterial.findOne({ where: { service_id, material_id } });
//       let serviceMaterial;

//       if (existingMaterial) {
//         const unit_price = material.price;
//         const total_price = CalculationService.calculateMaterialTotal(
//           parseFloat(existingMaterial.quantity) + parseFloat(quantity),
//           unit_price
//         );
//         existingMaterial.quantity += parseFloat(quantity);
//         existingMaterial.total_price = total_price;
//         await existingMaterial.save();
//         serviceMaterial = existingMaterial;
//       } else {
//         const unit_price = material.price;
//         const total_price = CalculationService.calculateMaterialTotal(quantity, unit_price);
//         serviceMaterial = await ServiceMaterial.create({
//           service_id,
//           material_id,
//           quantity,
//           unit_price,
//           total_price
//         });
//       }

//       await ServiceController.updateServiceTotal(service_id);

//       res.status(201).json({
//         ...serviceMaterial.toJSON(),
//         action: existingMaterial ? 'updated' : 'created'
//       });
//     } catch (error) {
//       console.error('Erro ao adicionar material:', error);
//       res.status(500).json({ error: 'Erro interno do servidor' });
//     }
//   }

//   static async completeService(req, res) {
//     try {
//       const { service_id } = req.params;
//       const service = await Service.findByPk(service_id, {
//         include: [
//           { model: ServiceMaterial, as: 'ServiceMaterials', include: [Material] },
//           City,
//           User
//         ]
//       });

//       if (!service) return res.status(404).json({ error: 'Serviço não encontrado' });
//       if (service.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });

//       service.status = 'completed';
//       service.end_time = new Date();

//       const totals = CalculationService.calculateServiceTotal(service, service.ServiceMaterials);
//       service.total_value = totals.total_value;
//       await service.save();

//       await NotificationManager.notifyServiceCompletion(service, req.user);

//       res.json(service);
//     } catch (error) {
//       console.error('Erro ao finalizar serviço:', error);
//       res.status(500).json({ error: 'Erro interno do servidor' });
//     }
//   }

//   static async putServiceOnHold(req, res) {
//     try {
//       const { service_id } = req.params;
//       const { reason } = req.body;

//       const service = await Service.findByPk(service_id);
//       if (!service) return res.status(404).json({ error: 'Serviço não encontrado' });
//       if (service.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });

//       let pauseHistory = Array.isArray(service.pause_history) ? service.pause_history : [];

//       pauseHistory.push({
//         paused_at: new Date(),
//         paused_by: req.user.id,
//         reason: reason ?? '',
//         previous_km: service.total_km_accumulated ?? service.total_km,
//         resumed_at: null
//       });

//       service.status = 'on_hold';
//       service.pause_history = pauseHistory;
//       await service.save();

//       const serviceWithRelations = await Service.findByPk(service.id, { include: [City, User] });
//       await NotificationManager.notifyServiceOnHold(serviceWithRelations, req.user);

//       res.json(service);
//     } catch (error) {
//       console.error('Erro ao colocar serviço em espera:', error);
//       res.status(500).json({ error: 'Erro interno do servidor' });
//     }
//   }

//   static async resumeService(req, res) {
//     try {
//       const serviceId = req.params.service_id || req.params.id;
//       if (!serviceId) return res.status(400).json({ success: false, error: 'ID do serviço é obrigatório' });

//       const additionalKmValue = parseFloat(req.body.additional_km ?? 0);
//       if (isNaN(additionalKmValue) || additionalKmValue < 0) {
//         return res.status(400).json({ success: false, error: 'Quilometragem adicional inválida' });
//       }

//       const service = await Service.findByPk(serviceId, { include: [City, User] });
//       if (!service) return res.status(404).json({ success: false, error: 'Serviço não encontrado' });
//       if (service.status !== 'on_hold') return res.status(400).json({ success: false, error: 'Serviço não está pausado' });
//       if (service.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Acesso negado' });

//       let pauseHistory = Array.isArray(service.pause_history) ? service.pause_history : [];

//       const lastPauseIndex = pauseHistory.length - 1;
//       if (lastPauseIndex >= 0 && pauseHistory[lastPauseIndex] && !pauseHistory[lastPauseIndex].resumed_at) {
//         pauseHistory[lastPauseIndex] = {
//           ...pauseHistory[lastPauseIndex],
//           resumed_at: new Date(),
//           additional_km: additionalKmValue,
//           resumed_by: req.user.id
//         };
//       } else {
//         pauseHistory.push({
//           paused_at: new Date(),
//           resumed_at: new Date(),
//           additional_km: additionalKmValue,
//           reason: 'Retomada automática',
//           paused_by: req.user.id,
//           resumed_by: req.user.id
//         });
//       }

//       service.status = 'in_progress';
//       service.pause_history = pauseHistory;
//       service.resume_count = (parseInt(service.resume_count ?? 0)) + 1;
//       service.total_km_accumulated = (parseFloat(service.total_km_accumulated ?? service.total_km ?? 0)) + additionalKmValue;

//       await service.save();
//       try { await NotificationManager.notifyServiceResume(service, req.user); } catch (e) {}

//       res.json({
//         success: true,
//         message: 'Serviço retomado com sucesso',
//         service,
//         additional_km: additionalKmValue,
//         total_km_accumulated: service.total_km_accumulated
//       });
//     } catch (error) {
//       console.error('Erro ao retomar serviço:', error);
//       res.status(500).json({ success: false, error: 'Erro interno do servidor ao retomar serviço' });
//     }
//   }

//   // ==============================================
//   // NOVOS MÉTODOS ESSENCIAIS
//   // ==============================================

//   // 1. LISTAR TODOS OS SERVIÇOS
//  static async getAllServices(req, res) {
//   try {
//     const { 
//       status, 
//       city, 
//       technician, 
//       location,
//       dateFrom,
//       dateTo 
//     } = req.query;
    
//     const whereClause = {};
//     const includeClause = [
//       { model: City },
//       { model: User, attributes: ['id', 'name', 'email'] },
//       { 
//         model: ServiceMaterial, 
//         as: 'ServiceMaterials',
//         include: [Material]
//       }
//     ];
    
//     // Filtro por status
//     if (status && status !== 'all') {
//       whereClause.status = status;
//     }
    
//     // Filtro por cidade (via nome da cidade)
//     if (city) {
//       includeClause[0].where = { name: { [Op.like]: `%${city}%` } };
//     }
    
//     // Filtro por técnico (via nome do usuário)
//     if (technician) {
//       includeClause[1].where = { name: { [Op.like]: `%${technician}%` } };
//     }
    
//     // Filtro por local/endereço
//     if (location) {
//       whereClause.address = { [Op.like]: `%${location}%` };
//     }
    
//     // Filtro por data
//     if (dateFrom || dateTo) {
//       whereClause.start_time = {};
//       if (dateFrom) whereClause.start_time[Op.gte] = new Date(dateFrom);
//       if (dateTo) whereClause.start_time[Op.lte] = new Date(dateTo);
//     }
    
//     const services = await Service.findAll({
//       where: whereClause,
//       include: includeClause,
//       order: [['created_at', 'DESC']]
//     });

//     res.json({
//       success: true,
//       data: services,
//       filters: req.query,
//       count: services.length
//     });
//   } catch (error) {
//     console.error('Erro ao listar serviços:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Erro interno do servidor ao listar serviços' 
//     });
//   }
// }

//   // 2. BUSCAR SERVIÇO POR ID
//  // NO serviceController.js - MÉTODO getServiceById
// static async getServiceById(req, res) {
//   try {
//     const { service_id } = req.params;

//     const service = await Service.findByPk(service_id, {
//       // Não precisa de 'attributes' - findByPk já retorna tudo
//       include: [
//         { model: City },
//         { model: User, attributes: ['id', 'name', 'email'] },
//         { 
//           model: ServiceMaterial, 
//           as: 'ServiceMaterials',
//           include: [Material]
//         }
//       ]
//     });

//     if (!service) {
//       return res.status(404).json({ 
//         success: false, 
//         error: 'Serviço não encontrado' 
//       });
//     }

//     // Converte para objeto simples para garantir
//     const serviceData = service.get({ plain: true });
    
//     // DEBUG - Remova depois
//     console.log('📋 Service ID:', service_id);
//     console.log('📋 Observation field:', serviceData.observation);
//     console.log('📋 Type:', typeof serviceData.observation);
    
//     // Se observation for string JSON, parseia
//     if (serviceData.observation && typeof serviceData.observation === 'string') {
//       try {
//         serviceData.observation = JSON.parse(serviceData.observation);
//       } catch (error) {
//         console.warn('⚠️ Não foi possível parsear observation como JSON:', error);
//       }
//     }

//     res.json({
//       success: true,
//       data: serviceData
//     });
//   } catch (error) {
//     console.error('Erro ao buscar serviço:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Erro interno do servidor ao buscar serviço' 
//     });
//   }
// }

//   // 
  
//   // 3. ATUALIZAR SERVIÇO
// static async updateService(req, res) {
//   try {
//     const { service_id } = req.params;
//     const updateData = req.body;

//     console.log('📝 Atualizando serviço:', service_id, updateData);

//     const service = await Service.findByPk(service_id);
//     if (!service) {
//       return res.status(404).json({ 
//         success: false, 
//         error: 'Serviço não encontrado' 
//       });
//     }

//     // Campos que podem ser atualizados (adicione mais conforme necessário)
//     const allowedFields = [
//       'address', 
//       'city_id', 
//       'status', 
//       'total_km',
//       'priority',
//       'observation',
//       'customer_name',
//       'description'
//     ];
    
//     const filteredData = {};
//     allowedFields.forEach(field => {
//       if (updateData[field] !== undefined) {
//         // Se for observation, mantém como array/JSON
//         if (field === 'observation') {
//           filteredData[field] = updateData[field];
//         } else {
//           filteredData[field] = updateData[field];
//         }
//       }
//     });

//     // Se houver dados para atualizar
//     if (Object.keys(filteredData).length > 0) {
//       await service.update(filteredData);
//     }

//     // Recalcular totais se KM ou materiais mudaram
//     if (updateData.total_km !== undefined) {
//       await ServiceController.updateServiceTotal(service_id);
//     }

//     // Buscar serviço atualizado com relações
//     const updatedService = await Service.findByPk(service_id, {
//       include: [
//         { model: City },
//         { model: User, attributes: ['id', 'name', 'email'] },
//         { 
//           model: ServiceMaterial, 
//           as: 'ServiceMaterials',
//           include: [Material]
//         }
//       ]
//     });

//     res.json({
//       success: true,
//       message: 'Serviço atualizado com sucesso',
//       data: updatedService
//     });
//   } catch (error) {
//     console.error('Erro ao atualizar serviço:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Erro interno do servidor ao atualizar serviço' 
//     });
//   }
// }

//   // 4. DELETAR SERVIÇO
//   static async deleteService(req, res) {
//     try {
//       const { service_id } = req.params;

//       const service = await Service.findByPk(service_id);
//       if (!service) {
//         return res.status(404).json({ 
//           success: false, 
//           error: 'Serviço não encontrado' 
//         });
//       }

//       // Primeiro deleta os materiais associados
//       await ServiceMaterial.destroy({ where: { service_id } });

//       // Depois deleta o serviço
//       await service.destroy();

//       res.json({
//         success: true,
//         message: 'Serviço deletado com sucesso'
//       });
//     } catch (error) {
//       console.error('Erro ao deletar serviço:', error);
//       res.status(500).json({ 
//         success: false, 
//         error: 'Erro interno do servidor ao deletar serviço' 
//       });
//     }
//   }

//   // 5. DASHBOARD/ESTATÍSTICAS
//   static async getDashboardStats(req, res) {
//     try {
//       const services = await Service.findAll({
//         include: [
//           { model: City },
//           { model: User },
//           { 
//             model: ServiceMaterial, 
//             as: 'ServiceMaterials',
//             include: [Material]
//           }
//         ]
//       });

//       const stats = {
//         total: services.length,
//         completed: services.filter(s => s.status === 'completed').length,
//         in_progress: services.filter(s => s.status === 'in_progress').length,
//         on_hold: services.filter(s => s.status === 'on_hold').length,
        
//         total_km: services.reduce((sum, s) => sum + (s.total_km_accumulated || s.total_km || 0), 0),
//         total_revenue: 0,
        
//         by_city: {},
//         by_technician: {}
//       };

//       // Calcula receita total
//       services.forEach(service => {
//         const cityRate = service.City?.km_rate || 0;
//         const km = service.total_km_accumulated || service.total_km || 0;
//         const materialsTotal = (service.ServiceMaterials || []).reduce(
//           (sum, m) => sum + (parseFloat(m.total_price) || 0), 0
//         );
        
//         stats.total_revenue += (km * cityRate) + materialsTotal;
        
//         // Agrupa por cidade
//         const cityName = service.City?.name || 'Desconhecida';
//         stats.by_city[cityName] = (stats.by_city[cityName] || 0) + 1;
        
//         // Agrupa por técnico
//         const techName = service.User?.name || 'Desconhecido';
//         stats.by_technician[techName] = (stats.by_technician[techName] || 0) + 1;
//       });

//       res.json({
//         success: true,
//         data: stats
//       });
//     } catch (error) {
//       console.error('Erro ao obter estatísticas:', error);
//       res.status(500).json({ 
//         success: false, 
//         error: 'Erro interno do servidor ao obter estatísticas' 
//       });
//     }
//   }

//   // Método auxiliar já existente
//   static async updateServiceTotal(service_id) {
//     try {
//       const service = await Service.findByPk(service_id, {
//         include: [{
//           model: ServiceMaterial,
//           as: 'ServiceMaterials'
//         }]
//       });

//       if (service) {
//         const totals = CalculationService.calculateServiceTotal(
//           service, 
//           service.ServiceMaterials
//         );
//         await service.update({
//           total_value: totals.total_value,
//           materials_value: totals.materials_value
//         });
//       }
//     } catch (error) {
//       console.error('Erro ao atualizar total do serviço:', error);
//     }
//   }

//   static async debugStructure(req, res) {
//   try {
//     const service = await Service.findOne({
//       include: [
//         { model: City },
//         { model: User },
//         { 
//           model: ServiceMaterial, 
//           as: 'ServiceMaterials',
//           include: [Material]
//         }
//       ]
//     });
    
//     if (!service) {
//       return res.json({
//         message: 'Nenhum serviço encontrado para debug',
//         structure: 'Vazio'
//       });
//     }
    
//     res.json({
//       message: 'Estrutura do primeiro serviço',
//       data: service,
//       plain: service.get({ plain: true })
//     });
//   } catch (error) {
//     console.error('Erro no debug:', error);
//     res.status(500).json({ error: error.message });
//   }
// }

// static async getUserServices(req, res) {
//   try {
//     const userId = req.user.id;
    
//     const services = await Service.findAll({
//       where: { user_id: userId },
//       include: [
//         { model: City },
//         { model: User, attributes: ['id', 'name', 'email'] },
//         { 
//           model: ServiceMaterial, 
//           as: 'ServiceMaterials',
//           include: [Material]
//         }
//       ],
//       order: [['created_at', 'DESC']]
//     });

//     res.json({
//       success: true,
//       data: services,
//       count: services.length
//     });
//   } catch (error) {
//     console.error('Erro ao listar serviços do usuário:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Erro interno do servidor ao listar serviços do usuário' 
//     });
//   }
// }



// // Serviços em andamento do usuário
// static async getCurrentServices(req, res) {
//   try {
//     const userId = req.user.id;
    
//     const services = await Service.findAll({
//       where: { 
//         user_id: userId,
//         status: 'in_progress'
//       },
//       include: [
//         { model: City },
//         { model: User, attributes: ['id', 'name', 'email'] }
//       ],
//       order: [['created_at', 'DESC']]
//     });

//     res.json({
//       success: true,
//       data: services,
//       count: services.length
//     });
//   } catch (error) {
//     console.error('Erro ao listar serviços em andamento:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Erro interno do servidor' 
//     });
//   }
// }

// // Serviços pausados do usuário
// static async getPausedServices(req, res) {
//   try {
//     const userId = req.user.id;
    
//     const services = await Service.findAll({
//       where: { 
//         user_id: userId,
//         status: 'on_hold'
//       },
//       include: [
//         { model: City },
//         { model: User, attributes: ['id', 'name', 'email'] }
//       ],
//       order: [['created_at', 'DESC']]
//     });

//     res.json({
//       success: true,
//       data: services,
//       count: services.length
//     });
//   } catch (error) {
//     console.error('Erro ao listar serviços pausados:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Erro interno do servidor' 
//     });
//   }
// }

// // Histórico de serviços (com paginação)
// static async getServiceHistory(req, res) {
//   try {
//     const userId = req.user.id;
//     const { page = 1, limit = 10, status } = req.query;
//     const offset = (page - 1) * limit;
    
//     const whereClause = { user_id: userId };
    
//     // Filtrar por status se especificado
//     if (status) {
//       whereClause.status = status;
//     } else {
//       // Por padrão, mostra serviços finalizados
//       whereClause.status = 'completed';
//     }
    
//     const { count, rows } = await Service.findAndCountAll({
//       where: whereClause,
//       include: [
//         { model: City },
//         { model: User, attributes: ['id', 'name', 'email'] }
//       ],
//       order: [['created_at', 'DESC']],
//       limit: parseInt(limit),
//       offset: parseInt(offset)
//     });

//     res.json({
//       success: true,
//       data: rows,
//       pagination: {
//         page: parseInt(page),
//         limit: parseInt(limit),
//         total: count,
//         pages: Math.ceil(count / limit)
//       }
//     });
//   } catch (error) {
//     console.error('Erro ao listar histórico de serviços:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Erro interno do servidor' 
//     });
//   }
// }

// // Estatísticas do usuário
// static async getUserStats(req, res) {
//   try {
//     const userId = req.user.id;
    
//     // Total de serviços
//     const totalServices = await Service.count({
//       where: { user_id: userId }
//     });
    
//     // Serviços completados
//     const completedServices = await Service.count({
//       where: { 
//         user_id: userId,
//         status: 'completed'
//       }
//     });
    
//     // Serviços em andamento
//     const inProgressServices = await Service.count({
//       where: { 
//         user_id: userId,
//         status: 'in_progress'
//       }
//     });
    
//     // Serviços pausados
//     const onHoldServices = await Service.count({
//       where: { 
//         user_id: userId,
//         status: 'on_hold'
//       }
//     });
    
//     // Quilometragem total
//     const totalKm = await Service.sum('total_km_accumulated', {
//       where: { user_id: userId }
//     }) || 0;
    
//     // Serviços por mês (últimos 6 meses)
//     const sixMonthsAgo = new Date();
//     sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
//     const servicesByMonth = await Service.findAll({
//       where: {
//         user_id: userId,
//         created_at: { [Op.gte]: sixMonthsAgo }
//       },
//       attributes: [
//         [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m'), 'month'],
//         [sequelize.fn('COUNT', sequelize.col('id')), 'count']
//       ],
//       group: ['month'],
//       order: [['month', 'DESC']],
//       raw: true
//     });

//     res.json({
//       success: true,
//       data: {
//         totals: {
//           all: totalServices,
//           completed: completedServices,
//           in_progress: inProgressServices,
//           on_hold: onHoldServices,
//           km: parseFloat(totalKm) || 0
//         },
//         by_month: servicesByMonth,
//         completion_rate: totalServices > 0 
//           ? Math.round((completedServices / totalServices) * 100) 
//           : 0
//       }
//     });
//   } catch (error) {
//     console.error('Erro ao buscar estatísticas:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Erro interno do servidor' 
//     });
//   }
// }

// // Adicionar observação ao serviço
// // NO MÉTODO addServiceNote (~linha 475) - VERSÃO COM HISTÓRICO
// static async addServiceNote(req, res) {
//   try {
//     const { service_id } = req.params;
//     const { note } = req.body;
    
//     if (!note || note.trim() === '') {
//       return res.status(400).json({ 
//         success: false, 
//         error: 'A observação não pode estar vazia' 
//       });
//     }
    
//     const service = await Service.findByPk(service_id);
//     if (!service) {
//       return res.status(404).json({ 
//         success: false, 
//         error: 'Serviço não encontrado' 
//       });
//     }
    
//     // Verifica se o usuário tem permissão
//     if (service.user_id !== req.user.id && req.user.role !== 'admin') {
//       return res.status(403).json({ 
//         success: false, 
//         error: 'Acesso negado' 
//       });
//     }
    
//     // HISTÓRICO DE OBSERVAÇÕES (JSON)
//     let observations = service.observation || [];
    
//     // Se for string, tenta parsear (para compatibilidade)
//     if (typeof observations === 'string') {
//       try {
//         observations = JSON.parse(observations);
//       } catch {
//         // Se não for JSON válido, começa novo array
//         observations = [];
//       }
//     }
    
//     // Garante que é um array
//     if (!Array.isArray(observations)) {
//       observations = [];
//     }
    
//     // Adiciona nova observação ao histórico
//     observations.push({
//       note: note.trim(),
//       created_by: req.user.id,
//       created_at: new Date(),
//       user_name: req.user.name || req.user.email
//     });
    
//     // Salva o array atualizado
//     service.observation = observations;
//     await service.save();
    
//     res.json({
//       success: true,
//       message: 'Observação adicionada com sucesso',
//       data: { 
//         observations,
//         count: observations.length 
//       }
//     });
//   } catch (error) {
//     console.error('Erro ao adicionar observação:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Erro interno do servidor' 
//     });
//   }
// }

// // Atualizar localização do serviço
// static async updateServiceLocation(req, res) {
//   try {
//     const { service_id } = req.params;
//     const { location_lat, location_lng, address } = req.body;
    
//     const service = await Service.findByPk(service_id);
//     if (!service) {
//       return res.status(404).json({ 
//         success: false, 
//         error: 'Serviço não encontrado' 
//       });
//     }
    
//     // Verifica se o usuário tem permissão
//     if (service.user_id !== req.user.id && req.user.role !== 'admin') {
//       return res.status(403).json({ 
//         success: false, 
//         error: 'Acesso negado' 
//       });
//     }
    
//     // Atualiza a localização
//     const updateData = {};
//     if (location_lat !== undefined) updateData.location_lat = location_lat;
//     if (location_lng !== undefined) updateData.location_lng = location_lng;
//     if (address !== undefined) updateData.address = address;
    
//     await service.update(updateData);
    
//     res.json({
//       success: true,
//       message: 'Localização atualizada com sucesso',
//       data: service
//     });
//   } catch (error) {
//     console.error('Erro ao atualizar localização:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Erro interno do servidor' 
//     });
//   }
// }

// static async removeMaterialFromService(req, res) {
//   try {
//     const { material_id } = req.params;
    
//     // Encontra e remove o ServiceMaterial
//     const serviceMaterial = await ServiceMaterial.findByPk(material_id);
//     if (!serviceMaterial) {
//       return res.status(404).json({ 
//         success: false, 
//         error: 'Material do serviço não encontrado' 
//       });
//     }
    
//     // Verifica permissão
//     const service = await Service.findByPk(serviceMaterial.service_id);
//     if (!service) {
//       return res.status(404).json({ 
//         success: false, 
//         error: 'Serviço não encontrado' 
//       });
//     }
    
//     if (service.user_id !== req.user.id && req.user.role !== 'admin') {
//       return res.status(403).json({ 
//         success: false, 
//         error: 'Acesso negado' 
//       });
//     }
    
//     // Remove o material
//     await serviceMaterial.destroy();
    
//     // Atualiza totais do serviço
//     await ServiceController.updateServiceTotal(service.id);
    
//     res.json({
//       success: true,
//       message: 'Material removido do serviço com sucesso'
//     });
//   } catch (error) {
//     console.error('Erro ao remover material do serviço:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Erro interno do servidor' 
//     });
//   }
// }

// static async updateServiceMaterial(req, res) {
//   try {
//     const { material_id } = req.params;
//     const { quantity } = req.body;
    
//     console.log(`✏️ Atualizando material ${material_id}:`, quantity);
    
//     if (!quantity || quantity <= 0) {
//       return res.status(400).json({ 
//         success: false, 
//         error: 'Quantidade inválida' 
//       });
//     }
    
//     // Encontra o ServiceMaterial
//     const serviceMaterial = await ServiceMaterial.findByPk(material_id, {
//       include: [Material]
//     });
    
//     if (!serviceMaterial) {
//       return res.status(404).json({ 
//         success: false, 
//         error: 'Material do serviço não encontrado' 
//       });
//     }
    
//     // Verifica permissão
//     const service = await Service.findByPk(serviceMaterial.service_id);
//     if (!service) {
//       return res.status(404).json({ 
//         success: false, 
//         error: 'Serviço não encontrado' 
//       });
//     }
    
//     if (service.user_id !== req.user.id && req.user.role !== 'admin') {
//       return res.status(403).json({ 
//         success: false, 
//         error: 'Acesso negado' 
//       });
//     }
    
//     // Atualiza quantidade
//     serviceMaterial.quantity = parseFloat(quantity);
//     serviceMaterial.total_price = serviceMaterial.unit_price * parseFloat(quantity);
//     await serviceMaterial.save();
    
//     // Atualiza totais do serviço
//     await ServiceController.updateServiceTotal(service.id);
    
//     // Busca material atualizado com relacionamentos
//     const updatedMaterial = await ServiceMaterial.findByPk(material_id, {
//       include: [Material]
//     });
    
//     res.json({
//       success: true,
//       message: 'Quantidade atualizada com sucesso',
//       data: updatedMaterial
//     });
//   } catch (error) {
//     console.error('Erro ao atualizar quantidade do material:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Erro interno do servidor' 
//     });
//   }
// }

// }