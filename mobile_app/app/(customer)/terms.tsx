import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export default function TermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Terms & Conditions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.lastUpdated, { color: colors.text.secondary }]}>Last updated: April 2026</Text>

        <Section title="1. Acceptance of Terms" colors={colors}>
          By downloading, installing, or using the HB Service Finder app, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the app.
        </Section>

        <Section title="2. Description of Service" colors={colors}>
          HB Service Finder is a platform that connects customers with local service providers. We facilitate the booking and payment process but are not directly responsible for the quality of services provided by third-party providers.
        </Section>

        <Section title="3. User Accounts" colors={colors}>
          You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials. You must notify us immediately of any unauthorized use of your account. You must be at least 18 years old to use this service.
        </Section>

        <Section title="4. Booking & Payments" colors={colors}>
          All bookings are subject to provider availability and acceptance. Payments are processed securely through Chapa payment gateway. A deposit (20% of the agreed price) is required upon booking acceptance. The remaining balance is due within 48 hours of service completion. Failure to pay the remaining balance may result in account suspension.
        </Section>

        <Section title="5. Cancellation Policy" colors={colors}>
          Customers may cancel a pending booking before it is accepted by the provider at no charge. Cancellations after provider acceptance may result in forfeiture of the deposit. Providers who cancel accepted bookings will have their rating affected.
        </Section>

        <Section title="6. Refund Policy" colors={colors}>
          Refunds are processed in accordance with our cancellation policy. If a provider cancels an accepted booking, the customer will receive a full refund of any deposit paid. Refunds are processed within 5-7 business days.
        </Section>

        <Section title="7. Provider Responsibilities" colors={colors}>
          Service providers must maintain accurate profiles and service listings. Providers must honor accepted bookings and arrive on time. Providers are responsible for the quality of their services. Providers must comply with all applicable laws and regulations.
        </Section>

        <Section title="8. Prohibited Activities" colors={colors}>
          You may not use the platform for any illegal activities. You may not attempt to circumvent our payment system. You may not harass, threaten, or harm other users. You may not post false or misleading information.
        </Section>

        <Section title="9. Limitation of Liability" colors={colors}>
          HB Service Finder is not liable for any damages arising from the use of services provided by third-party providers. Our liability is limited to the amount paid through our platform for the specific service in question.
        </Section>

        <Section title="10. Changes to Terms" colors={colors}>
          We reserve the right to modify these terms at any time. Continued use of the app after changes constitutes acceptance of the new terms. We will notify users of significant changes via the app or email.
        </Section>

        <Section title="11. Contact Us" colors={colors}>
          If you have questions about these Terms, please contact us at support@hbservicefinder.com
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
