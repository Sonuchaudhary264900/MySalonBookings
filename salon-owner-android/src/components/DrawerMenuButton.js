import React, { useContext } from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DrawerContext } from '../../App';

export default function DrawerMenuButton({ color = '#fff', style }) {
  const { openDrawer } = useContext(DrawerContext);
  return (
    <TouchableOpacity
      onPress={openDrawer}
      style={[{ padding: 4, marginTop: 4 }, style]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="menu" size={24} color={color} />
    </TouchableOpacity>
  );
}