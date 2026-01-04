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
    location_city: string;  // ✅ Changed from locationCity
    surface: string;
    rooms: number;
    bedrooms: number;
    bathrooms?: number;
    land_surface?: number;  // ✅ Changed from landsurface
    description?: string;
    images: string[];
    property_type: string;  // ✅ Changed from propertytype
    pool?: boolean;
    heating_system?: string;  // ✅ Changed from heatingsystem
    year_built?: number;  // ✅ Changed from yearbuilt
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
  },
  companyName: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  title: {
    fontSize: 20,
    color: '#1a1a1a',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  price: {
    fontSize: 32,
    color: brandColor,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  section: {
    marginBottom: 15,
  },
  label: {
    fontSize: 10,
    color: '#666666',
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  value: {
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 10,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 15,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 9,
    color: '#666666',
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  description: {
    fontSize: 11,
    lineHeight: 1.6,
    color: '#333333',
    marginVertical: 15,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    backgroundColor: brandColor,
    padding: 15,
    borderRadius: 8,
  },
  footerText: {
    color: '#ffffff',
    fontSize: 11,
    marginBottom: 3,
  },
  image: {
    width: '100%',
    height: 300,
    objectFit: 'cover',
    marginVertical: 15,
    borderRadius: 8,
  },
});

export const PropertyBrochurePDF = ({ property, branding }: { property: PropertyData; branding: BrandingData }) => {
  const styles = createStyles(branding.brand_color);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with Branding */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{branding.company_name || 'Real Estate Agency'}</Text>
        </View>

        {/* Property Title & Price */}
        <Text style={styles.title}>{property.title}</Text>
        <Text style={styles.price}>€{parseInt(property.price, 10).toLocaleString()}</Text>

        {/* Main Image */}
        {property.images[0] && (
          <Image src={property.images[0]} style={styles.image} />
        )}

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.label}>Location</Text>
          <Text style={styles.value}>{property.location_city}</Text>
        </View>

        {/* Key Details Grid */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Surface</Text>
            <Text style={styles.detailValue}>{property.surface}m²</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Rooms</Text>
            <Text style={styles.detailValue}>{property.rooms}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Bedrooms</Text>
            <Text style={styles.detailValue}>{property.bedrooms}</Text>
          </View>
          {property.bathrooms && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Bathrooms</Text>
              <Text style={styles.detailValue}>{property.bathrooms}</Text>
            </View>
          )}
        </View>

        {/* Additional Features */}
        <View style={styles.section}>
          <Text style={styles.label}>Property Type</Text>
          <Text style={styles.value}>{property.property_type}</Text>
        </View>

        {property.land_surface && (
          <View style={styles.section}>
            <Text style={styles.label}>Land Surface</Text>
            <Text style={styles.value}>{property.land_surface}m²</Text>
          </View>
        )}

        {/* Description */}
        {property.description && (
          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.description}>{property.description}</Text>
          </View>
        )}

        {/* Contact Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Contact: {branding.contact_email}</Text>
          <Text style={styles.footerText}>Phone: {branding.contact_phone}</Text>
        </View>
      </Page>
    </Document>
  );
};
