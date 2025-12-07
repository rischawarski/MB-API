import dotenv from 'dotenv';
import app from './app.js';
import sequelize from './src/config/database.js';

// Carregar variáveis de ambiente
dotenv.config();

const PORT =3000;

// Testar conexão com banco
sequelize.authenticate()
  .then(() => {
    console.log('✅ Conexão com MySQL estabelecida com sucesso!');
  })
  .catch(err => {
    console.error('❌ Erro ao conectar com MySQL:', err);
  });

// Sincronizar tabelas
sequelize.sync({ force: false })
  .then(() => {
    console.log('✅ Tabelas sincronizadas!');
  })
  .catch(err => {
    console.error('❌ Erro ao sincronizar tabelas:', err);
  });

// Rotas
import authRoutes from './src/routes/auth.js';
import userRoutes from './src/routes/user.js';
import serviceRoutes from './src/routes/services.js';
import materialRoutes from './src/routes/materials.js';
import cityRoutes from './src/routes/cities.js';
import syncRoutes from './src/routes/sync.js';

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/sync', syncRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'API funcionando!',
    timestamp: new Date().toISOString()
  });
});

// Middleware para erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Algo deu errado!',
    message: err.message
  });
});

// 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint não encontrado'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});