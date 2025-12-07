const { sequelize, User } = require('../src/models');
const bcrypt = require('bcryptjs');

async function rehashAllUsers() {
  try {
    console.log('🔧 Recriando hashes de todos os usuários...\n');
    
    const users = await User.findAll();
    
    for (const user of users) {
      console.log(`🔄 Processando: ${user.email}`);
      console.log(`   Hash atual: ${user.password}`);
      
      // Recriar o hash com bcrypt
      const newHash = await bcrypt.hash('123456', 10);
      user.password = newHash;
      await user.save();
      
      console.log(`   Novo hash: ${newHash}`);
      
      // Verificar se funciona
      const isValid = await bcrypt.compare('123456', newHash);
      console.log(`   ✅ Nova senha válida: ${isValid}\n`);
    }
    
    console.log('🎉 Todos os hashes foram recriados!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await sequelize.close();
  }
}

rehashAllUsers();