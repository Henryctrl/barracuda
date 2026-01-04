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
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    backgroundColor: brandColor,
    padding: 20,
    marginBottom: 20,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  companyName: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 22,
    color: '#1a1a1a',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  propertyType: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 15,
    textTransform: 'uppercase',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  price: {
    fontSize: 32,
    color: brandColor,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    color: brandColor,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: brandColor,
    paddingBottom: 3,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 15,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  detailItem: {
    width: '23%',
    marginBottom: 10,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 8,
    color: '#666666',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  detailValueLarge: {
    fontSize: 16,
    fontWeight: 'bold',
    color: brandColor,
  },
  description: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#333333',
    marginVertical: 10,
    textAlign: 'justify',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    backgroundColor: brandColor,
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    color: '#ffffff',
    fontSize: 9,
    marginBottom: 2,
  },
  mainImage: {
    width: '100%',
    height: 300,
    objectFit: 'cover',
    marginVertical: 15,
    borderRadius: 8,
  },
  locationBadge: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 5,
    marginBottom: 15,
  },
  locationText: {
    fontSize: 11,
    color: '#333333',
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  featureLabel: {
    fontSize: 10,
    color: '#666666',
    width: '40%',
  },
  featureValue: {
    fontSize: 10,
    color: '#1a1a1a',
    fontWeight: 'bold',
    width: '60%',
  },
  badge: {
    backgroundColor: brandColor,
    color: '#ffffff',
    fontSize: 8,
    padding: 5,
    borderRadius: 3,
    marginRight: 5,
    textTransform: 'uppercase',
  },
  badgeContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    flexWrap: 'wrap',
  },
  pageNumber: {
    position: 'absolute',
    fontSize: 10,
    bottom: 10,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#666666',
  },
  noImageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 15,
  },
  noImageText: {
    fontSize: 14,
    color: '#999999',
  },
  // Gallery styles - 4 images per page
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 15,
  },
  galleryImage: {
    width: '48%',
    height: 200,
    objectFit: 'cover',
    borderRadius: 5,
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

  console.log('📸 Total images for PDF:', validImages.length);

  // Chunk images for gallery (4 per page, skipping first image)
  const galleryImages = validImages.slice(1);
  const imageChunks: string[][] = [];
  for (let i = 0; i < galleryImages.length; i += 4) {
    imageChunks.push(galleryImages.slice(i, i + 4));
  }

  return (
    <Document>
      {/* PAGE 1: Main Property Details */}
      <Page size="A4" style={styles.page}>
        {/* Header with Branding */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{branding.company_name || 'Real Estate Agency'}</Text>
          </View>
        </View>

        {/* Property Title & Type */}
        <Text style={styles.title}>{property.title}</Text>
        <Text style={styles.propertyType}>{property.property_type}</Text>

        {/* Badges */}
        <View style={styles.badgeContainer}>
          {property.pool && <Text style={styles.badge}>Pool</Text>}
          {property.property_condition && <Text style={styles.badge}>{property.property_condition}</Text>}
          {property.year_built && <Text style={styles.badge}>Built {property.year_built}</Text>}
        </View>

        {/* Main Image (Large) */}
        {validImages[0] ? (
          <Image src={validImages[0]} style={styles.mainImage} />
        ) : (
          <View style={styles.noImageContainer}>
            <Text style={styles.noImageText}>No image available</Text>
          </View>
        )}

        {/* Price */}
        <View style={styles.priceContainer}>
          <Text style={styles.price}>€{parseInt(property.price, 10).toLocaleString()}</Text>
        </View>

        {/* Location */}
        <View style={styles.locationBadge}>
          <Text style={styles.locationText}>
            📍 {property.location_city}, {property.location_department} ({property.location_postal_code})
          </Text>
        </View>

        {/* Key Details Grid */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Living Surface</Text>
            <Text style={styles.detailValueLarge}>{property.surface}m²</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Rooms</Text>
            <Text style={styles.detailValueLarge}>{property.rooms}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Bedrooms</Text>
            <Text style={styles.detailValueLarge}>{property.bedrooms}</Text>
          </View>
          {property.bathrooms && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Bathrooms</Text>
              <Text style={styles.detailValueLarge}>{property.bathrooms}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {property.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Property Description</Text>
            <Text style={styles.description}>{property.description}</Text>
          </View>
        )}

        {/* Contact Footer */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerText}>📧 {branding.contact_email}</Text>
            <Text style={styles.footerText}>📞 {branding.contact_phone}</Text>
          </View>
          <View>
            <Text style={styles.footerText}>{branding.company_name}</Text>
          </View>
        </View>

        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
          `Page ${pageNumber} of ${totalPages}`
        )} fixed />
      </Page>

      {/* PAGE 2: Additional Details */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{branding.company_name}</Text>
        </View>

        <Text style={styles.title}>Property Features & Specifications</Text>

        {/* Technical Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Technical Information</Text>
          
          {property.heating_system && (
            <View style={styles.featureRow}>
              <Text style={styles.featureLabel}>Heating System:</Text>
              <Text style={styles.featureValue}>{property.heating_system}</Text>
            </View>
          )}
          
          {property.drainage_system && (
            <View style={styles.featureRow}>
              <Text style={styles.featureLabel}>Drainage:</Text>
              <Text style={styles.featureValue}>{property.drainage_system}</Text>
            </View>
          )}
          
          {property.floors && (
            <View style={styles.featureRow}>
              <Text style={styles.featureLabel}>Number of Floors:</Text>
              <Text style={styles.featureValue}>{property.floors}</Text>
            </View>
          )}
          
          {property.wc_count && (
            <View style={styles.featureRow}>
              <Text style={styles.featureLabel}>WC Count:</Text>
              <Text style={styles.featureValue}>{property.wc_count}</Text>
            </View>
          )}
          
          {property.year_built && (
            <View style={styles.featureRow}>
              <Text style={styles.featureLabel}>Year Built:</Text>
              <Text style={styles.featureValue}>{property.year_built}</Text>
            </View>
          )}
        </View>

        {/* Energy Performance */}
        {(property.energy_consumption || property.co2_emissions) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Energy Performance</Text>
            
            {property.energy_consumption && (
              <View style={styles.featureRow}>
                <Text style={styles.featureLabel}>Energy Consumption:</Text>
                <Text style={styles.featureValue}>{property.energy_consumption} kWh/m²/year</Text>
              </View>
            )}
            
            {property.co2_emissions && (
              <View style={styles.featureRow}>
                <Text style={styles.featureLabel}>CO2 Emissions:</Text>
                <Text style={styles.featureValue}>{property.co2_emissions} kg CO2/m²/year</Text>
              </View>
            )}
          </View>
        )}

        {/* Property Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Overview</Text>
          
          <View style={styles.featureRow}>
            <Text style={styles.featureLabel}>Property Type:</Text>
            <Text style={styles.featureValue}>{property.property_type}</Text>
          </View>
          
          {property.property_condition && (
            <View style={styles.featureRow}>
              <Text style={styles.featureLabel}>Condition:</Text>
              <Text style={styles.featureValue}>{property.property_condition}</Text>
            </View>
          )}
          
          <View style={styles.featureRow}>
            <Text style={styles.featureLabel}>Total Rooms:</Text>
            <Text style={styles.featureValue}>{property.rooms}</Text>
          </View>
          
          <View style={styles.featureRow}>
            <Text style={styles.featureLabel}>Bedrooms:</Text>
            <Text style={styles.featureValue}>{property.bedrooms}</Text>
          </View>
          
          {property.bathrooms && (
            <View style={styles.featureRow}>
              <Text style={styles.featureLabel}>Bathrooms:</Text>
              <Text style={styles.featureValue}>{property.bathrooms}</Text>
            </View>
          )}
          
          <View style={styles.featureRow}>
            <Text style={styles.featureLabel}>Swimming Pool:</Text>
            <Text style={styles.featureValue}>{property.pool ? 'Yes' : 'No'}</Text>
          </View>
          
          <View style={styles.featureRow}>
            <Text style={styles.featureLabel}>Living Surface:</Text>
            <Text style={styles.featureValue}>{property.surface} m²</Text>
          </View>
          
          {property.land_surface && (
            <View style={styles.featureRow}>
              <Text style={styles.featureLabel}>Land Surface:</Text>
              <Text style={styles.featureValue}>{property.land_surface} m²</Text>
            </View>
          )}
          
          {property.building_surface && (
            <View style={styles.featureRow}>
              <Text style={styles.featureLabel}>Building Surface:</Text>
              <Text style={styles.featureValue}>{property.building_surface} m²</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerText}>📧 {branding.contact_email}</Text>
            <Text style={styles.footerText}>📞 {branding.contact_phone}</Text>
          </View>
          <View>
            <Text style={styles.footerText}>{branding.company_name}</Text>
          </View>
        </View>

        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
          `Page ${pageNumber} of ${totalPages}`
        )} fixed />
      </Page>

      {/* PAGE 3+: Photo Gallery (4 images per page) */}
      {imageChunks.map((chunk, pageIndex) => (
        <Page key={`gallery-${pageIndex}`} size="A4" style={styles.page}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.companyName}>{branding.company_name}</Text>
          </View>

          <Text style={styles.title}>Photo Gallery - Page {pageIndex + 1}</Text>

          {/* 4 Images in grid (2x2) */}
          <View style={styles.galleryGrid}>
            {chunk.map((img, imgIndex) => (
              <Image 
                key={`img-${pageIndex}-${imgIndex}`}
                src={img} 
                style={styles.galleryImage} 
              />
            ))}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View>
              <Text style={styles.footerText}>📧 {branding.contact_email}</Text>
              <Text style={styles.footerText}>📞 {branding.contact_phone}</Text>
            </View>
            <View>
              <Text style={styles.footerText}>{branding.company_name}</Text>
            </View>
          </View>

          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
            `Page ${pageNumber} of ${totalPages}`
          )} fixed />
        </Page>
      ))}
    </Document>
  );
};
