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
      title: '1. Information We Collect',
      body: `We collect the following information when you use GlowLoox as a business owner:\n\n• Full Name, Phone Number & Email – for account creation and communication\n• Password – stored encrypted (never in plain text)\n• Business Name, Address & Location – to display your business to customers\n• Services & Pricing – services you list on the platform\n• Salon Photos – images you upload (stored on Cloudinary)\n• Subscription & Billing Data – plan type, payment history, invoice records\n• Booking Records – all bookings made at your business\n• Device & App Data – device type, OS version, usage patterns\n• Push Notification Tokens – to send you new booking alerts`,
    },
    {
      title: '2. How We Use Your Information',
      body: `• Account Management – creating and maintaining your owner account\n• Salon Discovery – listing your business to nearby customers\n• Booking Management – processing incoming bookings in real-time\n• Billing & Subscription – managing your plan and generating invoices\n• Platform Communication – billing alerts and important updates\n• Analytics – booking statistics within your dashboard\n• Support – resolving issues and answering queries\n• Security – detecting fraud and preventing abuse`,
    },
    {
      title: '3. Subscription & Billing Data',
      body: `All subscription payments are processed by Razorpay (RBI-licensed). We receive only a payment confirmation token — never your card number, UPI PIN, or bank details. Billing records are retained for 7 years as required by Indian tax law.`,
    },
    {
      title: '4. Customer Data You Access',
      body: `As a business owner, you access customer names and phone numbers for booking fulfillment. You must:\n\n• Use customer data only to manage bookings\n• Not share or sell customer data to third parties\n• Not send unsolicited marketing messages\n• Delete customer data upon account closure\n\nViolation may result in immediate account suspension.`,
    },
    {
      title: '5. Third-Party Services',
      body: `We use: Razorpay (payments), Firebase/Google (push notifications), Cloudinary (image storage), MongoDB Atlas (database), Render.com (server hosting), Sentry (error monitoring).`,
    },
    {
      title: '6. Data Security',
      body: `• Passwords hashed using bcrypt\n• All API communication uses HTTPS/TLS\n• JWT authentication with expiry controls\n• Rate limiting on all API endpoints\n• MongoDB Atlas encryption at rest and in transit`,
    },
    {
      title: '7. Data Retention',
      body: `• Account & Salon Data: retained while active + 90 days after closure\n• Booking Records: 2 years\n• Billing & Invoice Records: 7 years (Indian tax law)\n• Uploaded Photos: deleted within 30 days of account closure`,
    },
    {
      title: '8. Your Rights',
      body: `You have the right to:\n• Access – request a copy of your data\n• Correction – update your information via dashboard\n• Account Deletion – request deletion (subject to billing retention)\n• Data Export – request booking history and invoices\n\nContact: glowloox@gmail.com`,
    },
    {
      title: '9. Contact Us',
      body: `GlowLoox Support\nEmail: glowloox@gmail.com\nWebsite: glowloox.com\nResponse Time: Within 2 business days`,
    },
  ],
  terms: [
    {
      title: '1. Platform Overview',
      body: `GlowLoox is a SaaS platform providing business owners tools to manage bookings, customers, and business operations. We provide the technology — you provide the business services.`,
    },
    {
      title: '2. Free Trial',
      body: `• 30-day free trial for all new accounts\n• Full access to all features at no cost\n• No payment or credit card required to start\n• You may pre-select a paid plan during trial\n• Multiple accounts to gain extra trials is prohibited`,
    },
    {
      title: '3. Subscription Plans',
      body: `Starter Plan – ₹150/month\nUnlimited bookings for one flat monthly fee. Billed at the start of each 30-day cycle.\n\nPer Booking Plan – ₹1/booking\nPay only for actual bookings. Billed at end of each 30-day cycle.\n\nPlan switching: one switch request per billing cycle, applied at the start of the next cycle.`,
    },
    {
      title: '4. Payment Terms',
      body: `• All payments processed by Razorpay (RBI-licensed)\n• Failure to pay results in feature restriction then account suspension\n• No Refunds: All subscription payments are non-refundable once the billing cycle is activated\n• Billing disputes must be raised within 7 days of invoice date`,
    },
    {
      title: '5. Owner Responsibilities',
      body: `• Maintain accurate salon information, services, and pricing\n• Respond to bookings in a timely manner\n• Honor confirmed bookings (repeated cancellations may lead to suspension)\n• Handle customer data responsibly per applicable Indian laws\n• Operate your business in compliance with all local laws and regulations`,
    },
    {
      title: '6. Prohibited Conduct',
      body: `You must not:\n• Create multiple accounts to abuse the free trial\n• List fake or non-existent salons or services\n• Manipulate reviews or ratings\n• Use customer data for unauthorized purposes\n• Attempt to hack or reverse-engineer the platform\n• Engage in deceptive or fraudulent practices`,
    },
    {
      title: '7. Account Suspension & Termination',
      body: `We may suspend or terminate your account without notice for:\n• Violation of these Terms\n• Non-payment after reasonable notice\n• Fraudulent or illegal activity\n• Providing false information\n\nYou may cancel by contacting glowloox@gmail.com. No refund for unused days.`,
    },
    {
      title: '8. Limitation of Liability',
      body: `GlowLoox is not liable for:\n• Business losses from platform downtime\n• Customer disputes or chargebacks\n• Third-party service failures (Razorpay, Firebase, etc.)\n\nOur maximum liability shall not exceed your subscription fees paid in the 3 months preceding the claim.`,
    },
    {
      title: '9. Governing Law',
      body: `These Terms are governed by the laws of India. Disputes shall be subject to the exclusive jurisdiction of competent courts in India.`,
    },
    {
      title: '10. Contact Us',
      body: `GlowLoox Business Support\nEmail: glowloox@gmail.com\nWebsite: owner.glowloox.com\nResponse Time: Within 2 business days`,
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
            {activeTab === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'} · GlowLoox · Effective: March 26, 2025
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
