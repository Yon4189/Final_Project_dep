import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './config/api';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AppButton from '../components/AppButton';
import RoleCard from '../components/RoleCard';
import { Colors } from '@/app/constants/Colors';
import { SERVICE_CATEGORIES } from './constants/Services';

const { width } = Dimensions.get('window');

export default function LandingScreen() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'customer' | 'provider' | null>(null);

  const stats = [
    { label: 'Service Providers', value: '500+' },
    { label: 'Happy Customers', value: '1000+' },
    { label: 'Service Available', value: '24/7' },
  ];
  // NEW: state to display API message
  const [apiMessage, setApiMessage] = useState<string>('Loading...');
   // fetch from Laravel
  useEffect(() => {
    axios.get(`${API_BASE_URL}/test`)
      .then(response => {
        console.log('API RESPONSE:', response.data);
        setApiMessage(response.data.message);
      })
      .catch(err => {
        console.log('API ERROR:', err);
        setApiMessage('API connection failed');
      });
  }, []);
  const handleContinue = () => {
    if (selectedRole === 'customer') {
      router.push('/(auth)/register-customer');
    } else if (selectedRole === 'provider') {
      router.push('/(auth)/register-provider');
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { marginTop: 40 }]}>
        <Text style={styles.title}>HomeService Pro</Text>
        <Text style={styles.subtitle}>Find Trusted Home Service Providers</Text>
      </View>

      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64' }}
          style={styles.heroImage}
        />
        <View style={styles.heroOverlay}>
          <Text style={styles.heroText}>Quality Service at Your Doorstep</Text>
          <AppButton
            title="Book Now"
            onPress={() => router.push('/(auth)/login')}
            style={styles.bookNowBtn}
          />
        </View>
      </View>

      {/* Services Section */}
      <View style={styles.servicesSection}>
        <Text style={styles.sectionTitle}>Our Services</Text>
        <View style={styles.servicesGrid}>
          {SERVICE_CATEGORIES.map((category) => (
            <TouchableOpacity key={category.id} style={styles.serviceCard}>
              <Text style={styles.serviceIcon}>{category.icon}</Text>
              <Text style={styles.serviceName}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Role Selection */}
      <View style={styles.roleSection}>
        <Text style={styles.sectionTitle}>Join HomeService Pro</Text>
        <View style={styles.roleContainer}>
          <RoleCard
            title="I Need Service"
            description="Find reliable professionals for your home needs"
            icon="👨‍💼"
            isSelected={selectedRole === 'customer'}
            onPress={() => setSelectedRole('customer')}
          />
          <RoleCard
            title="I Provide Service"
            description="Offer your skills and grow your business"
            icon="👨‍🔧"
            isSelected={selectedRole === 'provider'}
            onPress={() => setSelectedRole('provider')}
          />
        </View>

        {selectedRole && (
          <AppButton
            title={`Continue as ${selectedRole === 'customer' ? 'Customer' : 'Provider'}`}
            onPress={handleContinue}
            fullWidth
            style={styles.continueButton}
          />
        )}
      </View>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.statItem}>
            <Text style={styles.statNumber}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* CTA Section */}
      <View style={styles.ctaSection}>
        <Text style={styles.ctaTitle}>Already have an account?</Text>
        <AppButton
          title="Sign In"
          onPress={() => router.push('../(auth)/login')}
          variant="outline"
          fullWidth
          style={styles.ctaButton}
        />
        <TouchableOpacity
          onPress={() => router.push('/(auth)/home')}
          style={styles.guestLink}
        >
          <Text style={styles.guestText}>Continue as Guest</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 5,
  },
  heroSection: {
    margin: 15,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  heroImage: {
    width: '100%',
    height: 200,
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20,
  },
  heroText: {
    color: Colors.text.light,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  bookNowBtn: {
    alignSelf: 'flex-start',
  },
  servicesSection: {
    padding: 20,
    backgroundColor: Colors.surface,
    margin: 15,
    borderRadius: 15,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceCard: {
    width: (width - 70) / 3,
    alignItems: 'center',
    marginBottom: 20,
    padding: 10,
    backgroundColor: Colors.background,
    borderRadius: 10,
  },
  serviceIcon: {
    fontSize: 30,
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  roleSection: {
    padding: 20,
    backgroundColor: Colors.surface,
    margin: 15,
    borderRadius: 15,
    elevation: 3,
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  continueButton: {
    marginTop: 10,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: Colors.surface,
    margin: 15,
    borderRadius: 15,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 5,
  },
  ctaSection: {
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 30,
    backgroundColor: Colors.surface,
    borderRadius: 15,
    elevation: 3,
  },
  ctaTitle: {
    textAlign: 'center',
    fontSize: 16,
    color: Colors.text.primary,
    marginBottom: 15,
    fontWeight: '600',
  },
  ctaButton: {
    marginBottom: 10,
  },
  guestLink: {
    padding: 10,
    alignItems: 'center',
  },
  guestText: {
    color: Colors.text.secondary,
    fontSize: 14,
  },
});
