const { sequelize } = require('../src/models');

async function resetDatabase() {
  try {
    console.log('🔄 Reiniciando banco de dados...');
    
    // CUIDADO: Isso vai dropar todas as tabelas!
    await sequelize.sync({ force: true });
    
    console.log('✅ Banco de dados reiniciado com sucesso!');
    console.log('📝 Execute "npm run seed" para popular com dados de teste');
    
  } catch (error) {
    console.error('❌ Erro ao reiniciar banco:', error);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  resetDatabase();
}

module.exports = resetDatabase;