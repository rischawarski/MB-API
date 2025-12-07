const { sequelize, User, City, Material, Service, ServiceMaterial } = require('../src/models');
const bcrypt = require('bcryptjs');

class Seeder {
  static async run() {
    try {
      console.log('🌱 Iniciando seed do banco de dados...');

      // Sincronizar banco
      await sequelize.sync({ force: true });
      console.log('✅ Tabelas sincronizadas');

      // Criar usuários PRIMEIRO e manualmente
      await this.createUsers();
      
      // Criar cidades
      await this.createCities();
      
      // Criar materiais
      await this.createMaterials();
      
      // Criar serviços de exemplo
      await this.createServices();

      console.log('🎉 Seed concluído com sucesso!');
      console.log('\n🔑 CREDENCIAIS PARA TESTE:');
      console.log('   👑 Admin: admin@mb.com / 123456');
      console.log('   👤 User:  user@mb.com / 123456');

    } catch (error) {
      console.error('❌ Erro no seed:', error);
    } finally {
      await sequelize.close();
    }
  }

  static async createUsers() {
    console.log('\n👥 Criando usuários...');

    const users = [
      {
        name: 'Administrador Sistema',
        email: 'admin@mb.com',
        password: '123456',
        role: 'admin',
        is_active: true
      },
      {
        name: 'Usuário Teste',
        email: 'user@mb.com', 
        password: '123456',
        role: 'user',
        is_active: true
      },
      {
        name: 'Técnico João Silva',
        email: 'joao@mb.com',
        password: '123456',
        role: 'user',
        is_active: true
      },
      {
        name: 'Técnica Maria Santos',
        email: 'maria@mb.com',
        password: '123456',
        role: 'user',
        is_active: true
      }
    ];

    for (const userData of users) {
      try {
        // Fazer o hash MANUALMENTE antes de criar
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        // Criar usuário com senha já hasheada
        const user = await User.create({
          ...userData,
          password: hashedPassword // Já vem hasheada, hook não precisa fazer
        });
        
        console.log(`   ✅ Usuário criado: ${user.email}`);
        
        // VERIFICAÇÃO: Testar se a senha funciona
        const testUser = await User.findOne({ where: { email: userData.email } });
        if (testUser) {
          const isValid = await bcrypt.compare('123456', testUser.password);
          console.log(`   🔐 Senha "123456" válida para ${testUser.email}: ${isValid}`);
        }
        
      } catch (error) {
        console.error(`   ❌ Erro ao criar usuário ${userData.email}:`, error.message);
      }
    }
  }

  static async createCities() {
    console.log('\n🏙️ Criando cidades...');

    const cities = [
      {
        name: 'São Paulo',
        km_rate: 2.50,
        state: 'SP',
        is_active: true
      },
      {
        name: 'Rio de Janeiro',
        km_rate: 3.00,
        state: 'RJ',
        is_active: true
      },
      {
        name: 'Belo Horizonte',
        km_rate: 2.20,
        state: 'MG',
        is_active: true
      },
      {
        name: 'Campinas',
        km_rate: 1.80,
        state: 'SP',
        is_active: true
      },
      {
        name: 'Santos',
        km_rate: 2.10,
        state: 'SP',
        is_active: true
      }
    ];

    for (const cityData of cities) {
      try {
        await City.create(cityData);
        console.log(`   ✅ Cidade criada: ${cityData.name} - R$ ${cityData.km_rate}/km`);
      } catch (error) {
        console.error(`   ❌ Erro ao criar cidade ${cityData.name}:`, error.message);
      }
    }
  }

  static async createMaterials() {
    console.log('\n🛠️ Criando materiais...');

    const materials = [
      {
        name: 'Cabo de Rede CAT6',
        description: 'Cabo de rede categoria 6, 1 metro',
        price: 12.50,
        unit: 'un',
        is_active: true
      },
      {
        name: 'Conector RJ45',
        description: 'Conector de rede RJ45',
        price: 1.20,
        unit: 'un',
        is_active: true
      },
      {
        name: 'Switch 8 Portas',
        description: 'Switch gerenciável 8 portas Gigabit',
        price: 350.00,
        unit: 'un',
        is_active: true
      },
      {
        name: 'Roteador Wi-Fi',
        description: 'Roteador wireless dual-band',
        price: 280.00,
        unit: 'un',
        is_active: true
      },
      {
        name: 'Patch Panel 24 Portas',
        description: 'Patch panel cat6 24 portas',
        price: 150.00,
        unit: 'un',
        is_active: true
      }
    ];

    for (const materialData of materials) {
      try {
        await Material.create(materialData);
        console.log(`   ✅ Material criado: ${materialData.name} - R$ ${materialData.price}`);
      } catch (error) {
        console.error(`   ❌ Erro ao criar material ${materialData.name}:`, error.message);
      }
    }
  }

  static async createServices() {
    console.log('\n📋 Criando serviços de exemplo...');

    try {
      // Buscar IDs necessários
      const user = await User.findOne({ where: { email: 'user@mb.com' } });
      const joao = await User.findOne({ where: { email: 'joao@mb.com' } });
      const saoPaulo = await City.findOne({ where: { name: 'São Paulo' } });
      const campinas = await City.findOne({ where: { name: 'Campinas' } });

      if (!user || !saoPaulo) {
        console.log('   ⚠️ Usuário ou cidade não encontrados para criar serviços');
        return;
      }

      const services = [
        {
          user_id: user.id,
          city_id: saoPaulo.id,
          start_time: new Date('2024-01-15T08:00:00'),
          end_time: new Date('2024-01-15T12:30:00'),
          status: 'completed',
          total_km: 45.5,
          total_value: 0, // Será calculado depois
          location_lat: -23.5505,
          location_lng: -46.6333,
          address: 'Av. Paulista, 1000 - São Paulo/SP'
        }
      ];

      for (const serviceData of services) {
        const service = await Service.create(serviceData);
        console.log(`   ✅ Serviço criado: ID ${service.id} - ${service.status}`);
      }
    } catch (error) {
      console.error('   ❌ Erro ao criar serviços:', error.message);
    }
  }
}

// Executar o seed se chamado diretamente
if (require.main === module) {
  Seeder.run();
}

module.exports = Seeder;