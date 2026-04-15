import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity,
  Linking, SafeAreaView, StatusBar
} from 'react-native';
import AppText from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

const PRIVACY_URL = 'https://mysalonbookings.com/legal/customer-privacy';
const TERMS_URL   = 'https://mysalonbookings.com/legal/customer-terms';

const SECTIONS = {
  privacy: [
    {
      title: '1. Information We Collect',
      body: `We collect the following information when you use MySalonBookings:\n\n• Full Name – to identify you and for booking records\n• Phone Number – for account creation, OTP verification, and booking confirmations\n• Email Address – for account management and notifications\n• Booking Details – service type, preferred date/time, and any requests\n• Device Information – device type, OS version, and app version\n• Location Data – approximate location (with your permission) to show nearby salons\n• Usage Data – features used, booking frequency, and session duration\n• Push Notification Tokens – to send you booking confirmations and reminders`
    },
    {
      title: '2. How We Use Your Information',
      body: `• Account Management – creating and maintaining your account\n• Booking Services – processing and confirming your salon appointments\n• Notifications – booking confirmations, reminders, and status updates\n• Salon Discovery – showing you nearby salons using your location\n• Customer Support – responding to your queries and feedback\n• Safety & Security – detecting fraud and unauthorized access\n• Platform Improvement – analyzing usage patterns to improve the app`
    },
    {
      title: '3. Data Sharing with Salons',
      body: `When you book an appointment, the salon owner receives your name, phone number, and booking details. This is necessary to provide the service. Salon owners are bound by our Terms of Service to use your data only for service delivery and not for marketing or third-party sharing.`
    },
    {
      title: '4. Third-Party Services',
      body: `We use:\n• Razorpay – payment processing\n• Firebase (Google) – push notifications\n• Cloudinary – image hosting\n• MongoDB Atlas – secure cloud database\n• Render.com – server hosting\n\nWe do NOT sell your data to any third party.`
    },
    {
      title: '5. Location Data',
      body: `Location access is optional. We use it only to show nearby salons and do not store it permanently. We do not track your location in the background. You can revoke location permission anytime in device settings.`
    },
    {
      title: '6. Data Security',
      body: `• HTTPS/TLS encryption for all data in transit\n• Encrypted storage of sensitive account information\n• JWT-based authentication with token expiry\n• Rate limiting and anti-abuse protections\n• Regular security monitoring via Sentry`
    },
    {
      title: '7. Data Retention',
      body: `• Account Data: retained while active + 90 days after deletion\n• Booking Records: 2 years\n• Payment Records: 7 years (Indian tax law)\n• Log Data: 90 days`
    },
    {
      title: '8. Your Rights',
      body: `• Access – request a copy of your personal data\n• Correction – request correction of inaccurate data\n• Deletion – request deletion of your account and data\n• Withdrawal of Consent – revoke location or notification permissions\n\nContact: support@mysalonbookings.com\nResponse time: Within 30 days`
    },
    {
      title: '9. Contact Us',
      body: `MySalonBookings Support\nEmail: support@mysalonbookings.com\nWebsite: mysalonbookings.com\nResponse Time: Within 2 business days`
    },
  ],
  terms: [
    {
      title: '1. About MySalonBookings',
      body: `MySalonBookings is an online marketplace connecting customers with salon service providers across India. We provide the technology platform — we do not directly provide salon services. The actual service is the responsibility of the individual salon.`
    },
    {
      title: '2. Eligibility',
      body: `• You must be at least 13 years of age\n• Ages 13–18 require parental or guardian consent\n• You must provide accurate and genuine personal information\n• One person may maintain only one active customer account`
    },
    {
      title: '3. Booking Services',
      body: `• Bookings are sent to salons for confirmation\n• Arrive at or before your scheduled appointment time\n• Cancel as early as possible if you cannot attend\n• Repeated no-shows may result in account restrictions\n• Treat salon staff and other customers with respect`
    },
    {
      title: '4. Data Sharing with Salons',
      body: `By booking, you consent to sharing your name, phone number, and booking details with the salon owner. Salon owners are contractually required to use your information only for fulfilling your booking. Report misuse to support@mysalonbookings.com.`
    },
    {
      title: '5. Payments',
      body: `Payments are processed by Razorpay (RBI-licensed). MySalonBookings never stores your card details or banking credentials. For payment disputes, contact support@mysalonbookings.com.`
    },
    {
      title: '6. Service Limitations',
      body: `MySalonBookings is a technology marketplace — we connect customers with salons but do not control salon staff or service quality. We are not liable for service outcomes, injury, or dissatisfaction. Salon information may occasionally be inaccurate — verify directly with the salon.`
    },
    {
      title: '7. Prohibited Conduct',
      body: `You must not:\n• Make fake or fraudulent bookings\n• Use another person's account without permission\n• Attempt to hack or disrupt the platform\n• Post false or misleading reviews\n• Harass or threaten salon owners or staff`
    },
    {
      title: '8. Account Suspension',
      body: `We may suspend or terminate your account if you:\n• Violate these Terms\n• Engage in fraudulent or abusive activity\n• Repeatedly fail to show up for confirmed bookings\n\nYou may close your account by contacting support@mysalonbookings.com.`
    },
    {
      title: '9. Limitation of Liability',
      body: `MySalonBookings is not liable for damages from salon services, platform downtime, or unauthorized account access. Our maximum liability shall not exceed amounts paid to us in the 3 months preceding any claim.`
    },
    {
      title: '10. Governing Law',
      body: `These Terms are governed by the laws of India. Disputes shall be subject to the jurisdiction of competent courts in India.`
    },
    {
      title: '11. Contact Us',
      body: `MySalonBookings Support\nEmail: support@mysalonbookings.com\nWebsite: mysalonbookings.com\nResponse Time: Within 2 business days`
    },
  ]
};

