import React from 'react';
import { Text } from 'react-native';

// Max scale factor — prevents extreme accessibility sizes from breaking layouts.
// At 1.3, a user with "Large" font still gets noticeably bigger text without overflow.
const MAX_FONT_SCALE = 1.3;

export default function AppText({ style, children, maxFontSizeMultiplier, ...props }) {
  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? MAX_FONT_SCALE}
      style={style}
      {...props}
    >
      {children}
    </Text>
  );
}
