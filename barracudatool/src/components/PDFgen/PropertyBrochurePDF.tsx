import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

interface BrandingData {
  company_name: string;
  contact_phone: string;
  contact_email: string;
  brand_color: string;
  logo_url: string | null;
}

interface PropertyData {
  id: string;
  title: string;
  price: string;
  location_city: string;
  location_department: string;
  location_postal_code: string;
  surface: string;
  rooms: number;
  bedrooms: number;
  bathrooms?: number;
  land_surface?: number;
  building_surface?: number;
  floors?: number;
  description?: string;
  images: string[];
  property_type: string;
  pool?: boolean;
  heating_system?: string;
  drainage_system?: string;
  property_condition?: string;
  year_built?: number;
  wc_count?: number;
  energy_consumption?: number;
  co2_emissions?: number;
  source: string;
  reference: string;
  url: string;
}

const createStyles = (brandColor: string) => StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  
  // COVER PAGE STYLES
  coverPage: {
    backgroundColor: '#000000',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: 0.6,
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  coverContent: {
    position: 'absolute',
    bottom: 60,
    left: 50,
    right: 50,
  },
  coverTitle: {
    fontSize: 42,
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 10,
    letterSpacing: 1,
  },
  coverLocation: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  coverPrice: {
    fontSize: 48,
    color: brandColor,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  coverBranding: {
    position: 'absolute',
    top: 40,
    right: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 15,
    borderRadius: 4,
  },
  coverBrandName: {
    fontSize: 14,
    color: '#000000',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  
  // CONTENT PAGE STYLES
  contentPage: {
    padding: 50,
  },
  
  // HEADER STYLES (for content pages)
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pageHeaderBrand: {
    fontSize: 10,
    color: '#000000',
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  pageHeaderNumber: {
    fontSize: 9,
    color: '#666666',
  },
  
  // SECTION STYLES
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    color: '#000000',
    fontWeight: 'bold',
    marginBottom: 15,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: brandColor,
    marginBottom: 20,
  },
  
  // DESCRIPTION
  description: {
    fontSize: 11,
    lineHeight: 1.8,
    color: '#333333',
    textAlign: 'justify',
  },
  
  // KEY FEATURES GRID
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginTop: 20,
  },
  featureBox: {
    width: '30%',
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderLeftWidth: 3,
    borderLeftColor: brandColor,
  },
  featureLabel: {
    fontSize: 8,
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },
  featureValue: {
    fontSize: 18,
    color: '#000000',
    fontWeight: 'bold',
  },
  featureUnit: {
    fontSize: 10,
    color: '#666666',
    marginTop: 2,
  },
  
  // DETAILS TABLE
  detailsTable: {
    marginTop: 20,
  },
  detailRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 10,
    color: '#666666',
    width: '40%',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 11,
    color: '#000000',
    width: '60%',
    fontWeight: 'bold',
  },
  
  // GALLERY STYLES
galleryGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  marginTop: 20,
},
galleryImage: {
  width: '48%',
  height: 250,
  objectFit: 'cover',
  marginBottom: 20,
},

  
  // FOOTER
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    color: '#ffffff',
    fontSize: 9,
    marginBottom: 3,
  },
  footerBrand: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  
  // AMENITIES BADGES
  amenitiesBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 15,
  },
  amenityBadge: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d0d0d0',
  },
  amenityText: {
    fontSize: 9,
    color: '#333333',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // ENERGY PERFORMANCE
  energyContainer: {
    backgroundColor: '#f8f8f8',
    padding: 20,
    borderRadius: 4,
    marginTop: 20,
  },
  energyTitle: {
    fontSize: 12,
    color: '#000000',
    fontWeight: 'bold',
    marginBottom: 15,
    textTransform: 'uppercase',
  },
  energyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  energyLabel: {
    fontSize: 10,
    color: '#666666',
  },
  energyValue: {
    fontSize: 11,
    color: '#000000',
    fontWeight: 'bold',
  },
});

