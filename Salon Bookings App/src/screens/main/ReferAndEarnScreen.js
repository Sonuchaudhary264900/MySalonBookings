import React, { useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Share, Clipboard,
  ScrollView, Dimensions
} from 'react-native';
import AppText from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { showSuccess } from '../../utils/toast';

const { width: SCREEN_W } = Dimensions.get('window');

function generateCode(user) {
  if (!user) return 'SALON10';
  const base = (user.name || 'USER').toUpperCase().replace(/\s+/g, '').slice(0, 5);
  const suffix = (user._id || user.id || '').slice(-4).toUpperCase();
  return `${base}${suffix}` || 'SALON10';
}

const HOW_IT_WORKS = [
  { icon: 'share-social-outline', color: '#2563eb', title: 'Share your code',       desc: 'Send your referral code to a salon owner via WhatsApp, SMS, or any app.' },
  { icon: 'storefront-outline',   color: '#7c3aed', title: 'Salon owner signs up',  desc: 'The salon owner registers on the GlowLoox owner app using your code.' },
  { icon: 'cash-outline',         color: '#d97706', title: 'You earn ₹50',          desc: 'Once the salon owner qualifies, ₹50 is credited to your account!' },
];

export default function ReferAndEarnScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const styles = getStyles(theme);
  const [copied, setCopied] = useState(false);

  const referralCode = generateCode(user);
  const shareMessage =
    `Salon owners 👇\n\n` +
    `Don't miss this 🚀\n` +
    `Join GlowLoox and start getting customers online instantly! 💼\n\n` +
    `Grow your salon, manage bookings easily, and go digital today.\n\n` +
    `❤️ Use my referral code and support me too\n\n` +
    `💸 Referral Code: ${referralCode}\n` +
    `🔗 https://owner.glowloox.com`;

  const handleCopy = () => {
    Clipboard.setString(referralCode);
    setCopied(true);
    showSuccess('Copied!', 'Referral code copied to clipboard.');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: shareMessage, title: 'Refer & Earn — GlowLoox' });
    } catch {}
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>Refer &amp; Earn</AppText>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {/* Hero banner */}
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="gift" size={44} color="#fff" />
          </View>
          <AppText style={styles.heroTitle}>Refer a salon, earn ₹50!</AppText>
          <AppText style={styles.heroSub}>
            Invite salon owners to join GlowLoox. When they qualify, you earn ₹50!
          </AppText>
        </View>

        {/* Referral code box */}
        <View style={styles.codeCard}>
          <AppText style={styles.codeLabel}>Your Referral Code</AppText>
          <View style={styles.codeRow}>
            <AppText style={styles.codeText}>{referralCode}</AppText>
            <TouchableOpacity
              onPress={handleCopy}
              style={[styles.copyBtn, copied && styles.copyBtnDone]}
              activeOpacity={0.8}
            >
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={copied ? '#16a34a' : '#2563eb'} />
              <AppText style={[styles.copyBtnText, copied && { color: '#16a34a' }]}>
                {copied ? 'Copied!' : 'Copy'}
              </AppText>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
            <Ionicons name="share-social-outline" size={18} color="#fff" />
            <AppText style={styles.shareBtnText}>Share &amp; Invite Salon Owners</AppText>
          </TouchableOpacity>
        </View>

        {/* How it works */}
        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>How it works</AppText>
          {HOW_IT_WORKS.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepIconWrap, { backgroundColor: step.color + '18' }]}>
                <Ionicons name={step.icon} size={22} color={step.color} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={styles.stepTitle}>{step.title}</AppText>
                <AppText style={styles.stepDesc}>{step.desc}</AppText>
              </View>
            </View>
          ))}
        </View>

        {/* Terms note */}
        <View style={styles.terms}>
          <Ionicons name="information-circle-outline" size={14} color={theme.subText} />
          <AppText style={styles.termsText}>
            The referred salon owner must register using your code and actively use the app for 30 days. ₹50 is credited once they qualify. Each code is valid once per salon. Terms may change.
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: t.card, borderBottomWidth: 1, borderBottomColor: t.border },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: t.text },

  hero: { margin: 16, borderRadius: 18, backgroundColor: '#2563eb', padding: 28, alignItems: 'center', gap: 10 },
  heroIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 21 },

  codeCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: t.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: t.border, gap: 14 },
  codeLabel: { fontSize: 12, fontWeight: '600', color: t.subText, textTransform: 'uppercase', letterSpacing: 0.8 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: t.bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1.5, borderColor: '#2563eb', borderStyle: 'dashed' },
  codeText: { fontSize: 22, fontWeight: '800', color: '#2563eb', letterSpacing: 2 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#dbeafe' },
  copyBtnDone: { backgroundColor: '#dcfce7' },
  copyBtnText: { fontSize: 13, fontWeight: '700', color: '#2563eb' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14 },
  shareBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  section: { marginHorizontal: 16, marginBottom: 16, backgroundColor: t.card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: t.border, gap: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: t.text, marginBottom: 2 },
  stepRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  stepIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontSize: 14, fontWeight: '700', color: t.text, marginBottom: 2 },
  stepDesc: { fontSize: 13, color: t.subText, lineHeight: 18 },

  terms: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginHorizontal: 16, padding: 12, backgroundColor: t.card, borderRadius: 10, borderWidth: 1, borderColor: t.border },
  termsText: { flex: 1, fontSize: 11, color: t.subText, lineHeight: 16 }
});
