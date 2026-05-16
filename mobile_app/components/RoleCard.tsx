// components/RoleCard.tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/app/constants/Colors';

interface RoleCardProps {
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
  isSelected?: boolean;
}

const RoleCard: React.FC<RoleCardProps> = ({
  title,
  description,
  icon,
  onPress,
  isSelected = false,
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.selectedContainer]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.icon}>
        <Text>{icon}</Text>
      </Text>
      <Text style={styles.title}>
        <Text>{title}</Text>
      </Text>
      <Text style={styles.description}>
        <Text>{description}</Text>
      </Text>
      {isSelected && <View style={styles.selectionIndicator} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginHorizontal: 10,
    marginBottom: 20,
    width: 150,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedContainer: {
    borderColor: Colors.primary,
    backgroundColor: '#f0f8ff',
  },
  icon: {
    fontSize: 40,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 5,
    textAlign: 'center',
  },
  description: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
});

export default RoleCard;