const getProxiedImageUrl = (imageUrl: string): string => {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('data:') || imageUrl.startsWith('/')) {
    return imageUrl;
  }
  return `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
};

export const PropertyBrochurePDF = ({ property, branding }: { property: PropertyData; branding: BrandingData }) => {
  const styles = createStyles(branding.brand_color);
  
  const validImages = property.images
    .filter(img => img && img.trim() !== '')
    .map(img => getProxiedImageUrl(img));

  // Chunk remaining images for gallery (4 per page)
  const galleryImages = validImages.slice(1);
  const imageChunks: string[][] = [];
  for (let i = 0; i < galleryImages.length; i += 4) {
    imageChunks.push(galleryImages.slice(i, i + 4));
  }

  // Collect amenities
  const amenities = [];
  if (property.pool) amenities.push('Swimming Pool');
  if (property.heating_system) amenities.push(property.heating_system);
  if (property.property_condition) amenities.push(property.property_condition);
  if (property.year_built) amenities.push(`Built ${property.year_built}`);
  if (property.bathrooms) amenities.push(`${property.bathrooms} Bath${property.bathrooms > 1 ? 's' : ''}`);
  if (property.land_surface) amenities.push(`${property.land_surface}m² Land`);

  return (
    <Document>
      {/* COVER PAGE */}
      <Page size="A4" style={styles.coverPage}>
        {validImages[0] && (
          <Image src={validImages[0]} style={styles.coverImage} />
        )}
        <View style={styles.coverOverlay} />
        
        {/* Branding badge */}
        <View style={styles.coverBranding}>
          <Text style={styles.coverBrandName}>{branding.company_name}</Text>
        </View>
        
        {/* Property info overlay */}
        <View style={styles.coverContent}>
          <Text style={styles.coverTitle}>{property.title}</Text>
          <Text style={styles.coverLocation}>
            {property.location_city}, {property.location_department}
          </Text>
          <Text style={styles.coverPrice}>
            €{parseInt(property.price, 10).toLocaleString()}
          </Text>
        </View>
      </Page>

      {/* PAGE 2: OVERVIEW & DESCRIPTION */}
      <Page size="A4" style={styles.contentPage}>
        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageHeaderBrand}>{branding.company_name}</Text>
          <Text style={styles.pageHeaderNumber}>Property Details</Text>
        </View>

        {/* Overview Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.divider} />
          
          <View style={styles.featuresGrid}>
            <View style={styles.featureBox}>
              <Text style={styles.featureLabel}>Living Space</Text>
              <Text style={styles.featureValue}>{property.surface}</Text>
              <Text style={styles.featureUnit}>square meters</Text>
            </View>
            
            <View style={styles.featureBox}>
              <Text style={styles.featureLabel}>Bedrooms</Text>
              <Text style={styles.featureValue}>{property.bedrooms}</Text>
              <Text style={styles.featureUnit}>rooms</Text>
            </View>
            
            <View style={styles.featureBox}>
              <Text style={styles.featureLabel}>Total Rooms</Text>
              <Text style={styles.featureValue}>{property.rooms}</Text>
              <Text style={styles.featureUnit}>rooms</Text>
            </View>
            
            {property.land_surface && (
              <View style={styles.featureBox}>
                <Text style={styles.featureLabel}>Land Surface</Text>
                <Text style={styles.featureValue}>{property.land_surface}</Text>
                <Text style={styles.featureUnit}>square meters</Text>
              </View>
            )}
            
            {property.building_surface && (
              <View style={styles.featureBox}>
                <Text style={styles.featureLabel}>Building</Text>
                <Text style={styles.featureValue}>{property.building_surface}</Text>
                <Text style={styles.featureUnit}>square meters</Text>
              </View>
            )}
            
            <View style={styles.featureBox}>
              <Text style={styles.featureLabel}>Property Type</Text>
              <Text style={styles.featureValue}>{property.property_type}</Text>
            </View>
          </View>
        </View>

        {/* Amenities */}
        {amenities.length > 0 && (
          <View style={styles.amenitiesBadges}>
            {amenities.map((amenity, idx) => (
              <View key={idx} style={styles.amenityBadge}>
                <Text style={styles.amenityText}>{amenity}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Description */}
        {property.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About This Property</Text>
            <View style={styles.divider} />
            <Text style={styles.description}>{property.description}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerText}>{branding.contact_email}</Text>
            <Text style={styles.footerText}>{branding.contact_phone}</Text>
          </View>
          <Text style={styles.footerBrand}>{branding.company_name}</Text>
        </View>
      </Page>

      {/* PAGE 3: DETAILED SPECIFICATIONS */}
      <Page size="A4" style={styles.contentPage}>
        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageHeaderBrand}>{branding.company_name}</Text>
          <Text style={styles.pageHeaderNumber}>Specifications</Text>
        </View>

        {/* Property Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Details</Text>
          <View style={styles.divider} />
          
          <View style={styles.detailsTable}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Property Type</Text>
              <Text style={styles.detailValue}>{property.property_type}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Living Surface</Text>
              <Text style={styles.detailValue}>{property.surface} m²</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Rooms</Text>
              <Text style={styles.detailValue}>{property.rooms}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Bedrooms</Text>
              <Text style={styles.detailValue}>{property.bedrooms}</Text>
            </View>
            
            {property.bathrooms && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Bathrooms</Text>
                <Text style={styles.detailValue}>{property.bathrooms}</Text>
              </View>
            )}
            
            {property.wc_count && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>WC Count</Text>
                <Text style={styles.detailValue}>{property.wc_count}</Text>
              </View>
            )}
            
            {property.land_surface && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Land Surface</Text>
                <Text style={styles.detailValue}>{property.land_surface} m²</Text>
              </View>
            )}
            
            {property.building_surface && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Building Surface</Text>
                <Text style={styles.detailValue}>{property.building_surface} m²</Text>
              </View>
            )}
            
            {property.floors && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Floors</Text>
                <Text style={styles.detailValue}>{property.floors}</Text>
              </View>
            )}
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Swimming Pool</Text>
              <Text style={styles.detailValue}>{property.pool ? 'Yes' : 'No'}</Text>
            </View>
            
            {property.property_condition && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Condition</Text>
                <Text style={styles.detailValue}>{property.property_condition}</Text>
              </View>
            )}
            
            {property.year_built && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Year Built</Text>
                <Text style={styles.detailValue}>{property.year_built}</Text>
              </View>
            )}
            
            {property.heating_system && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Heating</Text>
                <Text style={styles.detailValue}>{property.heating_system}</Text>
              </View>
            )}
            
            {property.drainage_system && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Drainage</Text>
                <Text style={styles.detailValue}>{property.drainage_system}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Energy Performance */}
        {(property.energy_consumption || property.co2_emissions) && (
          <View style={styles.energyContainer}>
            <Text style={styles.energyTitle}>Energy Performance</Text>
            
            {property.energy_consumption && (
              <View style={styles.energyRow}>
                <Text style={styles.energyLabel}>Energy Consumption</Text>
                <Text style={styles.energyValue}>{property.energy_consumption} kWh/m²/year</Text>
              </View>
            )}
            
            {property.co2_emissions && (
              <View style={styles.energyRow}>
                <Text style={styles.energyLabel}>CO2 Emissions</Text>
                <Text style={styles.energyValue}>{property.co2_emissions} kg CO2/m²/year</Text>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerText}>{branding.contact_email}</Text>
            <Text style={styles.footerText}>{branding.contact_phone}</Text>
          </View>
          <Text style={styles.footerBrand}>{branding.company_name}</Text>
        </View>
      </Page>

      {/* GALLERY PAGES (4 images per page - 2x2 grid) */}
{imageChunks.map((chunk, pageIndex) => (
  <Page key={`gallery-${pageIndex}`} size="A4" style={styles.contentPage}>
    {/* Header */}
    <View style={styles.pageHeader}>
      <Text style={styles.pageHeaderBrand}>{branding.company_name}</Text>
      <Text style={styles.pageHeaderNumber}>Gallery</Text>
    </View>

    {/* Gallery Grid - 2x2 */}
    <View style={styles.section}>
      <View style={styles.galleryGrid}>
        {chunk.map((img, imgIndex) => (
          <Image 
            key={`img-${pageIndex}-${imgIndex}`}
            src={img} 
            style={styles.galleryImage} 
          />
        ))}
      </View>
    </View>

    {/* Footer */}
    <View style={styles.footer}>
      <View>
        <Text style={styles.footerText}>{branding.contact_email}</Text>
        <Text style={styles.footerText}>{branding.contact_phone}</Text>
      </View>
      <Text style={styles.footerBrand}>{branding.company_name}</Text>
    </View>
  </Page>
))}

    </Document>
  );
};
