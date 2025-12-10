function validatePropertyData(data) {
    const errors = [];
    let qualityScore = 1.0;
  
    if (!data.price || data.price < 1000 || data.price > 10000000) {
      errors.push('Invalid price range');
      qualityScore -= 0.2;
    }
  
    if (data.surface && (data.surface < 10 || data.surface > 2000)) {
      errors.push('Surface out of reasonable range');
      qualityScore -= 0.2;
    }
  
    if (data.rooms && (data.rooms < 1 || data.rooms > 20)) {
      errors.push('Rooms count suspicious');
      qualityScore -= 0.2;
    }
  
    if (data.bedrooms && data.rooms && data.bedrooms > data.rooms) {
      errors.push('Bedrooms exceeds total rooms');
      qualityScore -= 0.2;
    }
  
    if (data.rooms && data.rooms > 50) {
      errors.push('Rooms value appears to be concatenated with other data');
      qualityScore -= 0.3;
    }
  
    if (data.land_surface && data.land_surface > 1000000) {
      errors.push('Land surface suspiciously large');
      qualityScore -= 0.2;
    }
  
    return {
      isValid: errors.length === 0,
      errors,
      qualityScore: Math.max(0, qualityScore)
    };
  }
  
  module.exports = { validatePropertyData };
  