export default function LegalScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('privacy');
  const [expanded, setExpanded]   = useState(null);

  const sections = SECTIONS[activeTab];
  const toggle = (i) => setExpanded(prev => prev === i ? null : i);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <AppText style={[styles.headerTitle, { color: theme.text }]}>Legal & Privacy</AppText>
        <View style={{ width: 38 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        {[
          { key: 'privacy', label: 'Privacy Policy',     icon: 'shield-checkmark-outline' },
          { key: 'terms',   label: 'Terms & Conditions', icon: 'document-text-outline' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => { setActiveTab(tab.key); setExpanded(null); }}
          >
            <Ionicons
              name={tab.icon}
              size={15}
              color={activeTab === tab.key ? '#7c3aed' : theme.subText}
              style={{ marginRight: 5 }}
            />
            <AppText style={[styles.tabText, { color: activeTab === tab.key ? '#7c3aed' : theme.subText }]}>
              {tab.label}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={[styles.metaBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="information-circle-outline" size={16} color="#7c3aed" style={{ marginRight: 8 }} />
          <AppText style={[styles.metaText, { color: theme.subText }]}>
            {activeTab === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'} · MySalonBookings · Effective: March 26, 2025
          </AppText>
        </View>

        {sections.map((sec, i) => (
          <View key={i} style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggle(i)}
              activeOpacity={0.8}
            >
              <AppText style={[styles.sectionTitle, { color: theme.text }]}>{sec.title}</AppText>
              <Ionicons name={expanded === i ? 'chevron-up' : 'chevron-down'} size={16} color={theme.subText} />
            </TouchableOpacity>
            {expanded === i && (
              <AppText style={[styles.sectionBody, { color: theme.subText, borderTopColor: theme.border }]}>
                {sec.body}
              </AppText>
            )}
          </View>
        ))}

        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => Linking.openURL(activeTab === 'privacy' ? PRIVACY_URL : TERMS_URL)}
        >
          <Ionicons name="open-outline" size={16} color="#7c3aed" style={{ marginRight: 8 }} />
          <AppText style={styles.linkBtnText}>View full document on website</AppText>
        </TouchableOpacity>

        <AppText style={[styles.footer, { color: theme.subText }]}>
          Questions? Email support@mysalonbookings.com
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn:       { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { fontSize: 17, fontWeight: '700' },
  tabRow:        { flexDirection: 'row', borderBottomWidth: 1 },
  tab:           { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  tabActive:     { borderBottomWidth: 2, borderBottomColor: '#7c3aed' },
  tabText:       { fontSize: 13, fontWeight: '600' },
  scroll:        { padding: 16, paddingBottom: 40 },
  metaBox:       { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1 },
  metaText:      { fontSize: 12, flex: 1 },
  section:       { borderRadius: 12, marginBottom: 10, borderWidth: 1, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  sectionTitle:  { fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },
  sectionBody:   { fontSize: 13, lineHeight: 20, paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, paddingTop: 10 },
  linkBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, backgroundColor: 'rgba(124,58,237,0.1)', marginTop: 8, marginBottom: 16 },
  linkBtnText:   { color: '#7c3aed', fontWeight: '700', fontSize: 14 },
  footer:        { textAlign: 'center', fontSize: 12, marginBottom: 8 }
});
