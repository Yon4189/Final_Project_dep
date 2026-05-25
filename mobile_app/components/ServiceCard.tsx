import { Image, StyleSheet, Text, TouchableOpacity } from 'react-native';

type Props = {
  title: string;
  image: any; // require('../assets/xyz.png') or URI
  onPress: () => void;
};

export default function ServiceCard({ title, image, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Image source={image} style={styles.image} resizeMode="contain" />
      <Text style={styles.title}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#F2F2F2',
    borderRadius: 12,
    margin: 4,
    padding: 12,
    alignItems: 'center',
  },
  image: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
