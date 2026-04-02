import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, Dimensions, TouchableOpacity,
  ActivityIndicator, TextInput, KeyboardAvoidingView, Platform,
  Modal, Pressable, Share, Image, StatusBar,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';

const API_BASE = 'https://mysalonbookings.onrender.com/api';
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Helper: star rating row ──────────────────────────────────────
function StarRow({ rating }) {
  const stars = Math.round(rating || 0);
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons key={i} name={i <= stars ? 'star' : 'star-outline'} size={11} color="#fbbf24" />
      ))}
    </View>
  );
}

// ── Single reel item ─────────────────────────────────────────────
function ReelItem({ item, isVisible, isMuted, onToggleMute, onLike, onOpenComment, onOpenSalon }) {
  const videoRef = useRef(null);
  const [liked, setLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(item.likeCount || 0);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isVisible) {
      videoRef.current.playAsync().catch(() => {});
    } else {
      videoRef.current.pauseAsync().catch(() => {});
      videoRef.current.setPositionAsync(0).catch(() => {});
    }
  }, [isVisible]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.setIsMutedAsync(isMuted).catch(() => {});
    }
  }, [isMuted]);

  const handleLike = () => {
    const next = !liked;
    setLiked(next);
    setLocalLikes(prev => prev + (next ? 1 : -1));
    onLike && onLike(item._id, next);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${item.salonName} on My Salon Bookings!\nhttps://mysalonbookings.com/salon/${item.salonId}`,
        title: item.salonName,
      });
    } catch { /* silent */ }
  };

  const salon = item;
  const salonLogo = salon.logo || salon.image || null;
  const city = salon.city || salon.location?.city || '';

  return (
    <View style={styles.reel}>
      <StatusBar hidden />

      {/* Video */}
      <Video
        ref={videoRef}
        source={{ uri: item.url }}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        isLooping
        isMuted={isMuted}
        shouldPlay={isVisible}
        useNativeControls={false}
      />

      {/* Dark gradient overlay */}
      <View style={styles.gradient} pointerEvents="none" />

      {/* Top: mute button */}
      <View style={styles.topBar} pointerEvents="box-none">
        <TouchableOpacity onPress={onToggleMute} style={styles.muteBtn} activeOpacity={0.8}>
          <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Right sidebar: Like, Comment, Share, Account */}
      <View style={styles.sidebar}>
        {/* Like */}
        <TouchableOpacity style={styles.sideBtn} onPress={handleLike} activeOpacity={0.8}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={28} color={liked ? '#f43f5e' : '#fff'} />
          <Text style={styles.sideBtnLabel}>{localLikes > 0 ? localLikes : ''}</Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity style={styles.sideBtn} onPress={() => onOpenComment(item)} activeOpacity={0.8}>
          <Ionicons name="chatbubble-outline" size={26} color="#fff" />
          <Text style={styles.sideBtnLabel}>{item.commentCount > 0 ? item.commentCount : ''}</Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity style={styles.sideBtn} onPress={handleShare} activeOpacity={0.8}>
          <Ionicons name="share-social-outline" size={26} color="#fff" />
        </TouchableOpacity>

        {/* Account / salon info */}
        <TouchableOpacity style={styles.sideBtn} onPress={() => onOpenSalon(item.salonId)} activeOpacity={0.8}>
          {salonLogo ? (
            <Image source={{ uri: salonLogo }} style={styles.sideAvatar} />
          ) : (
            <View style={[styles.sideAvatar, { backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="storefront-outline" size={18} color="#fff" />
            </View>
          )}
          <View style={styles.sideAvatarPlus}>
            <Ionicons name="add" size={12} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Bottom-left: salon info */}
      <View style={styles.bottomInfo} pointerEvents="box-none">
        <TouchableOpacity onPress={() => onOpenSalon(item.salonId)} activeOpacity={0.8}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            {salonLogo ? (
              <Image source={{ uri: salonLogo }} style={styles.bottomAvatar} />
            ) : (
              <View style={[styles.bottomAvatar, { backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="storefront-outline" size={16} color="#fff" />
              </View>
            )}
            <View>
              <Text style={styles.salonName} numberOfLines={1}>{item.salonName || 'Salon'}</Text>
              {city ? <Text style={styles.salonCity}>{city}</Text> : null}
            </View>
          </View>
        </TouchableOpacity>
        <StarRow rating={item.rating} />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <TouchableOpacity
            style={styles.bookNowBtn}
            onPress={() => onOpenSalon(item.salonId)}
            activeOpacity={0.85}
          >
            <Text style={styles.bookNowText}>Book Now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.viewSalonBtn}
            onPress={() => onOpenSalon(item.salonId)}
            activeOpacity={0.85}
          >
            <Text style={styles.viewSalonText}>View Salon</Text>
            <Ionicons name="arrow-forward" size={13} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Comment bottom sheet ─────────────────────────────────────────
function CommentSheet({ visible, salon, onClose }) {
  const [text, setText] = useState('');
  const [comments, setComments] = useState([]);

  const submit = () => {
    if (!text.trim()) return;
    setComments(prev => [...prev, { id: Date.now(), text: text.trim() }]);
    setText('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Comments</Text>
        <View style={{ flex: 1 }}>
          {comments.length === 0 ? (
            <Text style={styles.sheetEmpty}>No comments yet. Be the first!</Text>
          ) : (
            comments.map(c => (
              <View key={c.id} style={styles.commentRow}>
                <Ionicons name="person-circle" size={28} color="#6366f1" />
                <Text style={styles.commentText}>{c.text}</Text>
              </View>
            ))
          )}
        </View>
        <View style={styles.commentInput}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Add a comment…"
            placeholderTextColor="#9ca3af"
            style={styles.commentTextInput}
            onSubmitEditing={submit}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={submit} style={styles.commentSend}>
            <Ionicons name="send" size={20} color="#6366f1" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main ReelsScreen ─────────────────────────────────────────────
export default function ReelsScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [locationLabel, setLocationLabel] = useState('');
  const [coords, setCoords] = useState(null);
  const [commentTarget, setCommentTarget] = useState(null);

  const flatRef = useRef(null);
  const fetchedPages = useRef(new Set());

  // Get location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
          setLocationLabel('Nearby You');
        } else {
          setLocationLabel('All Salons');
        }
      } catch {
        setLocationLabel('All Salons');
      }
    })();
  }, []);

  const fetchReels = useCallback(async (pageNum, coordsArg) => {
    if (fetchedPages.current.has(pageNum)) return;
    fetchedPages.current.add(pageNum);

    try {
      let url = `${API_BASE}/public/reels?page=${pageNum}&limit=10`;
      if (coordsArg) url += `&latitude=${coordsArg.lat}&longitude=${coordsArg.lng}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data?.length) {
        setReels(prev => pageNum === 1 ? json.data : [...prev, ...json.data]);
        setHasMore(json.data.length === 10);
      } else {
        setHasMore(false);
      }
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Fetch when coords resolved
  useEffect(() => {
    if (locationLabel) {
      fetchReels(1, coords);
    }
  }, [locationLabel, coords, fetchReels]);

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    const next = page + 1;
    setPage(next);
    setLoadingMore(true);
    fetchReels(next, coords);
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setVisibleIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const openSalon = (salonId) => {
    // Navigate to SalonDetails in HomeTab stack
    navigation.navigate('HomeTab', {
      screen: 'SalonDetails',
      params: { salonId },
    });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: '#000' }]}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={{ color: '#9ca3af', marginTop: 12 }}>Loading reels…</Text>
      </View>
    );
  }

  if (!reels.length) {
    return (
      <View style={[styles.center, { backgroundColor: '#000' }]}>
        <Ionicons name="film-outline" size={60} color="#374151" />
        <Text style={{ color: '#9ca3af', marginTop: 16, fontSize: 16 }}>No reels nearby yet</Text>
        <Text style={{ color: '#6b7280', marginTop: 4, fontSize: 13 }}>Salon owners haven't uploaded videos yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Location label at top */}
      <View style={styles.locationBar} pointerEvents="none">
        <Ionicons name="location" size={14} color="#818cf8" />
        <Text style={styles.locationText}>{locationLabel}</Text>
      </View>

      <FlatList
        ref={flatRef}
        data={reels}
        keyExtractor={(item, i) => `${item._id || item.salonId}_${item.videoIndex}_${i}`}
        renderItem={({ item, index }) => (
          <ReelItem
            item={item}
            isVisible={index === visibleIndex}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(m => !m)}
            onOpenComment={setCommentTarget}
            onOpenSalon={openSalon}
          />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        getItemLayout={(_, index) => ({ length: SCREEN_H, offset: SCREEN_H * index, index })}
        ListFooterComponent={loadingMore ? (
          <View style={[styles.center, { height: SCREEN_H, backgroundColor: '#000' }]}>
            <ActivityIndicator color="#6366f1" />
          </View>
        ) : null}
        decelerationRate="fast"
        snapToInterval={SCREEN_H}
        snapToAlignment="start"
      />

      <CommentSheet
        visible={!!commentTarget}
        salon={commentTarget}
        onClose={() => setCommentTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  reel: { width: SCREEN_W, height: SCREEN_H, backgroundColor: '#000' },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    background: 'transparent',
    // Simulate gradient with dark bottom overlay
    justifyContent: 'flex-end',
  },

  topBar: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 10,
  },
  muteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  locationBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    zIndex: 20,
  },
  locationText: { color: '#c7d2fe', fontSize: 12, fontWeight: '600' },

  sidebar: {
    position: 'absolute',
    right: 12,
    bottom: 120,
    gap: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  sideBtn: { alignItems: 'center', gap: 3 },
  sideBtnLabel: { color: '#fff', fontSize: 12, fontWeight: '600' },
  sideAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#fff',
  },
  sideAvatarPlus: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f43f5e',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomInfo: {
    position: 'absolute',
    bottom: 90,
    left: 14,
    right: 80,
    zIndex: 10,
  },
  bottomAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#fff',
  },
  salonName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  salonCity: { color: '#d1d5db', fontSize: 12 },
  bookNowBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
    shadowColor: '#6366f1',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  bookNowText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  viewSalonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  viewSalonText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Comment sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: SCREEN_H * 0.6,
    minHeight: 300,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#374151',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: { color: '#f9fafb', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  sheetEmpty: { color: '#6b7280', textAlign: 'center', marginTop: 20 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  commentText: { color: '#e5e7eb', flex: 1, lineHeight: 20 },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 10,
    gap: 8,
  },
  commentTextInput: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#f9fafb',
    fontSize: 14,
  },
  commentSend: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
