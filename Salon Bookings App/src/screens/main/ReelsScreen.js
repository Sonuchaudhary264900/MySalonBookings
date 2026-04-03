import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, Dimensions, TouchableOpacity,
  ActivityIndicator, TextInput, KeyboardAvoidingView, Platform,
  Modal, Pressable, Share, Image, StatusBar, ScrollView,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Session ID for view deduplication ─────────────────────────────
let _sessionId = null;
async function getSessionId() {
  if (_sessionId) return _sessionId;
  let id = await AsyncStorage.getItem('reelSessionId');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    await AsyncStorage.setItem('reelSessionId', id);
  }
  _sessionId = id;
  return id;
}

// ── Helpers ────────────────────────────────────────────────────────
function fmtCount(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

function timeAgo(date) {
  if (!date) return '';
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60)    return `${Math.floor(diff)}s`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

// ── Star rating ────────────────────────────────────────────────────
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

// ── Single reel ────────────────────────────────────────────────────
function ReelItem({ item, isVisible, isMuted, onToggleMute, onOpenComment, onOpenSalon, onAuthRequired, token }) {
  const videoRef    = useRef(null);
  const viewTimerRef = useRef(null);
  const viewedRef    = useRef(false);

  const [liked,      setLiked]      = useState(item.liked || false);
  const [likeCount,  setLikeCount]  = useState(item.likeCount || 0);
  const [viewCount,  setViewCount]  = useState(item.viewCount || 0);
  const [progress,   setProgress]   = useState(0);

  const salon    = item.salon || {};
  const salonLogo = salon.logo || null;
  const city      = salon.city || '';

  // Play / pause when visibility changes
  useEffect(() => {
    if (!videoRef.current) return;
    if (isVisible) {
      videoRef.current.playAsync().catch(() => {});
    } else {
      videoRef.current.pauseAsync().catch(() => {});
      videoRef.current.setPositionAsync(0).catch(() => {});
      // Clear view timer when scrolled away
      clearTimeout(viewTimerRef.current);
      viewTimerRef.current = null;
    }
  }, [isVisible]);

  // Mute sync
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.setIsMutedAsync(isMuted).catch(() => {});
    }
  }, [isMuted]);

  // Playback status — progress bar + 3s view counting
  const handlePlaybackStatus = useCallback((status) => {
    if (!status.isLoaded) return;
    if (status.durationMillis > 0) {
      setProgress((status.positionMillis / status.durationMillis) * 100);
    }
    if (status.isPlaying && isVisible && !viewedRef.current) {
      if (!viewTimerRef.current) {
        viewTimerRef.current = setTimeout(async () => {
          viewedRef.current = true;
          try {
            const fingerprint = await getSessionId();
            const r = await api.post('/public/reels/view', {
              videoUrl: item.videoUrl,
              salonId: salon._id,
              fingerprint,
            });
            setViewCount(r.data.viewCount || (viewCount + 1));
          } catch {
            setViewCount(c => c + 1);
          }
        }, 3000);
      }
    } else if (!status.isPlaying) {
      clearTimeout(viewTimerRef.current);
      viewTimerRef.current = null;
    }
  }, [isVisible, item.videoUrl, salon._id, viewCount]);

  // Like — requires auth
  const handleLike = async () => {
    if (!token) { onAuthRequired(); return; }
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount(c => Math.max(0, c + (wasLiked ? -1 : 1)));
    try {
      const r = await api.post('/public/reels/like', {
        videoUrl: item.videoUrl,
        salonId: salon._id,
      });
      setLiked(r.data.liked);
      setLikeCount(r.data.count ?? (wasLiked ? likeCount - 1 : likeCount + 1));
    } catch {
      setLiked(wasLiked);
      setLikeCount(c => Math.max(0, c + (wasLiked ? 1 : -1)));
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${salon.name} on My Salon Bookings!\nhttps://mysalonbookings.com/salon/${salon._id}`,
        title: salon.name,
      });
    } catch { /* silent */ }
  };

  const handleComment = () => {
    if (!token) { onAuthRequired(); return; }
    onOpenComment(item);
  };

  return (
    <View style={styles.reel}>
      <StatusBar hidden />

      {/* Progress bar */}
      <View style={styles.progressWrap} pointerEvents="none">
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>

      {/* Video */}
      <Video
        ref={videoRef}
        source={{ uri: item.videoUrl }}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        isLooping
        isMuted={isMuted}
        shouldPlay={isVisible}
        useNativeControls={false}
        onPlaybackStatusUpdate={handlePlaybackStatus}
      />

      {/* Dark gradient overlay */}
      <View style={styles.gradient} pointerEvents="none" />

      {/* Top-right: mute button */}
      <View style={styles.topBar} pointerEvents="box-none">
        <TouchableOpacity onPress={onToggleMute} style={styles.muteBtn} activeOpacity={0.8}>
          <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Right sidebar: Like, Comment, Share, Avatar */}
      <View style={styles.sidebar}>
        {/* Like */}
        <TouchableOpacity style={styles.sideBtn} onPress={handleLike} activeOpacity={0.8}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={30} color={liked ? '#f43f5e' : '#fff'} />
          <Text style={[styles.sideBtnLabel, liked && { color: '#f43f5e' }]}>{fmtCount(likeCount)}</Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity style={styles.sideBtn} onPress={handleComment} activeOpacity={0.8}>
          <Ionicons name="chatbubble-outline" size={27} color="#fff" />
          <Text style={styles.sideBtnLabel}>{fmtCount(item.commentCount || 0)}</Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity style={styles.sideBtn} onPress={handleShare} activeOpacity={0.8}>
          <Ionicons name="share-social-outline" size={27} color="#fff" />
          <Text style={styles.sideBtnLabel}>Share</Text>
        </TouchableOpacity>

        {/* Salon avatar */}
        <TouchableOpacity style={styles.sideBtn} onPress={() => onOpenSalon(salon._id)} activeOpacity={0.8}>
          <View style={styles.sideAvatarWrap}>
            {salonLogo ? (
              <Image source={{ uri: salonLogo }} style={styles.sideAvatar} />
            ) : (
              <View style={[styles.sideAvatar, { backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="storefront-outline" size={18} color="#fff" />
              </View>
            )}
            <View style={styles.sideAvatarPlus}>
              <Ionicons name="add" size={11} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Bottom-left: salon info + view count */}
      <View style={styles.bottomInfo} pointerEvents="box-none">
        <TouchableOpacity onPress={() => onOpenSalon(salon._id)} activeOpacity={0.8}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            {salonLogo ? (
              <Image source={{ uri: salonLogo }} style={styles.bottomAvatar} />
            ) : (
              <View style={[styles.bottomAvatar, { backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="storefront-outline" size={16} color="#fff" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.salonName} numberOfLines={1}>{salon.name || 'Salon'}</Text>
              {city ? <Text style={styles.salonCity}>📍 {city}</Text> : null}
            </View>
          </View>
        </TouchableOpacity>
        <StarRow rating={salon.averageRating} />
        {viewCount > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Ionicons name="eye-outline" size={12} color="rgba(255,255,255,0.6)" />
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600' }}>{fmtCount(viewCount)} views</Text>
          </View>
        )}
        {item.categories?.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {item.categories.map(cat => (
              <View key={cat} style={styles.catChip}>
                <Text style={styles.catChipText}>{cat}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <TouchableOpacity style={styles.bookNowBtn} onPress={() => onOpenSalon(salon._id)} activeOpacity={0.85}>
            <Text style={styles.bookNowText}>Book Now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.viewSalonBtn} onPress={() => onOpenSalon(salon._id)} activeOpacity={0.85}>
            <Text style={styles.viewSalonText}>View Salon</Text>
            <Ionicons name="arrow-forward" size={13} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Comment bottom sheet ───────────────────────────────────────────
function CommentSheet({ visible, reel, onClose, token }) {
  const [text,     setText]     = useState('');
  const [comments, setComments] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [posting,  setPosting]  = useState(false);

  useEffect(() => {
    if (!visible || !reel) { setComments([]); return; }
    setLoading(true);
    api.get(`/public/reels/comments?videoUrl=${encodeURIComponent(reel.videoUrl)}`)
      .then(r => setComments(r.data.data || []))
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [visible, reel]);

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || !reel || posting) return;
    setPosting(true);
    try {
      const r = await api.post('/public/reels/comments', {
        videoUrl: reel.videoUrl,
        salonId: reel.salon._id,
        text: trimmed,
      });
      setComments(prev => [r.data.data, ...prev]);
      setText('');
    } catch { /* silent */ }
    finally { setPosting(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>
          Comments{reel ? ` · ${reel.salon?.name}` : ''}
        </Text>

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          {loading ? (
            <ActivityIndicator color="#6366f1" style={{ marginTop: 20 }} />
          ) : comments.length === 0 ? (
            <Text style={styles.sheetEmpty}>No comments yet. Be the first!</Text>
          ) : (
            comments.map(c => (
              <View key={c._id} style={styles.commentBlock}>
                {/* User comment */}
                <View style={styles.commentRow}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarText}>{c.name?.[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.commentName}>{c.name}</Text>
                      <Text style={styles.commentTime}>{timeAgo(c.createdAt)}</Text>
                    </View>
                    <Text style={styles.commentText}>{c.text}</Text>
                  </View>
                </View>

                {/* Owner replies */}
                {c.replies?.map((r, i) => (
                  <View key={i} style={styles.replyRow}>
                    <View style={styles.replyLine} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Text style={styles.replyOwnerName}>{r.ownerName}</Text>
                        <View style={styles.ownerBadge}>
                          <Text style={styles.ownerBadgeText}>Owner</Text>
                        </View>
                        <Text style={styles.commentTime}>{timeAgo(r.createdAt)}</Text>
                      </View>
                      <Text style={styles.replyText}>{r.text}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>

        {token ? (
          <View style={styles.commentInput}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Add a comment…"
              placeholderTextColor="#6b7280"
              style={styles.commentTextInput}
              onSubmitEditing={submit}
              returnKeyType="send"
              multiline={false}
            />
            <TouchableOpacity
              onPress={submit}
              style={[styles.commentSend, (!text.trim() || posting) && { opacity: 0.4 }]}
              disabled={!text.trim() || posting}
            >
              {posting
                ? <ActivityIndicator size="small" color="#6366f1" />
                : <Ionicons name="send" size={20} color="#6366f1" />}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.loginNudge}>
            <Text style={styles.loginNudgeText}>Log in to comment</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Auth gate modal ────────────────────────────────────────────────
function AuthModal({ visible, onClose, onLogin, onRegister }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.authBackdrop} onPress={onClose}>
        <Pressable style={styles.authCard} onPress={() => {}}>
          <Text style={{ fontSize: 36, textAlign: 'center', marginBottom: 10 }}>🔐</Text>
          <Text style={styles.authTitle}>Login Required</Text>
          <Text style={styles.authSub}>You need to be logged in to like or comment on reels.</Text>
          <TouchableOpacity style={styles.authPrimaryBtn} onPress={onLogin} activeOpacity={0.85}>
            <Text style={styles.authPrimaryText}>Log In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.authSecondaryBtn} onPress={onRegister} activeOpacity={0.85}>
            <Text style={styles.authSecondaryText}>Create Account</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 8 }}>
            <Text style={{ color: '#6b7280', fontSize: 13, textAlign: 'center' }}>Maybe Later</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Main ReelsScreen ───────────────────────────────────────────────
export default function ReelsScreen() {
  const navigation = useNavigation();
  const { token } = useAuth();

  const [reels,        setReels]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [page,         setPage]         = useState(1);
  const [hasMore,      setHasMore]      = useState(true);
  const [isMuted,      setIsMuted]      = useState(false);
  const [visibleIndex, setVisibleIndex] = useState(0);

  const [mode,      setMode]      = useState('nearest'); // 'nearest' | 'all'
  const [gender,    setGender]    = useState('all');     // 'all' | 'male' | 'female'
  const [coords,    setCoords]    = useState(null);
  const [locLabel,  setLocLabel]  = useState('');

  const [commentTarget, setCommentTarget] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const flatRef       = useRef(null);
  const fetchedPages  = useRef(new Set());

  // Get location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
          setLocLabel('Nearby You');
        } else {
          setMode('all');
          setLocLabel('All Salons');
        }
      } catch {
        setMode('all');
        setLocLabel('All Salons');
      }
    })();
  }, []);

  const buildUrl = useCallback((pageNum, currentMode, currentGender, currentCoords) => {
    let url = `/public/reels?page=${pageNum}&limit=10`;
    if (currentGender && currentGender !== 'all') url += `&gender=${currentGender}`;
    if (currentMode === 'all') {
      url += '&mode=all';
    } else if (currentCoords) {
      url += `&latitude=${currentCoords.lat}&longitude=${currentCoords.lng}`;
    }
    return url;
  }, []);

  const fetchReels = useCallback(async (pageNum, currentMode, currentGender, currentCoords) => {
    const key = `${pageNum}_${currentMode}_${currentGender}`;
    if (fetchedPages.current.has(key)) return;
    fetchedPages.current.add(key);

    try {
      const url = buildUrl(pageNum, currentMode, currentGender, currentCoords);
      const res = await api.get(url);
      const data = res.data.data || [];
      if (data.length) {
        setReels(prev => pageNum === 1 ? data : [...prev, ...data]);
        setHasMore(data.length === 10);
      } else {
        if (pageNum === 1) setReels([]);
        setHasMore(false);
      }
    } catch {
      if (pageNum === 1) setReels([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [buildUrl]);

  // Initial load once location resolves
  useEffect(() => {
    if (!locLabel) return;
    fetchReels(1, mode, gender, coords);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locLabel]);

  // Re-fetch when mode or gender changes
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    fetchedPages.current.clear();
    setPage(1);
    setHasMore(true);
    setLoading(true);
    setReels([]);
    fetchReels(1, mode, gender, coords);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, gender]);

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    const next = page + 1;
    setPage(next);
    setLoadingMore(true);
    fetchReels(next, mode, gender, coords);
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) setVisibleIndex(viewableItems[0].index ?? 0);
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const openSalon = (salonId) => {
    navigation.navigate('HomeTab', { screen: 'SalonDetails', params: { salonId } });
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
        <Text style={{ color: '#9ca3af', marginTop: 16, fontSize: 16 }}>No reels found</Text>
        <Text style={{ color: '#6b7280', marginTop: 4, fontSize: 13, textAlign: 'center', paddingHorizontal: 40 }}>
          Try switching to "All" mode or a different gender filter
        </Text>
        <TouchableOpacity onPress={() => { setMode('all'); }} style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#6366f1', borderRadius: 20 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Show All Salons</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Floating top bar — location + mode + gender */}
      <View style={styles.topOverlay} pointerEvents="box-none">
        {/* Row 1: location label */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 8 }} pointerEvents="none">
          <Ionicons name="location" size={13} color="#818cf8" />
          <Text style={styles.locationText}>{locLabel}</Text>
        </View>

        {/* Row 2: mode toggle */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }} pointerEvents="box-none">
          {[['nearest', '📍 Nearest'], ['all', '🌐 All']].map(([m, label]) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMode(m)}
              style={[styles.filterPill, mode === m && styles.filterPillActive]}
              activeOpacity={0.85}
            >
              <Text style={[styles.filterPillText, mode === m && styles.filterPillTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Row 3: gender filter */}
        <View style={{ flexDirection: 'row', gap: 5 }} pointerEvents="box-none">
          {[['all', 'All'], ['male', 'Men'], ['female', 'Women']].map(([g, label]) => (
            <TouchableOpacity
              key={g}
              onPress={() => setGender(g)}
              style={[styles.genderPill, gender === g && styles.genderPillActive]}
              activeOpacity={0.85}
            >
              <Text style={[styles.genderPillText, gender === g && styles.genderPillTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        ref={flatRef}
        data={reels}
        keyExtractor={(item, i) => `${item._id}_${i}`}
        renderItem={({ item, index }) => (
          <ReelItem
            item={item}
            isVisible={index === visibleIndex}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(m => !m)}
            onOpenComment={setCommentTarget}
            onOpenSalon={openSalon}
            onAuthRequired={() => setShowAuthModal(true)}
            token={token}
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
        reel={commentTarget}
        onClose={() => setCommentTarget(null)}
        token={token}
      />

      <AuthModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={() => { setShowAuthModal(false); navigation.navigate('AuthStack', { screen: 'Login' }); }}
        onRegister={() => { setShowAuthModal(false); navigation.navigate('AuthStack', { screen: 'Register' }); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  reel:   { width: SCREEN_W, height: SCREEN_H, backgroundColor: '#000' },

  progressWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
    backgroundColor: 'rgba(255,255,255,0.15)', zIndex: 25,
  },
  progressBar: { height: 2, backgroundColor: '#fff' },

  gradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },

  topBar: { position: 'absolute', top: 50, right: 16, zIndex: 10 },
  muteBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },

  topOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingHorizontal: 12,
    zIndex: 20,
    alignItems: 'center',
  },
  locationText: { color: '#c7d2fe', fontSize: 12, fontWeight: '600' },

  filterPill: {
    flex: 1, paddingVertical: 6, borderRadius: 20, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  filterPillActive: { backgroundColor: '#fff' },
  filterPillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  filterPillTextActive: { color: '#000' },

  genderPill: {
    flex: 1, paddingVertical: 5, borderRadius: 14, alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
  },
  genderPillActive: { backgroundColor: 'rgba(139,92,246,0.55)', borderColor: '#a78bfa' },
  genderPillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  genderPillTextActive: { color: '#e9d5ff' },

  sidebar: {
    position: 'absolute', right: 12, bottom: 120,
    gap: 20, alignItems: 'center', zIndex: 10,
  },
  sideBtn:      { alignItems: 'center', gap: 3 },
  sideBtnLabel: { color: '#fff', fontSize: 12, fontWeight: '600' },
  sideAvatarWrap: { position: 'relative' },
  sideAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#fff' },
  sideAvatarPlus: {
    position: 'absolute', bottom: -6, left: '50%', marginLeft: -10,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#f43f5e', alignItems: 'center', justifyContent: 'center',
  },

  bottomInfo: {
    position: 'absolute', bottom: 90, left: 14, right: 80, zIndex: 10,
  },
  bottomAvatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: '#fff' },
  salonName:    { color: '#fff', fontSize: 15, fontWeight: '700' },
  salonCity:    { color: '#d1d5db', fontSize: 12 },
  catChip:      { backgroundColor: 'rgba(99,102,241,0.65)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  catChipText:  { color: '#fff', fontSize: 10, fontWeight: '700' },
  bookNowBtn: {
    backgroundColor: '#6366f1', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, alignSelf: 'flex-start',
    shadowColor: '#6366f1', shadowOpacity: 0.5, shadowRadius: 8, elevation: 4,
  },
  bookNowText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  viewSalonBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 12,
    paddingVertical: 7, borderRadius: 20, alignSelf: 'flex-start',
  },
  viewSalonText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Comment sheet
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#111827', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 16, maxHeight: SCREEN_H * 0.75, minHeight: 320,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#374151',
    alignSelf: 'center', marginBottom: 12,
  },
  sheetTitle:  { color: '#f9fafb', fontSize: 15, fontWeight: '700', marginBottom: 12 },
  sheetEmpty:  { color: '#6b7280', textAlign: 'center', marginTop: 24 },
  commentBlock: { marginBottom: 14 },
  commentRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  commentAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center',
  },
  commentAvatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  commentName:  { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700' },
  commentTime:  { color: 'rgba(255,255,255,0.3)', fontSize: 10 },
  commentText:  { color: '#e5e7eb', fontSize: 13, lineHeight: 18, marginTop: 2 },
  replyRow: { flexDirection: 'row', marginTop: 8, marginLeft: 40, gap: 8 },
  replyLine: { width: 2, borderRadius: 1, backgroundColor: 'rgba(139,92,246,0.45)', alignSelf: 'stretch' },
  replyOwnerName: { color: '#a78bfa', fontSize: 11, fontWeight: '700' },
  ownerBadge: {
    backgroundColor: 'rgba(139,92,246,0.3)', borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  ownerBadgeText: { color: '#c4b5fd', fontSize: 9, fontWeight: '700' },
  replyText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 18, marginTop: 2 },
  commentInput: {
    flexDirection: 'row', alignItems: 'center', borderTopWidth: 1,
    borderTopColor: '#374151', paddingTop: 10, gap: 8,
  },
  commentTextInput: {
    flex: 1, backgroundColor: '#1f2937', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, color: '#f9fafb', fontSize: 14,
  },
  commentSend: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#1f2937',
    alignItems: 'center', justifyContent: 'center',
  },
  loginNudge: {
    borderTopWidth: 1, borderTopColor: '#374151', paddingVertical: 12, alignItems: 'center',
  },
  loginNudgeText: { color: '#6b7280', fontSize: 13 },

  // Auth modal
  authBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  authCard: {
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20, padding: 28, width: '100%', maxWidth: 320,
  },
  authTitle:        { color: '#fff', fontSize: 17, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  authSub:          { color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  authPrimaryBtn:   { backgroundColor: '#6366f1', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginBottom: 10 },
  authPrimaryText:  { color: '#fff', fontWeight: '700', fontSize: 14 },
  authSecondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingVertical: 12, alignItems: 'center',
  },
  authSecondaryText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
