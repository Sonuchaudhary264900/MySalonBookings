import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated, Dimensions } from 'react-native';

const { width: SW } = Dimensions.get('window');
const SIZE = Math.min(SW - 80, 280);

const SHAPE_LABELS = {
  oval:   'Oval',
  round:  'Round',
  square: 'Square',
  heart:  'Heart',
  oblong: 'Oblong',
};

export default function FaceShapeReveal({ faceShape, imageUri, onComplete }) {
  const ringScale  = useRef(new Animated.Value(0.5)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    // Step 1 (0–80ms): ring appears
    // Step 2 (80–1200ms): ring scales to full size
    // Step 3 (1200ms): shape name fades/slides in
    // Step 4 (1900ms): call onComplete

    Animated.sequence([
      Animated.parallel([
        Animated.timing(ringOpacity, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.spring(ringScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      ]),
      Animated.delay(800),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(textTranslateY, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]),
      Animated.delay(700),
    ]).start(() => {
      onComplete?.();
    });
  }, []);

  const ringBorderRadius = faceShape === 'round' ? SIZE / 2
    : faceShape === 'square' ? 20
    : faceShape === 'heart'  ? SIZE / 4
    : faceShape === 'oblong' ? SIZE / 2
    : SIZE / 2.8;  // oval default

  const ringHeight = faceShape === 'oblong' ? SIZE * 1.15
    : faceShape === 'round'  ? SIZE
    : faceShape === 'square' ? SIZE
    : SIZE * 1.05;

  return (
    <View style={styles.root}>
      <View style={styles.frame}>
        {/* User photo */}
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={[styles.photo, { backgroundColor: '#222' }]} />
        )}

        {/* Animated ring */}
        <Animated.View
          style={[
            styles.ring,
            {
              width:  SIZE,
              height: ringHeight,
              borderRadius: ringBorderRadius,
              opacity:   ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
        />
      </View>

      {/* Face shape label */}
      <Animated.View style={[
        styles.labelWrap,
        { opacity: textOpacity, transform: [{ translateY: textTranslateY }] },
      ]}>
        <Text style={styles.shapeName}>{SHAPE_LABELS[faceShape] || faceShape}</Text>
        <Text style={styles.shapeSubtitle}>Face Shape Detected</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { alignItems: 'center', paddingHorizontal: 20 },
  frame: {
    width: SIZE, height: SIZE * 1.15, alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  photo: {
    width:  SIZE * 0.88,
    height: SIZE * 1.0,
    borderRadius: SIZE * 0.44,
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#f59e0b',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 10,
  },
  labelWrap: {
    alignItems: 'center', marginTop: 20,
  },
  shapeName: {
    fontSize: 28, fontWeight: '900', color: '#f59e0b', letterSpacing: 1,
  },
  shapeSubtitle: {
    fontSize: 13, color: '#aaa', marginTop: 4, fontWeight: '600', letterSpacing: 0.5,
  },
});
