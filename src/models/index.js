import sequelize from '../config/database.js';
import User from './User.js';
import Service from './Service.js';
import Material from './Material.js';
import City from './City.js';
import ServiceMaterial from './ServiceMaterial.js';
import SyncQueue from './SyncQueue.js';

// ======================
// Associações
// ======================

// User → Service (1:N)
User.hasMany(Service, { 
  foreignKey: 'user_id',
  as: 'Services'  // Adicione alias
});
Service.belongsTo(User, { 
  foreignKey: 'user_id',
  as: 'User'  // Adicione alias
});

// City → Service (1:N)
City.hasMany(Service, { 
  foreignKey: 'city_id',
  as: 'Services'  // Adicione alias
});
Service.belongsTo(City, { 
  foreignKey: 'city_id',
  as: 'City'  // Adicione alias
});

// ======================
// ServiceMaterial (Relacionamento com modelo explícito)
// ======================

// Service → ServiceMaterial (1:N)
Service.hasMany(ServiceMaterial, {
  foreignKey: 'service_id',
  as: 'ServiceMaterials'  // Já tem
});

// ServiceMaterial → Service (N:1)
ServiceMaterial.belongsTo(Service, {
  foreignKey: 'service_id',
  as: 'Service'  // Adicione alias
});

// Material → ServiceMaterial (1:N)
Material.hasMany(ServiceMaterial, {
  foreignKey: 'material_id',
  as: 'ServiceMaterials'  // Adicione alias
});

// ServiceMaterial → Material (N:1)
ServiceMaterial.belongsTo(Material, {
  foreignKey: 'material_id',
  as: 'Material'  // Já tem
});

// ======================
// REMOVA ESTAS LINHAS (causam conflito):
// Service.belongsToMany(Material, {
//   through: ServiceMaterial,
//   foreignKey: 'service_id',
//   otherKey: 'material_id'
// });
//
// Material.belongsToMany(Service, {
//   through: ServiceMaterial,
//   foreignKey: 'material_id',
//   otherKey: 'service_id'
// });
// ======================

// ======================
// Exportação
// ======================
export {
  sequelize,
  User,
  Service,
  Material,
  City,
  ServiceMaterial,
  SyncQueue
};