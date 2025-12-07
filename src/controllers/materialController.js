import { Material } from '../models/index.js';

class MaterialController {
  // Listar materiais - CORRIGIDO (igual ao das cidades)
  static async getMaterials(req, res) {
    try {
      const { page = 1, limit = 50, active, search } = req.query;
      
      const where = {};
      
      // Filtro por status (igual ao das cidades)
      if (active === 'true') {
        where.is_active = true;
      } else if (active === 'false') {
        where.is_active = false;
      }
      // Se active for undefined ou qualquer outro valor, não filtra

      if (search) {
        where.name = { $like: `%${search}%` };
      }

      const materials = await Material.findAll({
        where,
        order: [['name', 'ASC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      });

      res.json(materials);
    } catch (error) {
      console.error('Erro ao buscar materiais:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Obter material por ID
  static async getMaterialById(req, res) {
    try {
      const { id } = req.params;
      const material = await Material.findByPk(id);
      
      if (!material) {
        return res.status(404).json({ error: 'Material não encontrado' });
      }

      res.json(material);
    } catch (error) {
      console.error('Erro ao buscar material:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Criar material (apenas admin)
  static async createMaterial(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const { name, description, price, unit, is_active = true } = req.body;

      const material = await Material.create({
        name,
        description: description || null,
        price,
        unit: unit || 'un',
        is_active
      });

      res.status(201).json(material);
    } catch (error) {
      console.error('Erro ao criar material:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Atualizar material (apenas admin)
  static async updateMaterial(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const { id } = req.params;
      const { name, description, price, unit, is_active } = req.body;

      const material = await Material.findByPk(id);
      if (!material) {
        return res.status(404).json({ error: 'Material não encontrado' });
      }

      await material.update({
        name: name || material.name,
        description: description !== undefined ? description : material.description,
        price: price || material.price,
        unit: unit || material.unit,
        is_active: is_active !== undefined ? is_active : material.is_active
      });

      res.json(material);
    } catch (error) {
      console.error('Erro ao atualizar material:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Deletar material (apenas admin)
  static async deleteMaterial(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const { id } = req.params;
      const material = await Material.findByPk(id);
      
      if (!material) {
        return res.status(404).json({ error: 'Material não encontrado' });
      }

      await material.destroy();
      res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar material:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Alternar status do material (apenas admin)
  static async toggleMaterialStatus(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const { id } = req.params;
      const material = await Material.findByPk(id);
      
      if (!material) {
        return res.status(404).json({ error: 'Material não encontrado' });
      }

      material.is_active = !material.is_active;
      await material.save();

      res.json({ 
        id: material.id, 
        name: material.name,
        is_active: material.is_active 
      });
    } catch (error) {
      console.error('Erro ao alternar status do material:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // src/controllers/materialController.js
static async getActiveMaterials(req, res) {
  try {
    const materials = await Material.findAll({
      where: { is_active: true },
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: materials
    });
  } catch (error) {
    console.error('Erro ao listar materiais ativos:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
}

}

export default MaterialController;


// import { Material } from '../models/index.js';

// class MaterialController {
//   // Listar materiais
//   static async getMaterials(req, res) {
//     try {
//       const { page = 1, limit = 50, active = true } = req.query;
      
//       const where = {};
//       if (active !== 'false') {
//         where.is_active = true;
//       }

//       const materials = await Material.findAll({
//         where,
//         order: [['name', 'ASC']],
//         limit: parseInt(limit),
//         offset: (parseInt(page) - 1) * parseInt(limit)
//       });

//       res.json(materials);
//     } catch (error) {
//       console.error('Erro ao buscar materiais:', error);
//       res.status(500).json({ error: 'Erro interno do servidor' });
//     }
//   }

//   // Criar material (apenas admin)
//   static async createMaterial(req, res) {
//     try {
//       if (req.user.role !== 'admin') {
//         return res.status(403).json({ error: 'Acesso negado' });
//       }

//       const { name, description, price, unit } = req.body;

//       const material = await Material.create({
//         name,
//         description,
//         price,
//         unit: unit || 'un'
//       });

//       res.status(201).json(material);
//     } catch (error) {
//       console.error('Erro ao criar material:', error);
//       res.status(500).json({ error: 'Erro interno do servidor' });
//     }
//   }

//   // Atualizar material (apenas admin)
//   static async updateMaterial(req, res) {
//     try {
//       if (req.user.role !== 'admin') {
//         return res.status(403).json({ error: 'Acesso negado' });
//       }

//       const { id } = req.params;
//       const { name, description, price, unit, is_active } = req.body;

//       const material = await Material.findByPk(id);
//       if (!material) {
//         return res.status(404).json({ error: 'Material não encontrado' });
//       }

//       await material.update({
//         name: name || material.name,
//         description: description !== undefined ? description : material.description,
//         price: price || material.price,
//         unit: unit || material.unit,
//         is_active: is_active !== undefined ? is_active : material.is_active
//       });

//       res.json(material);
//     } catch (error) {
//       console.error('Erro ao atualizar material:', error);
//       res.status(500).json({ error: 'Erro interno do servidor' });
//     }
//   }
// }

// export default MaterialController;
