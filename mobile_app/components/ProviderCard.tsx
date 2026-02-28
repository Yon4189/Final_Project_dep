import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../app/constants/Colors';
import type { ServiceProvider, ProfessionalService } from '../app/types/customer.types';

type Props = {
  name: string;
  role: string;
  rating: number;
  reviews: number;
  image: any;
  services?: ProfessionalService[];
  location?: { latitude: number; longitude: number };
  distance?: number;
  onPress: () => void;
  showDistance?: boolean;
  showBadges?: boolean;
  showActions?: boolean;
};

export default function ProviderCard({ 
  name, 
  role, 
  rating, 
  reviews, 
  image, 
  services = [],
  location,
  distance,
  onPress,
  showDistance = false,
  showBadges = false,
  showActions = false 
}: Props) {
  return (
    <View style={styles.container}>
      <Image source={image} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.role}>{role}</Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={14} color={Colors.warning} />
          <Text style={styles.rating}>{rating.toFixed(1)}</Text>
          <Text style={styles.reviews}>({reviews} reviews)</Text>
        </View>
        {showDistance && distance && (
          <View style={styles.distanceContainer}>
            <Ionicons name="location" size={14} color={Colors.text.secondary} />
            <Text style={styles.distance}>
              {distance < 1 
                ? `${Math.round(distance * 1000)}m` 
                : `${distance.toFixed(1)}km`
              }
            </Text>
          </View>
        )}
        {showBadges && (
          <View style={styles.badges}>
            {rating >= 4.5 && <View style={styles.badge}><Text style={styles.badgeText}>Top Rated</Text></View>}
            <View style={styles.badge}><Text style={styles.badgeText}>Verified</Text></View>
          </View>
        )}
        {services && services.length > 0 && (
          <View style={styles.servicesContainer}>
            <Text style={styles.servicesTitle}>Services:</Text>
            {services.slice(0, 3).map((service, index) => (
              <Text key={index} style={styles.serviceItem}>• {service.name || service}</Text>
            ))}
            {services.length > 3 && (
              <Text style={styles.moreServices}>+{services.length - 3} more</Text>
            )}
          </View>
        )}
        {showActions && (
          <TouchableOpacity style={styles.button} onPress={onPress}>
            <Text style={styles.buttonText}>View Profile & Book</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  image: { width: 60, height: 60, borderRadius: 30, marginRight: 12 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  role: { fontSize: 14, color: '#666' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  rating: { fontSize: 14, fontWeight: '600', marginLeft: 4 },
  reviews: { fontSize: 12, marginVertical: 4 },
  distanceContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  distance: { fontSize: 12, color: Colors.text.secondary, marginLeft: 4 },
  badges: { flexDirection: 'row', marginTop: 4 },
  badge: { backgroundColor: Colors.success, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  servicesContainer: { marginTop: 8 },
  servicesTitle: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  serviceItem: { fontSize: 12, color: Colors.text.secondary, marginBottom: 2 },
  moreServices: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  button: { backgroundColor: '#0A84FF', padding: 8, borderRadius: 8, alignSelf: 'flex-start', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 12, fontWeight: '600' }
});
