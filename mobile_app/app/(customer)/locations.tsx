// app/(customer)/locations.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
import AppButton from '../../components/AppButton';
import { api } from '../services/api';

interface City {
  id: string;
  name: string;
}

export default function Locations() {
  const router = useRouter();
  const [currentCity, setCurrentCity] = useState<string>('');
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch current user's city
      const userResponse = await api.get<any>('/customer/profile');
      if (userResponse.success && userResponse.data) {
        const userCity = userResponse.data.service_city || '';
        setCurrentCity(userCity);
        setSelectedCity(userCity);
      }

      // Fetch all available cities from database
      const citiesResponse = await api.get<any>('/cities');
      if (citiesResponse.success && citiesResponse.data) {
        const citiesData = Array.isArray(citiesResponse.data) 
          ? citiesResponse.data 
          : citiesResponse.data.data || [];
        setCities(citiesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCity = async () => {
    if (!selectedCity || selectedCity === currentCity) {
      setModalVisible(false);
      return;
    }

    setUpdating(true);
    try {
      const response = await api.put('/customer/service-city', {
        service_city: selectedCity,
      });

      if (response.success) {
        setCurrentCity(selectedCity);
        Alert.alert('Success', 'Service city updated successfully');
        setModalVisible(false);
      } else {
        Alert.alert('Error', response.message || 'Failed to update service city');
      }
    } catch (error: any) {
      console.error('Error updating city:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update service city');
    } finally {
      setUpdating(false);
    }
  };

  const renderCityItem = ({ item }: { item: City }) => (
    <TouchableOpacity
      style={[
        styles.cityItem,
        selectedCity === item.name && styles.cityItemSelected,
      ]}
      onPress={() => setSelectedCity(item.name)}
    >
      <View style={styles.cityItemContent}>
        <Ionicons 
          name={selectedCity === item.name ? "radio-button-on" : "radio-button-off"} 
          size={20} 
          color={selectedCity === item.name ? Colors.primary : Colors.text.secondary} 
        />
        <Text style={[
          styles.cityName,
          selectedCity === item.name && styles.cityNameSelected,
        ]}>
          {item.name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading your service city...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service City</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current City Card */}
        <View style={styles.currentCityCard}>
          <View style={styles.currentCityHeader}>
            <Ionicons name="location" size={24} color={Colors.primary} />
            <Text style={styles.currentCityLabel}>Your Service City</Text>
          </View>
          
          <View style={styles.currentCityContent}>
            <Text style={styles.currentCityName}>{currentCity || 'Not set'}</Text>
            <TouchableOpacity 
              style={styles.changeButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.changeButtonText}>Change</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.info} />
          <Text style={styles.infoText}>
            Your service city determines which providers can serve you
          </Text>
        </View>

        {/* Available Cities Note */}
        <View style={styles.noteBox}>
          <Ionicons name="business-outline" size={20} color={Colors.success} />
          <Text style={styles.noteText}>
            We currently serve {cities.length} cities
          </Text>
        </View>
      </ScrollView>

      {/* Change City Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Your City</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Choose your service city from the list below
            </Text>

            {cities.length > 0 ? (
              <FlatList
                data={cities}
                keyExtractor={(item) => item.id?.toString() || item.name}
                renderItem={renderCityItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.cityList}
              />
            ) : (
              <View style={styles.noCitiesContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={Colors.text.secondary} />
                <Text style={styles.noCitiesText}>No cities available</Text>
              </View>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  (!selectedCity || selectedCity === currentCity || updating) && styles.modalConfirmDisabled
                ]}
                onPress={handleUpdateCity}
                disabled={!selectedCity || selectedCity === currentCity || updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color={Colors.surface} />
                ) : (
                  <Text style={styles.modalConfirmText}>Update City</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  currentCityCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  currentCityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  currentCityLabel: {
    marginLeft: 10,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  currentCityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentCityName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginRight: 4,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.info + '10',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.info + '20',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  noteBox: {
    flexDirection: 'row',
    backgroundColor: Colors.success + '10',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.success + '20',
  },
  noteText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 20,
  },
  cityList: {
    paddingBottom: 20,
  },
  cityItem: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cityItemSelected: {
    backgroundColor: Colors.primary + '10',
  },
  cityItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cityName: {
    fontSize: 16,
    marginLeft: 12,
    color: Colors.text.primary,
  },
  cityNameSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  noCitiesContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noCitiesText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginRight: 12,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalConfirmDisabled: {
    opacity: 0.5,
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.surface,
  },
});