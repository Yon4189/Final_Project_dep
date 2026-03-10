import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { api } from './services/api';
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

const { width } = Dimensions.get('window');

const getCategoryIcon = (name: string) => {
  const icons: { [key: string]: string } = {
    'Plumbing': '🔧',
    'Home Cleaning': '🧹',
    'Electrical Services': '⚡',
    'Internet & TV Setup': '📡',
    'Painting & Finishing': '🎨',
    'Carpentry': '🪚',
    'AC & Home Appliances': '❄️',
    'Home Maintenance': '🏠',
  };
  return icons[name] || '🛠️';
};

export default function LandingScreen() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'customer' | 'provider' | null>(null);

  const [stats, setStats] = useState([
    { label: 'Service Providers', value: '...' },
    { label: 'Happy Customers', value: '...' },
    { label: 'Service Available', value: '24/7' },
  ]);
  const [categories, setCategories] = useState<any[]>([]);

  // NEW: state to display API message
  const [apiMessage, setApiMessage] = useState<string>('Loading...');
  // fetch from Laravel
  useEffect(() => {
    // Fetch test message
    api.get('/test')
      .then(response => {
        if (response.success && (response as any).message) {
          setApiMessage((response as any).message);
        }
      })
      .catch(err => {
        console.log('API ERROR:', err);
        setApiMessage('API connection failed');
      });

    // Fetch dynamic stats
    api.get<any>('/public/stats')
      .then(response => {
        if (response.success && response.data) {
          const data = response.data;
          setStats([
            { label: 'Service Providers', value: `${data.providers}+` },
            { label: 'Happy Customers', value: `${data.customers}+` },
            { label: 'Service Available', value: '24/7' },
          ]);
        }
      })
      .catch(err => {
        console.log('STATS API ERROR:', err);
      });

    // Fetch dynamic categories
    api.get<any[]>('/categories')
      .then(response => {
        if (response.success && response.data) {
          setCategories(response.data);
        }
      })
      .catch(err => {
        console.log('CATEGORIES API ERROR:', err);
      });
  }, []);
  const handleContinue = () => {
    if (selectedRole === 'customer') {
      router.push('/register-customer');
    } else if (selectedRole === 'provider') {
      router.push('/register-provider');
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { marginTop: 40 }]}>
        <Text style={styles.title}>
          <Text>HomeService Pro</Text>
        </Text>
        <Text style={styles.subtitle}>
          <Text>Find Trusted Home Service Providers</Text>
        </Text>
      </View>

      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Image
          source={require('../assets/images/logo.jpg')} // No double curly braces here
          style={styles.heroImage}
        />
      </View>

      {/* Services Section */}
      <View style={styles.servicesSection}>
        <Text style={styles.sectionTitle}>
          <Text>Our Services</Text>
        </Text>
        <View style={styles.servicesGrid}>
          {categories.length > 0 ? (
            categories.slice(0, 9).map((category) => (
              <TouchableOpacity key={category.catagoryID} style={styles.serviceCard}>
                <Text style={styles.serviceIcon}>{getCategoryIcon(category.name)}</Text>
                <Text style={styles.serviceName}>
                  <Text>{category.name}</Text>
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={{ textAlign: 'center', width: '100%', color: Colors.text.secondary }}>
              <Text>Loading services...</Text>
            </Text>
          )}
        </View>
      </View>

      {/* Role Selection */}
      <View style={styles.roleSection}>
        <Text style={styles.sectionTitle}>
          <Text>Join HomeService Pro</Text>
        </Text>
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
            title={`Continue as ${selectedRole === 'customer' ? 'Customer' : 'Provider'} `}
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
            <Text style={styles.statNumber}>
              <Text>{stat.value}</Text>
            </Text>
            <Text style={styles.statLabel}>
              <Text>{stat.label}</Text>
            </Text>
          </View>
        ))}
      </View>

      {/* CTA Section */}
      <View style={styles.ctaSection}>
        <Text style={styles.ctaTitle}>
          <Text>Already have an account?</Text>
        </Text>
        <AppButton
          title="Sign In"
          onPress={() => router.push('/login')}
          variant="outline"
          fullWidth
          style={styles.ctaButton}
        />
      </View>
       <View style={styles.ctaSection}>
        <Text style={styles.ctaTitle}>
          <Text>What do you want to know about us?</Text>
        </Text>
        <AppButton
          title="about us"
          onPress={() => router.push('./about')}
          variant="outline"
          fullWidth
          style={styles.ctaButton}
        />
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
