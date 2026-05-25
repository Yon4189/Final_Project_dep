// app/(customer)/about.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { api } from './services/api';
import { Colors } from '@/app/constants/Colors';

export default function AboutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [stats, setStats] = useState([
    { value: '...', label: t('about.stats.providers', 'Verified Providers'), icon: 'people-outline' },
    { value: '...', label: t('about.stats.customers', 'Happy Customers'), icon: 'happy-outline' },
    { value: '...', label: t('about.stats.categories', 'Service Categories'), icon: 'grid-outline' },
    { value: '24/7', label: t('about.stats.support', 'Customer Support'), icon: 'headset-outline' },
  ]);

  const updateStatValue = (label: string, value: string) => {
    setStats(prev =>
      prev.map(stat => (stat.label === label ? { ...stat, value } : stat))
    );
  };

  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      try {
        const response = await api.get<{ providers: number; customers: number }>('/public/stats');
        if (isMounted && response.success && response.data) {
          const { providers, customers } = response.data;
          updateStatValue(t('about.stats.providers', 'Verified Providers'), `${providers}+`);
          updateStatValue(t('about.stats.customers', 'Happy Customers'), `${customers}+`);
        }
      } catch (error) {
        console.error('Failed to load stats for about page', error);
      }

      try {
        const response = await api.get<any[]>('/categories');
        if (isMounted && response.success && response.data) {
          updateStatValue(t('about.stats.categories', 'Service Categories'), `${response.data.length}+`);
        }
      } catch (error) {
        console.error('Failed to load categories count', error);
      }
    };

    loadStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const features = [
    {
      icon: 'shield-checkmark-outline',
      title: t('about.features.providersTitle', 'Verified Providers'),
      description: t('about.features.providersDesc', 'All service providers undergo thorough background verification for your safety.'),
    },
    {
      icon: 'cash-outline',
      title: t('about.features.paymentsTitle', 'Secure Payments'),
      description: t('about.features.paymentsDesc', 'Multiple payment options with secure transactions through Chapa integration.'),
    },
    {
      icon: 'star-outline',
      title: t('about.features.qualityTitle', 'Quality Guaranteed'),
      description: t('about.features.qualityDesc', 'Customer reviews and ratings ensure you get the best service every time.'),
    },
    {
      icon: 'time-outline',
      title: t('about.features.responseTitle', 'Quick Response'),
      description: t('about.features.responseDesc', 'Get instant responses and same-day service availability in most areas.'),
    },
    {
      icon: 'location-outline',
      title: t('about.features.citiesTitle', 'Service Cities'),
      description: t('about.features.citiesDesc', 'Currently serving Addis Ababa and major cities across Ethiopia.'),
    },
    {
      icon: 'headset-outline',
      title: t('about.features.supportTitle', '24/7 Support'),
      description: t('about.features.supportDesc', 'Our customer support team is always ready to assist you.'),
    },
  ];

  const howItWorks = [
    {
      step: 1,
      title: t('about.steps.searchTitle', 'Search'),
      description: t('about.steps.searchDesc', 'Find the service you need by browsing categories or searching for specific providers.'),
    },
    {
      step: 2,
      title: t('about.steps.compareTitle', 'Compare'),
      description: t('about.steps.compareDesc', 'View provider profiles, ratings, reviews, and compare prices to make an informed choice.'),
    },
    {
      step: 3,
      title: t('about.steps.bookTitle', 'Book'),
      description: t('about.steps.bookDesc', 'Select your preferred provider, choose a convenient time, and confirm your booking.'),
    },
    {
      step: 4,
      title: t('about.steps.payTitle', 'Pay'),
      description: t('about.steps.payDesc', 'Pay securely online through Chapa or choose cash on completion.'),
    },
    {
      step: 5,
      title: t('about.steps.rateTitle', 'Rate'),
      description: t('about.steps.rateDesc', 'Share your experience by rating and reviewing the service provider.'),
    },
  ];

  const team = [
    {
      name: t('about.team.name', 'HomeLink Team'),
      role: t('about.team.role', 'Connecting You with Trusted Service Providers'),
      image: require('@/assets/images/about_team.jpg'),
    },
  ];

  const handleContactPress = (type: 'email' | 'phone' | 'website') => {
    switch (type) {
      case 'email':
        Linking.openURL('mailto:support@homelink.com');
        break;
      case 'phone':
        Linking.openURL('tel:+251911223344');
        break;
      case 'website':
        Linking.openURL('https://www.homelink.com');
        break;
    }
  };

  const renderHeader = () => (
    <LinearGradient
      colors={[Colors.primary, Colors.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={Colors.surface} />
      </TouchableOpacity>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>{t('about.headerTitle', 'About Home Based Service Finding Solution')}</Text>
        <Text style={styles.headerSubtitle}>
          {t('about.headerSubtitle', 'Your trusted platform for finding professional service providers')}
        </Text>
      </View>
    </LinearGradient>
  );

  const renderStats = () => (
    <View style={styles.statsGrid}>
      {stats.map((stat, index) => (
        <View key={index} style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name={stat.icon as any} size={24} color={Colors.primary} />
          </View>
          <Text style={styles.statValue}>{stat.value}</Text>
          <Text style={styles.statLabel}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );

  const renderMission = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('about.missionTitle', 'Our Mission')}</Text>
      <View style={styles.missionCard}>
        <Image 
          source={require('@/assets/images/about_mission.jpg')} 
          style={styles.missionImage}
          resizeMode="contain"
        />
        <Text style={styles.missionText}>
          {t('about.missionText', "Home Based Service Finding Solution was founded with a simple mission: to connect Ethiopian households with trusted, verified, and professional service providers. We believe that finding reliable help for your home shouldn't be a hassle. Whether you need a plumber, electrician, cleaner, or any other service, HomeLink makes it easy, safe, and convenient.")}
        </Text>
        <View style={styles.missionHighlight}>
          <Ionicons name="heart" size={20} color={Colors.error} />
          <Text style={styles.missionHighlightText}>
            {t('about.missionHighlight', 'Serving thousands of happy customers across Ethiopia')}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderFeatures = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('about.featuresTitle', 'Why Choose HomeLink')}</Text>
      <View style={styles.qualityImageContainer}>
        <Image 
          source={require('@/assets/images/about_quality.jpg')} 
          style={styles.qualityImage}
          resizeMode="contain"
        />
      </View>
      <View style={styles.featuresGrid}>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <Ionicons name={feature.icon as any} size={24} color={Colors.primary} />
            </View>
            <Text style={styles.featureTitle}>{feature.title}</Text>
            <Text style={styles.featureDescription}>{feature.description}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderHowItWorks = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('about.howItWorksTitle', 'How It Works')}</Text>
      <View style={styles.stepsContainer}>
        {howItWorks.map((step) => (
          <View key={step.step} style={styles.stepCard}>
            <View style={styles.stepNumberContainer}>
              <Text style={styles.stepNumber}>{step.step}</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDescription}>{step.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderTeam = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('about.teamTitle', 'Our Team')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.teamScroll}>
        {team.map((member, index) => (
          <View key={index} style={styles.teamCard}>
            <Image source={member.image} style={styles.teamImage} />
            <Text style={styles.teamName}>{member.name}</Text>
            <Text style={styles.teamRole}>{member.role}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderContact = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('about.contactTitle', 'Get In Touch')}</Text>
      <View style={styles.contactCard}>
        <TouchableOpacity
          style={styles.contactItem}
          onPress={() => handleContactPress('email')}
        >
          <View style={styles.contactIconContainer}>
            <Ionicons name="mail-outline" size={20} color={Colors.primary} />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>{t('common.email', 'Email')}</Text>
            <Text style={styles.contactValue}>yositilahun21@gmail.com</Text>
          </View>
          <Ionicons name="open-outline" size={20} color={Colors.text.secondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.contactItem}
          onPress={() => handleContactPress('phone')}
        >
          <View style={styles.contactIconContainer}>
            <Ionicons name="call-outline" size={20} color={Colors.primary} />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>{t('common.phone', 'Phone')}</Text>
            <Text style={styles.contactValue}>+251 905217674</Text>
          </View>
          <Ionicons name="open-outline" size={20} color={Colors.text.secondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.contactItem}
          onPress={() => handleContactPress('website')}
        >
          <View style={styles.contactIconContainer}>
            <Ionicons name="globe-outline" size={20} color={Colors.primary} />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>{t('common.website', 'Website')}</Text>
            <Text style={styles.contactValue}>www.homelink.com</Text>
          </View>
          <Ionicons name="open-outline" size={20} color={Colors.text.secondary} />
        </TouchableOpacity>

        <View style={styles.socialLinks}>
          <TouchableOpacity 
            style={styles.socialButton}
            activeOpacity={0.7}
            onPress={() => {
              console.log('Facebook pressed');
              WebBrowser.openBrowserAsync('https://web.facebook.com/profile.php?id=100093903172015');
            }}
          >
            <Ionicons name="logo-facebook" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.socialButton}
            activeOpacity={0.7}
            onPress={() => WebBrowser.openBrowserAsync('https://t.me/yosibdu')}
          >
            <Ionicons name="paper-plane" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.socialButton}
            activeOpacity={0.7}
            onPress={() => WebBrowser.openBrowserAsync('https://www.instagram.com/yoseph3856/')}
          >
            <Ionicons name="logo-instagram" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.socialButton}
            activeOpacity={0.7}
            onPress={() => {
              console.log('LinkedIn pressed');
              WebBrowser.openBrowserAsync('https://www.linkedin.com/in/yosef-tilahun-238740371/');
            }}
          >
            <Ionicons name="logo-linkedin" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footer}>
      <Text style={styles.footerText}>{t('about.copyright', '© 2024 HomeLink. All rights reserved.')}</Text>
      <Text style={styles.footerText}>{t('about.version', 'Version')} 1.0.0</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderHeader()}
        <Image 
          source={require('@/assets/images/about_hero.jpg')} 
          style={styles.heroImage}
          resizeMode="cover"
        />
        {renderStats()}
        {renderMission()}
        {renderFeatures()}
        {renderHowItWorks()}
        {renderTeam()}
        {renderContact()}
        {renderFooter()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 100,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    marginBottom: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.surface,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.surface + 'CC',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    marginTop: -20,
  },
  statCard: {
    width: '50%',
    padding: 8,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  heroImage: {
    width: '100%',
    height: 200,
    marginTop: -20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  missionImage: {
    width: '100%',
    height: 150,
    marginBottom: 16,
    borderRadius: 12,
  },
  qualityImageContainer: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.primary + '05',
    borderRadius: 16,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  qualityImage: {
    width: '80%',
    height: '100%',
  },
  missionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  missionText: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 22,
    marginBottom: 16,
  },
  missionHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '10',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  missionHighlightText: {
    fontSize: 13,
    color: Colors.error,
    fontWeight: '500',
    flex: 1,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  featureCard: {
    width: '50%',
    padding: 6,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
  stepsContainer: {
    gap: 12,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepNumberContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.surface,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  teamScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  teamCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    width: 150,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  teamImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  teamRole: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  contactCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  contactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  socialLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 16,
  },
  socialButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
});
