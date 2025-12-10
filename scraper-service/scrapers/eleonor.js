const { validatePropertyData } = require('../utils/validation');
const database = require('../utils/database');

// ========================================
// HELPER: Fetch existing properties with prices
// ======================================== 

async function getExistingProperties(supabase, source) {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('reference, price, previous_price, url')
      .eq('source', source)
      .eq('is_active', true);
    
    if (error) throw error;
    
    const propertiesMap = new Map();
    data.forEach(p => {
      if (p.reference) {
        propertiesMap.set(p.reference, {
          currentPrice: p.price,
          previousPrice: p.previous_price,
          url: p.url
        });
      }
    });
    
    console.log(`📊 Found ${propertiesMap.size} existing properties in database`);
    return propertiesMap;
  } catch (error) {
    console.error('⚠️  Error fetching existing properties:', error);
    return new Map();
  }
}

// ========================================
// LISTING EXTRACTION (SIMPLIFIED - NO IMAGES!)
// ========================================

async function extractEleonorListingCards(page) {
  console.log('🔍 Extracting listing cards...');
  
  const cards = await page.evaluate(() => {
    const results = [];
    const clean = s => s ? s.replace(/\s+/g, ' ').trim() : '';

    const propertyLinks = Array.from(document.querySelectorAll('a[href*="/fr/vente/"]'));
    console.log(`Found ${propertyLinks.length} total links with /fr/vente/`);

    const detailLinks = propertyLinks.filter(a => a.href.includes(',VM'));
    console.log(`Found ${detailLinks.length} property detail links`);

    detailLinks.forEach(link => {
      try {
        const url = link.href;
        
        let card = link.closest('article') || 
                   link.closest('[class*="_nhv2ha"]') ||
                   link.closest('div[class*="_1kqnpiud"]');
        
        if (!card) {
          let current = link.parentElement;
          for (let i = 0; i < 8 && current; i++) {
            const hasPrice = current.querySelector('[class*="_1s1nzvi"], [class*="_11w5q3n"]');
            const hasInfo = current.querySelector('[class*="_eic3rb"]');
            if (hasPrice || hasInfo) {
              card = current;
              break;
            }
            current = current.parentElement;
          }
        }

        if (!card) {
          console.log(`No card container found for: ${url}`);
          return;
        }

        const priceEl = card.querySelector('span._1s1nzvi, div._11w5q3n, [class*="price"]');
        let price = null;
        if (priceEl) {
          const priceText = clean(priceEl.textContent);
          const match = priceText.match(/(\d[\d\s ]*)\s*€/);
          if (match) {
            price = parseInt(match[1].replace(/[^\d]/g, ''), 10);
          }
        }

        const titleEl = card.querySelector('h2, h3, [class*="title"]');
        const title = titleEl ? clean(titleEl.textContent) : null;

        let rooms = null;
        let building_surface = null;
        let city = null;
        let postal_code = null;

        const infoEl = card.querySelector('[class*="_eic3rb"], [class*="iconText"]') || card;
        const infoText = clean(infoEl.textContent);

        const roomsMatch = infoText.match(/(\d+)\s*pièces?/i);
        if (roomsMatch) rooms = parseInt(roomsMatch[1], 10);

        const surfaceMatch = infoText.match(/(\d+)\s*m[²2]/i);
        if (surfaceMatch) building_surface = parseInt(surfaceMatch[1], 10);

        const locationMatch = infoText.match(/([A-Za-zÀ-ÿ'\- ]+)\s+(\d{5})/);
        if (locationMatch) {
          city = locationMatch[1].trim();
          postal_code = locationMatch[2];
        }

        results.push({
          url,
          price,
          title,
          rooms,
          building_surface,
          city,
          postal_code
        });

      } catch (err) {
        console.error('Card extraction error:', err.message);
      }
    });

    return results;
  });

  console.log(`✅ Extracted ${cards.length} cards from listing page`);
  console.log(`   With prices: ${cards.filter(c => c.price).length}`);
  
  return cards;
}

// ========================================
// DETAIL PAGE EXTRACTION (COMPLETE)
// ========================================

async function extractEleonorPropertyData(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    const propertyData = await page.evaluate(() => {
      const data = {};
      const clean = (txt) => txt ? txt.replace(/\s+/g, ' ').trim() : '';

      // ===== TITLE =====
      const h1 = document.querySelector('h1');
      data.title = clean(h1 ? h1.textContent : '');

      if (data.title.includes('À vendre -')) {
        data.title = data.title.replace('À vendre - ', '').split('|')[0].trim();
      }

      // ===== REFERENCE (from URL) =====
      const urlParts = window.location.pathname.split(',');
      data.reference = urlParts[urlParts.length - 1] || null;

      // ===== PROPERTY TYPE FROM TITLE =====
      const tl = data.title.toLowerCase();
      if (tl.includes('maison') || tl.includes('villa') || tl.includes('manoir')) {
        data.property_type = 'House/Villa';
      } else if (tl.includes('appartement')) {
        data.property_type = 'Apartment';
      } else if (tl.includes('terrain')) {
        data.property_type = 'Land (Terrain)';
      } else if (tl.includes('immeuble')) {
        data.property_type = 'Building';
      } else {
        data.property_type = null;
      }

      // ===== PRICE =====
      let priceText = '';
      const priceP = document.querySelector('p._1hxffol');

      if (priceP) {
        priceText = clean(priceP.textContent);
      } else {
        const maybe = Array.from(document.querySelectorAll('p, div, span')).find(el => {
          const t = el.textContent;
          return t && t.includes('€') && /\d/.test(t) && t.length < 40;
        });
        priceText = maybe ? clean(maybe.textContent) : '';
      }

      const priceMatch = priceText.match(/(\d[\d\s ]*)\s*€/);
      data.price = priceMatch ? parseInt(priceMatch[1].replace(/[^\d]/g, ''), 10) : null;

      // ===== INITIALIZE ALL FIELDS =====
      data.rooms = null;
      data.bedrooms = null;
      data.building_surface = null;
      data.land_surface = null;
      data.city = null;
      data.postal_code = null;
      data.drainage_system = null;
      data.heating_system = null;
      data.pool = false;
      data.property_condition = null;
      data.year_built = null;
      data.energy_consumption = null;
      data.co2_emissions = null;
      data.bathrooms = null;
      data.wc_count = null;

      // ===== HELPER FUNCTION =====
      const getTableValue = (label) => {
        const stopWords = ['Localisation', 'Référence', 'Chambres', 'Pièces', 'Séjour', 'WC', 'Construction', 'État', 'Cuisine', 'Vue', 'Cave', 'Chauffage', 'Piscine', 'Ouvertures', 'Climatisation', 'Surface', 'Stationnement', 'Toiture', 'Niveaux', 'Détail des pièces', 'Informations complémentaires', 'Description', 'Assainissement'];
        
        const rows = Array.from(document.querySelectorAll('tr, .row, [class*="row"]'));
        for (const row of rows) {
          const rowText = row.textContent.trim();
          if (rowText.startsWith(label) || rowText.includes(label + ':') || rowText.includes(label + ' :')) {
            const regex = new RegExp(label + '\\s*:?\\s*(.+?)$', 'i');
            const match = rowText.match(regex);
            if (match) {
              let value = match[1];
              for (const stop of stopWords) {
                if (value.includes(stop)) {
                  value = value.split(stop)[0];
                  break;
                }
              }
              const cleaned = clean(value);
              if (cleaned.length > 0 && cleaned.length < 100) {
                return cleaned;
              }
            }
          }
        }
        
        const allElements = Array.from(document.querySelectorAll('*'));
        for (const el of allElements) {
          const text = el.textContent.trim();
          if (text.length < 200 && text.length > label.length && el.children.length === 0) {
            if (text.includes(label)) {
              const patterns = [
                new RegExp('^' + label + '\\s*:?\\s*([^A-Z]+?)$', 'i'),
                new RegExp(label + '\\s*:?\\s*([^:]+?)(?:' + stopWords.join('|') + ')', 'i'),
                new RegExp(label + '\\s*:?\\s*(.+?)$', 'i')
              ];
              
              for (const pattern of patterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                  let value = match[1];
                  for (const stop of stopWords) {
                    if (value.includes(stop)) {
                      value = value.split(stop)[0];
                      break;
                    }
                  }
                  const cleaned = clean(value);
                  if (cleaned.length > 0 && cleaned.length < 100) {
                    return cleaned;
                  }
                }
              }
            }
          }
        }
        
        return null;
      };

      // ===== DESCRIPTIF DU BIEN =====
      const descriptifHeading = Array.from(document.querySelectorAll('h2, h3, h4, div, p')).find(el => 
        clean(el.textContent) === 'Descriptif du bien' || el.textContent.includes('Descriptif du bien')
      );

      if (descriptifHeading) {
        let container = descriptifHeading.nextElementSibling;
        
        if (!container || container.children.length === 0) {
          container = descriptifHeading.parentElement;
        }

        if (container) {
          const descriptifText = clean(container.textContent);

          const surfaceMatch = descriptifText.match(/Surface\s*:?\s*(\d+)\s*m[²2]/i);
          if (surfaceMatch) {
            data.building_surface = parseInt(surfaceMatch[1], 10);
          }

          const piecesMatch = descriptifText.match(/Pièces?\s*:?\s*(\d+)/i);
          if (piecesMatch) {
            const value = parseInt(piecesMatch[1], 10);
            
            let maxRooms = 25;
            if (data.price) {
              if (data.price < 100000) maxRooms = 6;
              else if (data.price < 200000) maxRooms = 10;
              else if (data.price < 400000) maxRooms = 15;
              else if (data.price < 800000) maxRooms = 20;
              else if (data.price < 1500000) maxRooms = 30;
              else maxRooms = 50;
            }
            
            if (value >= 1 && value <= maxRooms) {
              data.rooms = value;
            }
          }

          const terrainMatch = descriptifText.match(/Terrain\s*:?\s*(\d+)(?:\s*a\s*(\d+)\s*ca)?\s*(a|m²|m2|ha|ca)?/i);
          if (terrainMatch) {
            let val = parseInt(terrainMatch[1], 10);
            const additionalCa = terrainMatch[2] ? parseInt(terrainMatch[2], 10) : 0;
            const unit = terrainMatch[3] ? terrainMatch[3].toLowerCase() : 'a';
            
            if (unit === 'a') {
              val = val * 100 + additionalCa;
            } else if (unit === 'ha') {
              val = val * 10000;
            } else if (unit === 'ca') {
              val = val * 1;
            }
            
            data.land_surface = val;
          }

          const salleDeBainsDescMatch = descriptifText.match(/Salle de bains?\s*:?\s*(\d+)/i);
          if (salleDeBainsDescMatch) {
            data.bathrooms = parseInt(salleDeBainsDescMatch[1], 10);
          }
        }
      }

      // ===== CARACTÉRISTIQUES TECHNIQUES =====
      const caracHeading = Array.from(document.querySelectorAll('h2, h3, h4, div, p')).find(el => 
        el.textContent.includes('Caractéristiques techniques')
      );

      let caracText = '';

      if (caracHeading) {
        let caracContainer = caracHeading.nextElementSibling;
        
        if (!caracContainer || caracContainer.children.length === 0) {
          caracContainer = caracHeading.parentElement;
        }

        if (caracContainer) {
          caracText = clean(caracContainer.textContent);

          if (!data.rooms) {
            const roomsMatch = caracText.match(/Pièces?\s*:?\s*(\d+)/i);
            if (roomsMatch) {
              const value = parseInt(roomsMatch[1], 10);
              
              let maxRooms = 25;
              if (data.price) {
                if (data.price < 100000) maxRooms = 6;
                else if (data.price < 200000) maxRooms = 10;
                else if (data.price < 400000) maxRooms = 15;
                else if (data.price < 800000) maxRooms = 20;
                else if (data.price < 1500000) maxRooms = 30;
                else maxRooms = 50;
              }
              
              if (value >= 1 && value <= maxRooms) {
                data.rooms = value;
              }
            }
          }

          if (!data.bedrooms) {
            const bedroomsMatch = caracText.match(/Chambres?\s*:?\s*(\d+)/i);
            if (bedroomsMatch) {
              const value = parseInt(bedroomsMatch[1], 10);
              
              let maxBedrooms = 20;
              if (data.price) {
                if (data.price < 150000) maxBedrooms = 6;
                else if (data.price < 300000) maxBedrooms = 10;
                else if (data.price < 500000) maxBedrooms = 15;
                else if (data.price < 1000000) maxBedrooms = 25;
                else if (data.price < 2000000) maxBedrooms = 40;
                else maxBedrooms = 100;
              }
              
              if (value >= 1 && value <= maxBedrooms) {
                data.bedrooms = value;
              }
            }
          }

          if (!data.bathrooms) {
            let totalBathrooms = 0;
            
            const salleDeBainsMatch = caracText.match(/Salle de bains?\s*:?\s*(\d+)/i);
            if (salleDeBainsMatch) {
              totalBathrooms += parseInt(salleDeBainsMatch[1], 10);
            }
            
            const salleDEauMatch = caracText.match(/Salle d'eau\s*:?\s*(\d+)/i);
            if (salleDEauMatch) {
              totalBathrooms += parseInt(salleDEauMatch[1], 10);
            }
            
            if (totalBathrooms > 0) {
              data.bathrooms = totalBathrooms;
            }
          }

          const wcMatch = caracText.match(/WC\s*:?\s*(\d+)/i);
          if (wcMatch) {
            data.wc_count = parseInt(wcMatch[1], 10);
          }

          const conditionMatch = caracText.match(/État intérieur\s*:?\s*([A-Za-zÀ-ÿ\s]+?)(?:Cuisine|Vue|Ameublement|Cave|Chauffage|$)/i);
          if (conditionMatch) {
            const rawCondition = clean(conditionMatch[1]).toLowerCase();
            
            if (rawCondition.includes('excellent')) {
              data.property_condition = 'Excellent';
            } else if (rawCondition.includes('bon')) {
              data.property_condition = 'Good';
            } else if (rawCondition.includes('rénov') || rawCondition.includes('travaux')) {
              data.property_condition = 'To Renovate';
            } else if (rawCondition.includes('neuf') || rawCondition.includes('récent')) {
              data.property_condition = 'New/Recent';
            } else {
              data.property_condition = clean(conditionMatch[1]);
            }
          }

          const yearMatch = caracText.match(/Construction\s*:?\s*(\d{4})/i);
          if (yearMatch) {
            const year = parseInt(yearMatch[1], 10);
            if (year >= 1000 && year <= 2030) {
              data.year_built = year;
            }
          }

          const heatingMatch = caracText.match(/Chauffage\s*:?\s*([^:]+?)(?:Piscine|Climatisation|Séjour|Chambres|Salle|WC|Cuisine|$)/i);
          if (heatingMatch) {
            data.heating_system = clean(heatingMatch[1]);
          }

          const drainageMatch = caracText.match(/Assainissement\s*:?\s*([^:]+?)(?:Localisation|Référence|Cuisine|Toiture|Niveaux|$)/i);
          if (drainageMatch) {
            const rawValue = clean(drainageMatch[1]).toLowerCase();
            
            if (rawValue.includes('tout') && rawValue.includes('égout')) {
              data.drainage_system = rawValue.includes('conforme') ? 'Mains (Compliant)' : 'Mains';
            } else if (rawValue.includes('individuel') || rawValue.includes('fosse') || rawValue.includes('septique')) {
              if (rawValue.includes('conforme') && !rawValue.includes('non')) {
                data.drainage_system = 'Individual (Compliant)';
              } else {
                data.drainage_system = 'Individual (Non-Compliant)';
              }
            } else if (rawValue.includes('collectif')) {
              data.drainage_system = 'Mains';
            } else {
              data.drainage_system = 'Individual (Non-Compliant)';
            }
          }

          // ===== POOL DETECTION =====
          const poolMatch = caracText.match(/Piscine\s*:?\s*([A-Za-z]+)/i);
          if (poolMatch) {
            const poolValue = clean(poolMatch[1]).toLowerCase();
            data.pool = poolValue === 'oui' || poolValue === 'yes';
          }

          if (!data.city || !data.postal_code) {
            const locMatch = caracText.match(/Localisation\s*:?\s*([A-Za-zÀ-ÿ'\- ]+)\s+(\d{5})/i);
            if (locMatch) {
              data.city = locMatch[1].trim();
              data.postal_code = locMatch[2];
            }
          }

          if (!data.reference) {
            const refMatch = caracText.match(/Référence\s*:?\s*(VM\d+)/i);
            if (refMatch) {
              data.reference = refMatch[1];
            }
          }
        }
      }

      // ===== POOL - ADDITIONAL STRATEGIES =====
      if (!data.pool && data.title) {
        if (data.title.toLowerCase().includes('piscine')) {
          data.pool = true;
        }
      }

      if (!data.pool) {
        const descriptionElements = document.querySelectorAll('[class*="description"], .comment, section [class*="text"], article [class*="text"], [class*="desc"]');
        for (const descEl of descriptionElements) {
          const descText = clean(descEl.textContent).toLowerCase();
          if (descText.includes('piscine')) {
            data.pool = true;
            break;
          }
        }
      }

      if (!data.pool) {
        const amenitiesHeadings = Array.from(document.querySelectorAll('h2, h3, h4, div, p')).filter(el => {
          const text = el.textContent.toLowerCase();
          return text.includes('points forts') || text.includes('atouts') || text.includes('équipements');
        });
        
        for (const heading of amenitiesHeadings) {
          let container = heading.nextElementSibling;
          if (!container || container.children.length === 0) {
            container = heading.parentElement;
          }
          
          if (container) {
            const text = container.textContent.toLowerCase();
            if (text.includes('piscine') && 
                (text.includes('avec piscine') || 
                 text.includes('piscine chauffée') ||
                 text.includes('piscine privée') ||
                 text.includes('piscine sécurisée') ||
                 text.includes('belle piscine') ||
                 text.includes('grande piscine'))) {
              data.pool = true;
              break;
            }
          }
        }
      }

      if (!data.pool) {
        const pageText = document.body.textContent.toLowerCase();
        const hasStrongIndicator = 
          pageText.includes('avec piscine') || 
          pageText.includes('piscine chauffée') ||
          pageText.includes('piscine privée') ||
          pageText.includes('piscine sécurisée') ||
          pageText.includes('et piscine') ||
          pageText.includes('+ piscine');
        
        const hasNegativeIndicator = 
          pageText.includes('pas de piscine') ||
          pageText.includes('sans piscine') ||
          pageText.includes('aucune piscine');
        
        if (hasStrongIndicator && !hasNegativeIndicator) {
          data.pool = true;
        }
      }

      // ===== DPE =====
      const pageText = document.body.textContent;

      const consumptionMatch = pageText.match(/(\d{1,4})\s*kWh\/m[²2]\.?\s*an/i);
      if (consumptionMatch) {
        data.energy_consumption = parseInt(consumptionMatch[1], 10);
      }

      const emissionsMatch = pageText.match(/(\d{1,4})\s*\*?\s*kg\s*CO2\/m[²2]\.?\s*an/i);
      if (emissionsMatch) {
        data.co2_emissions = parseInt(emissionsMatch[1], 10);
      }

      if (!data.energy_consumption) {
        const consumptionLabels = Array.from(document.querySelectorAll('*')).filter(el => {
          const text = el.textContent.toLowerCase();
          return text.includes('consommation') && text.length < 200 && el.children.length < 3;
        });
        
        for (const label of consumptionLabels) {
          const text = label.textContent;
          const match = text.match(/(\d{1,4})\s*kWh/i);
          if (match) {
            data.energy_consumption = parseInt(match[1], 10);
            break;
          }
        }
      }

      if (!data.co2_emissions) {
        const emissionLabels = Array.from(document.querySelectorAll('*')).filter(el => {
          const text = el.textContent.toLowerCase();
          return text.includes('émissions') && text.length < 200 && el.children.length < 3;
        });
        
        for (const label of emissionLabels) {
          const text = label.textContent;
          const match = text.match(/(\d{1,4})\s*\*?\s*kg\s*CO2/i);
          if (match) {
            data.co2_emissions = parseInt(match[1], 10);
            break;
          }
        }
      }

      // ===== FALLBACKS =====
      if (!data.land_surface) {
        const terrainValue = getTableValue('Terrain');
        if (terrainValue) {
          const match = terrainValue.match(/(\d+)(?:\s*a\s*(\d+)\s*ca)?\s*(a|m²|m2|ha|ca)?/i);
          if (match) {
            let val = parseInt(match[1], 10);
            const additionalCa = match[2] ? parseInt(match[2], 10) : 0;
            const unit = match[3] ? match[3].toLowerCase() : 'a';
            
            if (unit === 'a') {
              val = val * 100 + additionalCa;
            } else if (unit === 'ha') {
              val = val * 10000;
            } else if (unit === 'ca') {
              val = val * 1;
            }
            
            data.land_surface = val;
          }
        }
      }

      if (!data.bathrooms) {
        let totalBathrooms = 0;
        
        const bathroomValue = getTableValue('Salle de bain');
        if (bathroomValue) {
          const match = bathroomValue.match(/(\d+)/);
          if (match) {
            totalBathrooms += parseInt(match[1], 10);
          }
        }
        
        const showerValue = getTableValue("Salle d'eau");
        if (showerValue) {
          const match = showerValue.match(/(\d+)/);
          if (match) {
            totalBathrooms += parseInt(match[1], 10);
          }
        }
        
        if (totalBathrooms > 0) {
          data.bathrooms = totalBathrooms;
        }
      }

      if (!data.wc_count) {
        const wcValue = getTableValue('WC');
        if (wcValue) {
          const match = wcValue.match(/(\d+)/);
          if (match) {
            data.wc_count = parseInt(match[1], 10);
          }
        }
      }

      if (!data.drainage_system) {
        const drainageValue = getTableValue('Assainissement');
        if (drainageValue) {
          const rawValue = drainageValue.toLowerCase();
          
          if (rawValue.includes('tout') && rawValue.includes('égout')) {
            data.drainage_system = rawValue.includes('conforme') ? 'Mains (Compliant)' : 'Mains';
          } else if (rawValue.includes('individuel') || rawValue.includes('fosse') || rawValue.includes('septique')) {
            if (rawValue.includes('conforme') && !rawValue.includes('non')) {
              data.drainage_system = 'Individual (Compliant)';
            } else {
              data.drainage_system = 'Individual (Non-Compliant)';
            }
          } else if (rawValue.includes('collectif')) {
            data.drainage_system = 'Mains';
          } else {
            data.drainage_system = 'Individual (Non-Compliant)';
          }
        }
      }

      if (!data.heating_system) {
        data.heating_system = getTableValue('Chauffage');
      }

      if (!data.pool) {
        const poolValue = getTableValue('Piscine');
        if (poolValue) {
          const poolLower = poolValue.toLowerCase();
          data.pool = poolLower === 'oui' || poolLower === 'yes';
        }
      }

      if (!data.property_condition) {
        const conditionValue = getTableValue('État intérieur');
        if (conditionValue) {
          const rawCondition = conditionValue.toLowerCase();
          if (rawCondition.includes('excellent')) {
            data.property_condition = 'Excellent';
          } else if (rawCondition.includes('bon')) {
            data.property_condition = 'Good';
          } else if (rawCondition.includes('rénov') || rawCondition.includes('travaux')) {
            data.property_condition = 'To Renovate';
          } else if (rawCondition.includes('neuf') || rawCondition.includes('récent')) {
            data.property_condition = 'New/Recent';
          } else {
            data.property_condition = conditionValue;
          }
        }
      }

      if (!data.year_built) {
        const yearValue = getTableValue('Construction');
        if (yearValue) {
          const match = yearValue.match(/(\d{4})/);
          if (match) {
            const year = parseInt(match[1], 10);
            if (year >= 1000 && year <= 2030) {
              data.year_built = year;
            }
          }
        }
      }

      // ===== TITLE FALLBACKS =====
      if (!data.rooms) {
        const titleRoomsMatch = data.title.match(/(\d+)\s*pièces?/i);
        if (titleRoomsMatch) {
          const value = parseInt(titleRoomsMatch[1], 10);
          
          let maxRooms = 25;
          if (data.price) {
            if (data.price < 100000) maxRooms = 6;
            else if (data.price < 200000) maxRooms = 10;
            else if (data.price < 400000) maxRooms = 15;
            else if (data.price < 800000) maxRooms = 20;
            else if (data.price < 1500000) maxRooms = 30;
            else maxRooms = 50;
          }
          
          if (value >= 1 && value <= maxRooms) {
            data.rooms = value;
          }
        }
      }

      if (!data.bedrooms) {
        const titleBedroomsMatch = data.title.match(/(\d+)\s*chambres?/i);
        if (titleBedroomsMatch) {
          const value = parseInt(titleBedroomsMatch[1], 10);
          
          let maxBedrooms = 20;
          if (data.price) {
            if (data.price < 150000) maxBedrooms = 6;
            else if (data.price < 300000) maxBedrooms = 10;
            else if (data.price < 500000) maxBedrooms = 15;
            else if (data.price < 1000000) maxBedrooms = 25;
            else if (data.price < 2000000) maxBedrooms = 40;
            else maxBedrooms = 100;
          }
          
          if (value >= 1 && value <= maxBedrooms) {
            data.bedrooms = value;
          }
        }
      }

      // ===== LOCATION FALLBACK =====
      if (!data.city || !data.postal_code) {
        const breadcrumb = document.querySelector('nav, [class*="breadcrumb"]');
        if (breadcrumb) {
          const bcText = clean(breadcrumb.textContent);
          const loc = bcText.match(/([A-Za-zÀ-ÿ'\- ]+)\s+(\d{5})/);
          if (loc) {
            if (!data.city) data.city = loc[1].trim();
            if (!data.postal_code) data.postal_code = loc[2];
          }
        }

        if (!data.city || !data.postal_code) {
          const docTitle = document.querySelector('title');
          if (docTitle) {
            const t = clean(docTitle.textContent);
            
            const patterns = [
              /([A-Za-zÀ-ÿ'\- ]+)\s+(\d{5})/,
              /-\s+([A-Za-zÀ-ÿ'\- ]+)\s+(\d{5})$/,
              /situé à\s+([A-Za-zÀ-ÿ'\- ]+)\s*\((\d{5})\)/i
            ];
            
            for (const pattern of patterns) {
              const loc = t.match(pattern);
              if (loc) {
                if (!data.city) data.city = loc[1].trim();
                if (!data.postal_code) data.postal_code = loc[2];
                break;
              }
            }
          }
        }
      }

      if (data.city && data.city.toLowerCase().startsWith('localisation')) {
        data.city = data.city.replace(/^localisation\s*/i, '').trim();
      }

      // ===== IMAGES =====
      const LOGO_PATTERNS = ['logo', 'icon', 'placeholder'];
      const images = [];
      
      const allImages = document.querySelectorAll('img');
      
      allImages.forEach(img => {
        const src = img.currentSrc || img.src || img.getAttribute('data-src') || (img.getAttribute('srcset') || '').split(' ')[0];
        
        if (src && 
            src.includes('netty.') && 
            !LOGO_PATTERNS.some(p => src.toLowerCase().includes(p)) && 
            img.naturalWidth > 100) {
          
          if (!images.includes(src)) {
            images.push(src);
          }
        }
      });

      data.allImages = images;

      // ===== DESCRIPTION =====
      const descEl = document.querySelector('[class*="description"]') || document.querySelector('.comment') || document.querySelector('section [class*="text"], article [class*="text"]');
      data.description = descEl ? clean(descEl.textContent).substring(0, 500) : '';

      return data;
    });

    console.log(`✅ ${propertyData.reference}: ${propertyData.title.substring(0, 60)}`);
    
    return propertyData;
  } catch (error) {
    console.error(`❌ Error extracting ${url}:`, error.message);
    return null;
  }
}

// ========================================
// MAIN SCRAPER WITH SMART HYBRID APPROACH
// ========================================

async function scrapeEleonor(req, res, { puppeteer, chromium, supabase }) {
  try {
    const { searchUrl, maxPages = 3, priceUpdateMode = false } = req.body;

    if (!searchUrl) {
      return res.status(400).json({ error: 'searchUrl is required' });
    }

    console.log(`🎯 Starting Agence Eleonor scrape: ${searchUrl}`);
    if (priceUpdateMode) {
      console.log('💰 PRICE UPDATE MODE: Checking all existing properties for price changes\n');
    }

    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || chromium.executablePath,
      headless: true,
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const allProperties = [];
    const validationStats = { valid: 0, invalid: 0, total: 0 };

    // ===== PRICE UPDATE MODE =====
    if (priceUpdateMode) {
      const existingPropertiesMap = await getExistingProperties(supabase, 'agence-eleonor');
      const priceChanges = [];

      console.log(`🔍 Checking ${existingPropertiesMap.size} properties for price changes...\n`);

      let checked = 0;
      for (const [reference, existingData] of existingPropertiesMap.entries()) {
        checked++;
        console.log(`   [${checked}/${existingPropertiesMap.size}] Checking ${reference}...`);

        const detailData = await extractEleonorPropertyData(page, existingData.url);

        if (!detailData || !detailData.price) {
          console.log(`      ⚠️  Could not get price, skipping`);
          continue;
        }

        const updateData = {
          reference,
          url: existingData.url,
          price: detailData.price,
          last_seen_at: new Date().toISOString()
        };

        // Check for price change
        if (existingData.currentPrice && detailData.price !== existingData.currentPrice) {
          const priceDiff = detailData.price - existingData.currentPrice;
          const percentChange = ((priceDiff / existingData.currentPrice) * 100).toFixed(1);
          
          updateData.previous_price = existingData.currentPrice;
          updateData.price_changed_at = new Date().toISOString();
          updateData.price_drop_amount = priceDiff;
          
          if (priceDiff < 0) {
            console.log(`      💰📉 €${existingData.currentPrice} → €${detailData.price} (${percentChange}% DROP!)`);
          } else {
            console.log(`      💰📈 €${existingData.currentPrice} → €${detailData.price} (+${percentChange}%)`);
          }
          
          priceChanges.push({
            reference,
            oldPrice: existingData.currentPrice,
            newPrice: detailData.price,
            change: priceDiff,
            percentChange
          });
        } else {
          console.log(`      ✅ €${detailData.price} (no change)`);
        }

        allProperties.push(updateData);

        // Delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      await browser.close();

      // Save to database
      if (allProperties.length > 0) {
        console.log(`\n💾 Saving ${allProperties.length} price updates to database...`);
        await database.savePropertiesToDB(allProperties, 'agence-eleonor', supabase);
      }

      const summary = {
        success: true,
        message: `Price check complete for ${allProperties.length} properties`,
        stats: {
          checked: allProperties.length,
          price_changes: priceChanges.length
        },
        priceChanges: priceChanges
      };

      console.log('\n🎉 Price update complete!');
      console.log(`   Checked: ${allProperties.length}`);
      console.log(`   Price changes: ${priceChanges.length}`);

      return res.json(summary);
    }

    // ===== NORMAL SCRAPING MODE =====
    let currentPageNum = 1;
    const propertyMap = new Map();

    // PART 1: Collect all listings
    while (currentPageNum <= maxPages) {
      console.log(`📄 Scraping Agence Eleonor listing page ${currentPageNum}...`);

      const pageUrl = currentPageNum === 1 ? searchUrl : `${searchUrl}${searchUrl.includes('?') ? '&' : '?'}page=${currentPageNum}`;

      try {
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 3000));

        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.evaluate(() => window.scrollTo(0, 0));
        await new Promise(resolve => setTimeout(resolve, 1000));

        const cards = await extractEleonorListingCards(page);

        if (cards.length === 0) {
          console.log(`   ✅ Reached end of Agence Eleonor listings at page ${currentPageNum - 1}`);
          break;
        }

        cards.forEach(card => {
          if (card.url && !propertyMap.has(card.url)) {
            propertyMap.set(card.url, card);
          }
        });

        console.log(`   Found ${cards.length} Agence Eleonor properties on page ${currentPageNum}`);
        currentPageNum++;
      } catch (pageError) {
        console.error(`Error on listing page ${currentPageNum}:`, pageError.message);
        break;
      }
    }

    console.log(`\n✅ Found ${propertyMap.size} unique Agence Eleonor properties from listing pages\n`);

    // PART 2: Smart filtering - separate existing vs new
    const existingPropertiesMap = await getExistingProperties(supabase, 'agence-eleonor');

    const existingProperties = [];
    const newProperties = [];

    for (const [url, listingData] of propertyMap.entries()) {
      const ref = url.split(',').pop();
      
      if (existingPropertiesMap.has(ref)) {
        const existingData = existingPropertiesMap.get(ref);
        existingProperties.push({ url, listingData, reference: ref, existingData });
      } else {
        newProperties.push({ url, listingData, reference: ref });
      }
    }

    console.log(`📊 Split: ${existingProperties.length} existing (last_seen update only) + ${newProperties.length} new (full scrape)\n`);

    // PART 3: Quick updates for existing properties (ONLY last_seen_at - NO DETAIL PAGE VISITS!)
    if (existingProperties.length > 0) {
      console.log('✅ Updating existing properties (marking as still active)...\n');

      for (const { url, listingData, reference, existingData } of existingProperties) {
        const updateData = {
          reference,
          url,
          price: existingData.currentPrice, // Keep existing price
          last_seen_at: new Date().toISOString()
        };
        
        console.log(`   ✅ ${reference} (still active)`);
        allProperties.push(updateData);
      }

      console.log(`\n✅ ${existingProperties.length} existing properties marked as active (NO detail scraping)\n`);
    }

    // PART 4: Full detail scraping for NEW properties
    if (newProperties.length > 0) {
      console.log(`🔍 Full scraping for ${newProperties.length} NEW properties...\n`);

      let scrapedCount = 0;
      for (const { url, listingData, reference } of newProperties) {
        const detailData = await extractEleonorPropertyData(page, url);

        if (!detailData) {
          console.log(`⚠️  Skipping ${url} - detail page failed`);
          continue;
        }

        const propertyData = {
          ...listingData,
          ...detailData,
          price: detailData.price || listingData.price,
          rooms: detailData.rooms || listingData.rooms,
          building_surface: detailData.building_surface || listingData.building_surface,
          city: detailData.city || listingData.city,
          postal_code: detailData.postal_code || listingData.postal_code
        };

        if (!propertyData.price) {
          console.log(`⚠️  Skipping ${url} - no valid price`);
          continue;
        }

        const finalImages = [];
        
        if (detailData.allImages && detailData.allImages.length > 0) {
          finalImages.push(...detailData.allImages);
        }

        propertyData.images = finalImages.slice(0, 10);

        const validation = validatePropertyData({
          price: propertyData.price,
          surface: propertyData.building_surface,
          rooms: propertyData.rooms,
          bedrooms: propertyData.bedrooms,
          city: propertyData.city,
          postal_code: propertyData.postal_code
        });

        validationStats.total++;
        if (validation.isValid) {
          validationStats.valid++;
        } else {
          validationStats.invalid++;
        }

        const finalProperty = {
          source: 'agence-eleonor',
          url: propertyData.url || url,
          reference: propertyData.reference,
          title: propertyData.title,
          description: propertyData.description || '',
          price: propertyData.price,
          property_type: propertyData.property_type,
          rooms: propertyData.rooms,
          bedrooms: propertyData.bedrooms,
          building_surface: propertyData.building_surface,
          land_surface: propertyData.land_surface,
          city: propertyData.city,
          postal_code: propertyData.postal_code,
          bathrooms: propertyData.bathrooms,
          wc_count: propertyData.wc_count,
          heating_system: propertyData.heating_system,
          drainage_system: propertyData.drainage_system,
          pool: propertyData.pool,
          property_condition: propertyData.property_condition,
          year_built: propertyData.year_built,
          energy_consumption: propertyData.energy_consumption,
          co2_emissions: propertyData.co2_emissions,
          images: JSON.stringify(propertyData.images),
          data_quality_score: validation.score,
          validation_errors: JSON.stringify(validation.errors),
          raw_data: JSON.stringify({
            source: 'agence-eleonor',
            scrapedAt: new Date().toISOString(),
            imageCount: propertyData.images.length,
            scraper_version: '3.0'
          }),
          last_seen_at: new Date().toISOString()
        };

        allProperties.push(finalProperty);
        scrapedCount++;

        console.log(`   💰 €${finalProperty.price} | 🛏️ ${finalProperty.rooms || 'N/A'} pcs | 🚪 ${finalProperty.bedrooms || 'N/A'} ch | 📐 ${finalProperty.building_surface || 'N/A'}m²`);
        if (finalProperty.pool) console.log(`   🏊 Pool: Yes`);
        if (finalProperty.energy_consumption || finalProperty.co2_emissions) {
          console.log(`   ⚡ DPE: ${finalProperty.energy_consumption || '?'} kWh/m².an | ${finalProperty.co2_emissions || '?'} kg CO2/m².an`);
        }
      }

      console.log(`\n✅ ${scrapedCount} new properties fully scraped\n`);
    }

    await browser.close();

    // Save to database
    if (allProperties.length > 0) {
      console.log(`💾 Saving ${allProperties.length} properties to database...`);
      await database.savePropertiesToDB(allProperties, 'agence-eleonor', supabase);
    }

    const summary = {
      success: true,
      message: `Scraped ${allProperties.length} Agence Eleonor properties`,
      stats: {
        total: allProperties.length,
        existing_updated: existingProperties.length,
        new_scraped: newProperties.length,
        validation: validationStats
      }
    };

    console.log('\n🎉 Scraping complete!');
    console.log(`   Total: ${allProperties.length}`);
    console.log(`   Existing (marked active): ${existingProperties.length}`);
    console.log(`   New (full scrape): ${newProperties.length}`);
    console.log(`   Valid: ${validationStats.valid}`);

    res.json(summary);

  } catch (error) {
    console.error('❌ Scraper error:', error.message);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { scrapeEleonor };
