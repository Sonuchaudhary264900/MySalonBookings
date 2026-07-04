import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking, SafeAreaView, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

const PRIVACY_URL = 'https://owner.glowloox.com/legal/owner-privacy';
const TERMS_URL   = 'https://owner.glowloox.com/legal/owner-terms';

const SECTIONS = {
  privacy: [
    {
      title: '1. Who We Are',
      body: `GlowLoox ("we", "us") is a booking and business-management platform operated by Gigamind Technology Pvt Ltd, India. This policy explains what data we collect from business owners ("you") who use the GlowLoox Partner app and website, why we collect it, and the choices you have.`,
    },
    {
      title: '2. Information We Collect',
      body: `Account\n• Name and mobile number — verified by one-time password (OTP). We never ask for or store a password.\n• Email address (optional) — for receipts and support.\n\nBusiness profile\n• Business name, type, description, address and map location\n• Services, prices, durations and working hours\n• Photos and videos you upload (stored securely on Cloudinary)\n\nOperations\n• Bookings, walk-ins, queue activity and customer interactions at your business\n• Team member names and phone numbers you add\n\nTechnical\n• Device type, OS version and app version — for support and reliability\n• Push notification token — so we can alert you about new bookings`,
    },
    {
      title: '3. How We Use Your Data',
      body: `• Show your business to nearby customers and take bookings for you\n• Deliver real-time booking alerts and reminders\n• Power your dashboard analytics (revenue, repeat customers, trends)\n• Send important service updates (never spam)\n• Prevent fraud, abuse and unauthorised access\n• Improve app performance and fix problems\n\nWe do not sell your data to anyone.`,
    },
    {
      title: '4. Customer Data You Handle',
      body: `To serve bookings, you can see customer names and phone numbers. You agree to:\n\n• Use this data only to fulfil bookings and provide your services\n• Never sell, share or upload it elsewhere\n• Never send unsolicited promotional messages\n\nMisuse of customer data is treated seriously and can lead to permanent account termination.`,
    },
    {
      title: '5. Payments',
      body: `Customer payments are currently settled directly between you and your customer (pay at venue). If and when online payments are enabled, they will be processed by an RBI-licensed payment gateway (such as Razorpay); GlowLoox never sees or stores card numbers, UPI PINs or bank credentials. Any billing records required by Indian tax law are kept for 7 years.`,
    },
    {
      title: '6. Third-Party Services',
      body: `We rely on trusted providers to run GlowLoox:\n\n• Firebase (Google) — phone OTP verification and push notifications\n• Cloudinary — photo and video storage\n• MongoDB Atlas — encrypted database hosting\n• Render — application servers\n• Meta WhatsApp Business API — booking confirmations via WhatsApp\n\nEach provider processes data only as needed to provide their service.`,
    },
    {
      title: '7. Security',
      body: `• Passwordless login — OTP verification through Firebase, so there is no password to steal\n• All traffic is encrypted with HTTPS/TLS\n• Short-lived, signed session tokens with automatic expiry\n• Rate limiting and abuse detection on every endpoint\n• Encryption at rest and in transit for stored data`,
    },
    {
      title: '8. Data Retention & Deletion',
      body: `• Account and business data — kept while your account is active, deleted within 90 days of closure\n• Booking records — up to 2 years, for your history and analytics\n• Tax-relevant billing records — 7 years (legal requirement)\n• Photos and videos — removed within 30 days of account closure\n\nYou can request deletion any time from Settings → Privacy & Security, or by emailing glowloox@gmail.com.`,
    },
    {
      title: '9. Your Rights',
      body: `You may at any time:\n• Access a copy of your data\n• Correct your information from the dashboard\n• Export your booking history\n• Delete your account and data (subject to the legal retention above)\n\nWrite to glowloox@gmail.com — we respond within 2 business days.`,
    },
    {
      title: '10. Contact',
      body: `GlowLoox — Gigamind Technology Pvt Ltd\nEmail: glowloox@gmail.com\nWebsite: glowloox.com\n\nWe may update this policy from time to time; material changes are announced in-app.`,
    },
  ],
  terms: [
    {
      title: '1. The Platform',
      body: `GlowLoox Partner gives your salon, barbershop, spa, clinic or studio the tools to accept bookings, manage walk-ins and queues, list services, and grow with analytics. We provide the technology; you provide the services to your customers. By creating an account you accept these Terms on behalf of your business.`,
    },
    {
      title: '2. Your Account',
      body: `• One account per business, verified by your mobile number (OTP)\n• You are responsible for activity on your account and for keeping your device secure\n• Team members you add act under your responsibility\n• Information you provide (name, address, services, prices) must be accurate and kept up to date`,
    },
    {
      title: '3. Pricing',
      body: `GlowLoox is currently free for business owners — no joining fee, no commission on bookings.\n\nWhen paid plans are introduced, you will be clearly informed in advance inside the app, and nothing will be charged without your explicit consent. Details of plans and billing cycles will be published before launch.`,
    },
    {
      title: '4. Bookings & Conduct With Customers',
      body: `• Honor every booking you confirm — repeated no-shows by your business harm customers and may lead to reduced visibility or suspension\n• Keep your working hours, prices and availability accurate\n• Treat customers respectfully; disputes should be resolved professionally\n• Payments for services are collected by you directly at the venue unless online payment is enabled`,
    },
    {
      title: '5. Content You Upload',
      body: `Photos, videos and text you upload must belong to you (or you must hold rights to use them) and must genuinely represent your business. You grant GlowLoox a licence to display this content to customers on the platform. We may remove content that is misleading, offensive or infringes rights.`,
    },
    {
      title: '6. Prohibited Conduct',
      body: `You must not:\n• List fake businesses or services, or manipulate reviews and ratings\n• Misuse customer data (see Privacy Policy) or send spam\n• Attempt to bypass, overload, probe or reverse-engineer the platform\n• Use GlowLoox for anything unlawful, deceptive or harmful\n\nBreach may result in immediate suspension or termination.`,
    },
    {
      title: '7. Suspension & Termination',
      body: `We may suspend or close accounts that break these Terms, provide false information, or engage in fraud — with notice where practical, immediately where necessary to protect customers or the platform.\n\nYou may close your account anytime from Settings or by emailing glowloox@gmail.com.`,
    },
    {
      title: '8. Service Availability & Liability',
      body: `We work hard to keep GlowLoox fast and reliable, but no online service can promise 100% uptime. To the extent permitted by law, GlowLoox is not liable for indirect losses such as lost profits from downtime, customer disputes, or failures of third-party providers. Our total liability is limited to the fees (if any) you paid us in the 3 months before the claim.`,
    },
    {
      title: '9. Changes to These Terms',
      body: `We may update these Terms as the platform evolves. If a change is significant, we will notify you in-app before it takes effect. Continuing to use GlowLoox after a change means you accept the updated Terms.`,
    },
    {
      title: '10. Governing Law & Contact',
      body: `These Terms are governed by the laws of India, with exclusive jurisdiction of the competent courts in India.\n\nGlowLoox Business Support — Gigamind Technology Pvt Ltd\nEmail: glowloox@gmail.com\nWebsite: owner.glowloox.com\nResponse time: within 2 business days`,
    },
  ],
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Legal & Privacy</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        {[
          { key: 'privacy', label: 'Privacy Policy', icon: 'shield-checkmark-outline' },
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
            <Text style={[styles.tabText, { color: activeTab === tab.key ? '#7c3aed' : theme.subText }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Meta */}
        <View style={[styles.metaBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="information-circle-outline" size={16} color="#7c3aed" style={{ marginRight: 8 }} />
          <Text style={[styles.metaText, { color: theme.subText }]}>
            {activeTab === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'} · GlowLoox · Effective: July 5, 2026
          </Text>
        </View>

        {/* Accordion sections */}
        {sections.map((sec, i) => (
          <View key={i} style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggle(i)}
              activeOpacity={0.8}
            >
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{sec.title}</Text>
              <Ionicons
                name={expanded === i ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={theme.subText}
              />
            </TouchableOpacity>
            {expanded === i && (
              <Text style={[styles.sectionBody, { color: theme.subText, borderTopColor: theme.border }]}>
                {sec.body}
              </Text>
            )}
          </View>
        ))}

        {/* Full document link */}
        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => Linking.openURL(activeTab === 'privacy' ? PRIVACY_URL : TERMS_URL)}
        >
          <Ionicons name="open-outline" size={16} color="#7c3aed" style={{ marginRight: 8 }} />
          <Text style={styles.linkBtnText}>View full document on website</Text>
        </TouchableOpacity>

        <Text style={[styles.footer, { color: theme.subText }]}>
          Questions? Email glowloox@gmail.com
        </Text>
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
  footer:        { textAlign: 'center', fontSize: 12, marginBottom: 8 },
});
