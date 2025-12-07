// utils/calculations.js
class CalculationService {
  // Calcular total do material
  static calculateMaterialTotal(quantity, unitPrice) {
    const total = parseFloat(quantity) * parseFloat(unitPrice);
    return parseFloat(total.toFixed(2));
  }

  // Calcular total do serviço
  static calculateServiceTotal(service, serviceMaterials = []) {
    console.log('🧮 Calculando total do serviço...');
    
    let materialsTotal = 0;
    
    if (serviceMaterials && serviceMaterials.length > 0) {
      serviceMaterials.forEach(material => {
        materialsTotal += parseFloat(material.total_price || 0);
      });
    }

    // Calcular deslocamento (km * taxa da cidade)
    let displacementTotal = 0;
    if (service.City && service.total_km) {
      displacementTotal = parseFloat(service.total_km) * parseFloat(service.City.km_rate);
    }

    const totalValue = materialsTotal + displacementTotal;
    
    console.log('📊 Totais calculados:', {
      materials: materialsTotal,
      displacement: displacementTotal,
      total: totalValue
    });

    return {
      materials_total: parseFloat(materialsTotal.toFixed(2)),
      displacement_total: parseFloat(displacementTotal.toFixed(2)),
      total_value: parseFloat(totalValue.toFixed(2))
    };
  }
}

export default CalculationService;
