// src/controllers/cityController.js
import { City } from '../models/index.js';

// Listar cidades
export async function getCities(req, res) {
  try {
    const { page = 1, limit = 50, active, search } = req.query; // Remova default de active

    const where = {};
    
    // CORREÇÃO: Só filtra por is_active se o parâmetro for 'true' ou 'false'
    if (active === 'true') {
      where.is_active = true;
    } else if (active === 'false') {
      where.is_active = false;
    }
    // Se active for undefined ou 'all' ou qualquer outro valor, não filtra

    if (search) {
      where.name = { $like: `%${search}%` };
    }

    const cities = await City.findAll({
      where,
      order: [['name', 'ASC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json(cities);
  } catch (error) {
    console.error('Erro ao buscar cidades:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Obter cidade por ID
export async function getCityById(req, res) {
  try {
    const { id } = req.params;
    const city = await City.findByPk(id);
    if (!city) return res.status(404).json({ error: 'Cidade não encontrada' });
    res.json(city);
  } catch (error) {
    console.error('Erro ao buscar cidade:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Criar cidade
export async function createCity(req, res) {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });

    const { name, km_rate, state, is_active = true } = req.body;

    const city = await City.create({
      name,
      km_rate,
      state: state.toUpperCase(),
      is_active
    });

    res.status(201).json(city);
  } catch (error) {
    console.error('Erro ao criar cidade:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Atualizar cidade
export async function updateCity(req, res) {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });

    const { id } = req.params;
    const { name, km_rate, state, is_active } = req.body;

    const city = await City.findByPk(id);
    if (!city) return res.status(404).json({ error: 'Cidade não encontrada' });

    await city.update({
      name: name || city.name,
      km_rate: km_rate || city.km_rate,
      state: state ? state.toUpperCase() : city.state,
      is_active: is_active !== undefined ? is_active : city.is_active
    });

    res.json(city);
  } catch (error) {
    console.error('Erro ao atualizar cidade:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Deletar cidade
export async function deleteCity(req, res) {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });

    const { id } = req.params;
    const city = await City.findByPk(id);
    if (!city) return res.status(404).json({ error: 'Cidade não encontrada' });

    await city.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar cidade:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Alternar status (ativo/inativo)
export async function toggleCityStatus(req, res) {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });

    const { id } = req.params;
    const city = await City.findByPk(id);
    if (!city) return res.status(404).json({ error: 'Cidade não encontrada' });

    city.is_active = !city.is_active;
    await city.save();

    res.json({ id: city.id, is_active: city.is_active });
  } catch (error) {
    console.error('Erro ao alternar status da cidade:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }

}

// src/controllers/cityController.js
export async function getActiveCities(req, res) {
  try {
    const cities = await City.findAll({
      where: { is_active: true },
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: cities
    });
  } catch (error) {
    console.error('Erro ao listar cidades ativas:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
}

