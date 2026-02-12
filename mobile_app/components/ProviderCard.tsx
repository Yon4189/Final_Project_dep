import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  name: string;
  role: string;
  rating: number;
  reviews: number;
  image: any;
  onPress: () => void;
};

export default function ProviderCard({ name, role, rating, reviews, image, onPress }: Props) {
  return (
    <View style={styles.container}>
      <Image source={image} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.role}>{role}</Text>
        <Text style={styles.reviews}>
          {'⭐'.repeat(rating)} ({reviews} Reviews)
        </Text>
        <TouchableOpacity style={styles.button} onPress={onPress}>
          <Text style={styles.buttonText}>View Profile</Text>
        </TouchableOpacity>
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
  reviews: { fontSize: 12, marginVertical: 4 },
  button: { backgroundColor: '#0A84FF', padding: 6, borderRadius: 8, alignSelf: 'flex-start' },
  buttonText: { color: '#fff', fontSize: 12 }
});
