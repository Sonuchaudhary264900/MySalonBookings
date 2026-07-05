import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

// Mirrors the main bottom tab bar so full-screen pushed screens (e.g. Walk-in)
// still let the owner jump to any tab. active = tab name to highlight, or null.
const TABS = [
  { name: 'Home',     label: 'Home',      icon: 'grid-outline',        on: 'grid' },
  { name: 'Reports',  label: 'Analytics', icon: 'bar-chart-outline',   on: 'bar-chart' },
  { name: 'Services', label: 'Services',  icon: 'cut-outline',         on: 'cut' },
  { name: 'Messages', label: 'Messages',  icon: 'chatbubbles-outline', on: 'chatbubbles' },
  { name: 'Settings', label: 'Settings',  icon: 'settings-outline',    on: 'settings' },
];

export default function BottomNavStrip({ active = null }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const go = (name) => navigation.navigate('MainTabs', { screen: name });

  return (
    <View style={[s.bar, { backgroundColor: theme.card, borderTopColor: theme.border, paddingBottom: insets.bottom + 6 }]}>
      {TABS.map((t) => {
        const focused = active === t.name;
        return (
          <TouchableOpacity key={t.name} style={s.item} onPress={() => go(t.name)} activeOpacity={0.7}>
            <Ionicons name={focused ? t.on : t.icon} size={21} color={focused ? theme.accent : theme.subText} />
            <Text style={[s.label, { color: focused ? theme.accent : theme.subText }]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar:   { flexDirection: 'row', borderTopWidth: 1, paddingTop: 8 },
  item:  { flex: 1, alignItems: 'center', gap: 3 },
  label: { fontSize: 10, fontWeight: '700' },
});
