import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.lastUpdated, { color: colors.text.secondary }]}>Last updated: April 2026</Text>

        <Section title="1. Information We Collect" colors={colors}>
          We collect information you provide directly: name, email address, phone number, profile picture, and location data. We also collect usage data such as bookings made, services viewed, and app interactions.
        </Section>

        <Section title="2. How We Use Your Information" colors={colors}>
          We use your information to: provide and improve our services, process payments and bookings, send notifications about your bookings, connect you with service providers, and comply with legal obligations.
        </Section>

        <Section title="3. Location Data" colors={colors}>
          We collect your location to show nearby service providers and to facilitate service delivery. Location data is only collected when you use the app and is not shared with third parties except service providers you book. You can disable location access in your device settings, though this may limit app functionality.
        </Section>

        <Section title="4. Payment Information" colors={colors}>
          Payment processing is handled by Chapa, a secure payment gateway. We do not store your full payment card details. We store transaction records for accounting and dispute resolution purposes.
        </Section>

        <Section title="5. Information Sharing" colors={colors}>
          We share your information with: service providers you book (name, phone, location for service delivery), payment processors (Chapa) for transaction processing, and law enforcement when required by law. We do not sell your personal information to third parties.
        </Section>

        <Section title="6. Data Security" colors={colors}>
          We implement industry-standard security measures including encrypted data transmission (HTTPS), hashed passwords, and secure token-based authentication. However, no method of transmission over the internet is 100% secure.
        </Section>

        <Section title="7. Data Retention" colors={colors}>
          We retain your account data for as long as your account is active. Transaction records are retained for 7 years for legal and accounting purposes. You may request deletion of your account and personal data at any time.
        </Section>

        <Section title="8. Your Rights" colors={colors}>
          You have the right to: access your personal data, correct inaccurate data, request deletion of your data, opt out of marketing communications, and lodge a complaint with a data protection authority.
        </Section>

        <Section title="9. Children's Privacy" colors={colors}>
          Our service is not directed to children under 18. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us.
        </Section>

        <Section title="10. Changes to This Policy" colors={colors}>
          We may update this Privacy Policy from time to time. We will notify you of significant changes via the app or email. Continued use of the app after changes constitutes acceptance of the updated policy.
        </Section>

        <Section title="11. Contact Us" colors={colors}>
          For privacy-related questions or to exercise your rights, contact us at: privacy@hbservicefinder.com
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function Section({ title, children, colors }: { title: string; children: string; colors: any }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{title}</Text>
      <Text style={[styles.sectionBody, { color: colors.text.secondary }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { flex: 1, padding: 20 },
  lastUpdated: { fontSize: 12, marginBottom: 20, fontStyle: 'italic' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  sectionBody: { fontSize: 14, lineHeight: 22 },
});
