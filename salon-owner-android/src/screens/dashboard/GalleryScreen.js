import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Alert, Image, Dimensions,
  Modal, ScrollView, StatusBar, TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { showSuccess, showError } from '../../utils/toast';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const NUM_COLS = 3;
const TILE_SIZE = (SCREEN_W - 32 - (NUM_COLS - 1) * 4) / NUM_COLS;
const ALL_TAGS = ['Haircut', 'Beard', 'Facial', 'Spa', 'Nails', 'Makeup'];

/* ── Lightbox ── */
function Lightbox({ media, initialIndex, coverId, onClose, onDeleted, onCoverSet }) {
  const [idx, setIdx] = useState(initialIndex);
  const [deleting, setDeleting] = useState(false);
  const [settingCover, setSettingCover] = useState(false);
  const videoRef = useRef(null);
  const item = media[idx];
  if (!item) return null;

  const mediaUrl = item.url || item.imageUrl || item.image;
  const isCover = item._id === coverId;
  const isVideo = item.type === 'video';

  const handleDelete = () => {
    Alert.alert('Delete Media', `Remove this ${isVideo ? 'video' : 'photo'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setDeleting(true);
          try {
            await api.delete(`/owner/gallery/${item._id}`);
            onDeleted(item._id);
            if (media.length <= 1) { onClose(); return; }
            setIdx(prev => Math.max(0, prev - 1));
          } catch { showError('Error', 'Failed to delete'); }
          finally { setDeleting(false); }
        }
      },
    ]);
  };

  const handleSetCover = async () => {
    if (isCover || isVideo) return;
    setSettingCover(true);
    try {
      await api.put('/owner/salon', { coverPhoto: mediaUrl });
      onCoverSet(item._id);
      showSuccess('Cover Updated', 'Cover photo updated!');
    } catch { showError('Error', 'Failed to set cover photo'); }
    finally { setSettingCover(false); }
  };

  const goTo = (newIdx) => {
    if (videoRef.current) videoRef.current.pauseAsync?.().catch(() => {});
    setIdx(newIdx);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={lbStyles.overlay}>
        <View style={lbStyles.topBar}>
          <TouchableOpacity style={lbStyles.topBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={lbStyles.counter}>{idx + 1} / {media.length}</Text>
            {isVideo && (
              <View style={lbStyles.videoTag}>
                <Ionicons name="videocam" size={10} color="#a78bfa" />
                <Text style={lbStyles.videoTagText}>Video</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={lbStyles.topBtn} onPress={handleDelete} disabled={deleting}>
            {deleting ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="trash-outline" size={22} color="#fff" />}
          </TouchableOpacity>
        </View>

        <TouchableWithoutFeedback onPress={!isVideo ? onClose : undefined}>
          <View style={lbStyles.mediaWrap}>
            {isVideo ? (
              <Video
                ref={videoRef}
                source={{ uri: mediaUrl }}
                style={lbStyles.video}
                resizeMode={ResizeMode.CONTAIN}
                useNativeControls
                shouldPlay
                isLooping={false}
              />
            ) : (
              <Image source={{ uri: mediaUrl }} style={lbStyles.image} resizeMode="contain" />
            )}
          </View>
        </TouchableWithoutFeedback>

        {idx > 0 && (
          <TouchableOpacity style={lbStyles.navLeft} onPress={() => goTo(idx - 1)}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
        )}
        {idx < media.length - 1 && (
          <TouchableOpacity style={lbStyles.navRight} onPress={() => goTo(idx + 1)}>
            <Ionicons name="chevron-forward" size={28} color="#fff" />
          </TouchableOpacity>
        )}

        <View style={lbStyles.bottomBar}>
          {item.tags?.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {item.tags.map(t => (
                  <View key={t} style={lbStyles.tagPill}>
                    <Text style={lbStyles.tagText}>{t}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
          {!isVideo && (
            <TouchableOpacity
              style={[lbStyles.coverBtn, isCover && lbStyles.coverBtnActive]}
              onPress={handleSetCover}
              disabled={settingCover || isCover}
            >
              {settingCover
                ? <ActivityIndicator color={isCover ? '#f59e0b' : '#fff'} size="small" />
                : <Ionicons name={isCover ? 'star' : 'star-outline'} size={16} color={isCover ? '#f59e0b' : '#fff'} />
              }
              <Text style={[lbStyles.coverBtnText, isCover && { color: '#f59e0b' }]}>
                {isCover ? 'Cover Photo' : 'Set as Cover'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

/* ── Reels Insights (analytics + comment replies) ── */
function ReelsInsightsModal({ visible, onClose, theme }) {
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    api.get('/owner/reels/analytics')
      .then(r => setAnalytics(r.data?.data || []))
      .catch(() => setAnalytics([]))
      .finally(() => setLoading(false));
  }, [visible]);

  const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n ?? 0}`);
  const totals = analytics.reduce((a, r) => ({
    likes: a.likes + (r.likeCount || 0),
    comments: a.comments + (r.commentCount || 0),
    views: a.views + (r.viewCount || 0),
  }), { likes: 0, comments: 0, views: 0 });

  const submitReply = async (reelIdx, commentId) => {
    const text = replyText.trim();
    if (!text) return;
    setPosting(true);
    try {
      const resp = await api.post(`/owner/reels/comments/${commentId}/reply`, { text });
      const newReply = resp.data?.data || { text, ownerName: 'You' };
      setAnalytics(prev => prev.map((r, i) => i !== reelIdx ? r : {
        ...r,
        recentComments: (r.recentComments || []).map(c =>
          String(c._id) === String(commentId)
            ? { ...c, replies: [...(c.replies || []), newReply] }
            : c),
      }));
      setReplyText('');
      setReplyingTo(null);
      showSuccess('Posted', 'Reply posted');
    } catch { showError('Error', 'Failed to post reply'); }
    finally { setPosting(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.reelsBox, { backgroundColor: theme.bg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Reels Performance</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={theme.text} /></TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator color="#6366f1" style={{ paddingVertical: 40 }} />
          ) : analytics.length === 0 ? (
            <Text style={{ textAlign: 'center', color: theme.subText, paddingVertical: 40 }}>No reels yet</Text>
          ) : (
            <ScrollView>
              <View style={styles.statsRow}>
                <View style={[styles.statBox, { backgroundColor: '#fef2f2' }]}>
                  <Text style={[styles.statVal, { color: '#e11d48' }]}>{fmt(totals.likes)}</Text>
                  <Text style={styles.statLbl}>Likes</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: '#eef2ff' }]}>
                  <Text style={[styles.statVal, { color: '#6366f1' }]}>{fmt(totals.comments)}</Text>
                  <Text style={styles.statLbl}>Comments</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: '#ecfeff' }]}>
                  <Text style={[styles.statVal, { color: '#0891b2' }]}>{fmt(totals.views)}</Text>
                  <Text style={styles.statLbl}>Views</Text>
                </View>
              </View>

              {analytics.map((reel, ri) => (
                <View key={ri} style={[styles.reelCard, { backgroundColor: theme.card }]}>
                  <View style={{ flexDirection: 'row', gap: 14, marginBottom: 8 }}>
                    <Text style={{ fontSize: 12, color: '#e11d48' }}>♥ {fmt(reel.likeCount)}</Text>
                    <Text style={{ fontSize: 12, color: '#6366f1' }}>💬 {fmt(reel.commentCount)}</Text>
                    <Text style={{ fontSize: 12, color: '#0891b2' }}>▶ {fmt(reel.viewCount || 0)}</Text>
                  </View>
                  {(reel.recentComments || []).map(c => (
                    <View key={c._id} style={{ marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border || '#e5e7eb', paddingTop: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text }}>{c.name || 'Customer'}</Text>
                      <Text style={{ fontSize: 12, color: theme.subText, marginTop: 1 }}>{c.text}</Text>
                      {(c.replies || []).map((r, rIdx) => (
                        <Text key={rIdx} style={{ fontSize: 11, color: '#6366f1', marginTop: 4, marginLeft: 12 }}>↳ {r.ownerName || 'You'}: {r.text}</Text>
                      ))}
                      {replyingTo === c._id ? (
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                          <TextInput
                            style={[styles.input, { flex: 1, marginBottom: 0, borderColor: theme.border || '#e5e7eb', color: theme.text, backgroundColor: theme.bg }]}
                            placeholder="Write a reply…"
                            placeholderTextColor={theme.subText}
                            value={replyText}
                            onChangeText={setReplyText}
                            autoFocus
                          />
                          <TouchableOpacity style={[styles.saveBtn, { paddingHorizontal: 16, paddingVertical: 10, marginTop: 0 }]} onPress={() => submitReply(ri, c._id)} disabled={posting}>
                            {posting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Send</Text>}
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity onPress={() => { setReplyingTo(c._id); setReplyText(''); }}>
                          <Text style={{ fontSize: 11, color: '#6366f1', marginTop: 4, fontWeight: '600' }}>Reply</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  {(!reel.recentComments || reel.recentComments.length === 0) && (
                    <Text style={{ fontSize: 11, color: theme.subText }}>No comments yet</Text>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const [media, setMedia] = useState([]);          // combined photos + videos
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [coverId, setCoverId] = useState(null);
  const [activeTag, setActiveTag] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [showReels, setShowReels] = useState(false);

  const fetchMedia = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [galRes, salonRes] = await Promise.all([
        api.get('/owner/gallery'),
        api.get('/owner/salon'),
      ]);
      const d = galRes.data?.data;
      const arr = Array.isArray(d) ? d : (d?.photos || d?.images || []);
      setMedia(arr);
      const coverUrl = salonRes.data?.data?.coverPhoto;
      if (coverUrl) {
        const cover = arr.find(p => (p.url || p.imageUrl || p.image) === coverUrl);
        if (cover) setCoverId(cover._id);
      }
    } catch { setMedia([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);
  const onRefresh = async () => { setRefreshing(true); await fetchMedia(true); setRefreshing(false); };

  /* ── Upload handler — shows action sheet for photo or video ── */
  const pickAndUpload = () => {
    Alert.alert('Upload Media', 'What would you like to upload?', [
      { text: 'Photos', onPress: () => pickMedia('image') },
      { text: 'Video', onPress: () => pickMedia('video') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickMedia = async (type) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { showError('Permission Denied', 'Please allow media library access'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'image'
        ? ImagePicker.MediaTypeOptions.Images
        : ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: type === 'image',
      quality: type === 'image' ? 0.8 : 1,
      videoMaxDuration: 120,
    });
    if (result.canceled) return;

    setUploading(true);
    try {
      if (type === 'image') {
        for (const asset of result.assets) {
          const fd = new FormData();
          fd.append('image', {
            uri: asset.uri,
            type: asset.mimeType || 'image/jpeg',
            name: asset.fileName || `photo_${Date.now()}.jpg`,
          });
          await api.post('/owner/gallery', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        }
        showSuccess('Uploaded', `${result.assets.length} photo${result.assets.length > 1 ? 's' : ''} uploaded`);
      } else {
        const asset = result.assets[0];
        const fd = new FormData();
        fd.append('video', {
          uri: asset.uri,
          type: asset.mimeType || 'video/mp4',
          name: asset.fileName || `video_${Date.now()}.mp4`,
        });
        await api.post('/owner/gallery/video', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        showSuccess('Uploaded', 'Video uploaded successfully');
      }
      fetchMedia(true);
    } catch (err) {
      showError('Error', err.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  const handleDeleteFromGrid = (item) => {
    const isVideo = item.type === 'video';
    Alert.alert('Delete Media', `Remove this ${isVideo ? 'video' : 'photo'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/owner/gallery/${item._id}`);
            setMedia(prev => prev.filter(p => p._id !== item._id));
            if (item._id === coverId) setCoverId(null);
            showSuccess('Deleted', `${isVideo ? 'Video' : 'Photo'} removed`);
          } catch { showError('Error', 'Failed to delete'); }
        }
      },
    ]);
  };

  const handleLightboxDelete = (id) => {
    setMedia(prev => prev.filter(p => p._id !== id));
    if (id === coverId) setCoverId(null);
  };

  const handleCoverSet = (id) => {
    setCoverId(id);
    setMedia(prev => prev.map(p => ({ ...p, isCover: p._id === id })));
  };

  const imageMedia = useMemo(() => media.filter(m => m.type !== 'video'), [media]);
  const videoMedia = useMemo(() => media.filter(m => m.type === 'video'), [media]);

  const visibleMedia = useMemo(() =>
    activeTag
      ? imageMedia.filter(p => p.tags?.includes(activeTag))
      : media
  , [media, imageMedia, activeTag]);

  const tagCount = (tag) => imageMedia.filter(p => p.tags?.includes(tag)).length;
  const availableTags = ALL_TAGS.filter(t => tagCount(t) > 0);
  const featuredPhotos = useMemo(() =>
    imageMedia.filter(p => p.tags?.length > 0 || p._id === coverId).slice(0, 6)
  , [imageMedia, coverId]);

  const openLightbox = (item) => {
    const idx = visibleMedia.findIndex(p => p._id === item._id);
    setLightbox({ index: idx >= 0 ? idx : 0 });
  };

  const renderItem = ({ item }) => {
    const isCover = item._id === coverId;
    const isVideo = item.type === 'video';
    const rawUri  = item.url || item.imageUrl || item.image;
    // Cloudinary video URLs can't be displayed by <Image>.
    // Derive a thumbnail by requesting the first frame as a JPEG.
    const thumbUri = isVideo
      ? rawUri
          .replace('/video/upload/', '/video/upload/so_0,w_400,h_400,c_fill/')
          .replace(/\.(mp4|mov|avi|mkv|webm)$/i, '.jpg')
      : rawUri;

    return (
      <TouchableOpacity
        style={styles.tile}
        onPress={() => openLightbox(item)}
        onLongPress={() => handleDeleteFromGrid(item)}
        activeOpacity={0.85}
      >
        <Image source={{ uri: thumbUri }} style={styles.tileImage} resizeMode="cover" />

        {/* Video overlay */}
        {isVideo && (
          <View style={styles.videoOverlay}>
            <View style={styles.playCircle}>
              <Ionicons name="play" size={14} color="#fff" />
            </View>
          </View>
        )}

        {isCover && !isVideo && (
          <View style={styles.coverBadge}>
            <Ionicons name="star" size={10} color="#f59e0b" />
          </View>
        )}
        {item.tags?.length > 0 && (
          <View style={styles.tagBadge}>
            <Ionicons name="pricetag" size={9} color="#6366f1" />
          </View>
        )}
        {isVideo && (
          <View style={styles.videoBadge}>
            <Ionicons name="videocam" size={9} color="#a78bfa" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View style={{ gap: 12, marginBottom: 12 }}>
      {media.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8, paddingRight: 12 }}>
            {imageMedia.length > 0 && (
              <View style={[styles.statPill, { borderColor: '#818cf8', backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : '#eef2ff' }]}>
                <Ionicons name="images-outline" size={13} color="#6366f1" />
                <Text style={[styles.statPillText, { color: '#6366f1' }]}>{imageMedia.length} photos</Text>
              </View>
            )}
            {videoMedia.length > 0 && (
              <View style={[styles.statPill, { borderColor: '#a78bfa', backgroundColor: isDark ? 'rgba(139,92,246,0.12)' : '#f5f3ff' }]}>
                <Ionicons name="videocam-outline" size={13} color="#8b5cf6" />
                <Text style={[styles.statPillText, { color: '#8b5cf6' }]}>{videoMedia.length} videos</Text>
              </View>
            )}
            {coverId && (
              <View style={[styles.statPill, { borderColor: '#fde68a', backgroundColor: isDark ? 'rgba(217,119,6,0.12)' : '#fef9c3' }]}>
                <Ionicons name="star" size={13} color="#d97706" />
                <Text style={[styles.statPillText, { color: '#d97706' }]}>Cover set ✓</Text>
              </View>
            )}
            {availableTags.map(t => (
              <View key={t} style={[styles.statPill, { borderColor: theme.border, backgroundColor: theme.card }]}>
                <Ionicons name="pricetag-outline" size={12} color={theme.subText} />
                <Text style={[styles.statPillText, { color: theme.subText }]}>{tagCount(t)} {t}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {featuredPhotos.length > 0 && (
        <View style={[styles.featuredCard, { backgroundColor: theme.card }]}>
          <View style={styles.featuredHeader}>
            <Ionicons name="star" size={15} color="#f59e0b" />
            <Text style={[styles.featuredTitle, { color: theme.text }]}>Featured Photos</Text>
            <Text style={[styles.featuredCount, { color: theme.subText }]}>{featuredPhotos.length} selected</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {featuredPhotos.map(p => (
                <TouchableOpacity key={p._id} style={styles.featuredTile} onPress={() => openLightbox(p)}>
                  <Image source={{ uri: p.url || p.imageUrl || p.image }} style={styles.featuredImage} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {imageMedia.length > 0 && availableTags.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8, paddingRight: 12 }}>
            <TouchableOpacity
              style={[styles.tagFilterPill, { borderColor: !activeTag ? '#6366f1' : theme.border, backgroundColor: !activeTag ? '#6366f1' : theme.card }]}
              onPress={() => setActiveTag(null)}
            >
              <Text style={[styles.tagFilterText, { color: !activeTag ? '#fff' : theme.subText }]}>All</Text>
            </TouchableOpacity>
            {availableTags.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.tagFilterPill, { borderColor: activeTag === t ? '#6366f1' : theme.border, backgroundColor: activeTag === t ? '#6366f1' : theme.card }]}
                onPress={() => setActiveTag(prev => prev === t ? null : t)}
              >
                <Text style={[styles.tagFilterText, { color: activeTag === t ? '#fff' : theme.subText }]}>{t} ({tagCount(t)})</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Gallery</Text>
            <Text style={styles.headerSub}>Photos & Videos · Long-press to delete</Text>
          </View>
          <TouchableOpacity style={styles.reelsBtn} onPress={() => setShowReels(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="stats-chart" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadBtn} onPress={pickAndUpload} disabled={uploading}>
            {uploading
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Ionicons name="cloud-upload-outline" size={17} color="#fff" /><Text style={styles.uploadBtnText}>Upload</Text></>
            }
          </TouchableOpacity>
        </View>
      </View>

      <ReelsInsightsModal visible={showReels} onClose={() => setShowReels(false)} theme={theme} />

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={visibleMedia}
          keyExtractor={item => item._id || item.url}
          renderItem={renderItem}
          numColumns={NUM_COLS}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          columnWrapperStyle={{ gap: 4, marginBottom: 4 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <View style={[styles.emptyIcon, { backgroundColor: isDark ? 'rgba(99,102,241,0.1)' : '#eef2ff' }]}>
                <Ionicons name="images-outline" size={40} color="#6366f1" />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {activeTag ? `No ${activeTag} photos` : 'No media uploaded yet'}
              </Text>
              <Text style={[styles.emptySub, { color: theme.subText }]}>
                {activeTag ? 'Try a different tag filter' : 'Upload photos and videos to showcase your salon'}
              </Text>
              {!activeTag && (
                <TouchableOpacity style={styles.uploadBtnLarge} onPress={pickAndUpload}>
                  <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                  <Text style={styles.uploadBtnText}>Upload Media</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {lightbox !== null && (
        <Lightbox
          media={visibleMedia}
          initialIndex={lightbox.index}
          coverId={coverId}
          onClose={() => setLightbox(null)}
          onDeleted={handleLightboxDelete}
          onCoverSet={handleCoverSet}
        />
      )}
    </View>
  );
}

const lbStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.97)', justifyContent: 'center' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: StatusBar.currentHeight || 44, paddingBottom: 12, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)' },
  topBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  counter: { color: '#fff', fontSize: 14, fontWeight: '600' },
  videoTag: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  videoTagText: { color: '#a78bfa', fontSize: 10, fontWeight: '600' },
  mediaWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: { width: SCREEN_W, height: SCREEN_H * 0.65 },
  video: { width: SCREEN_W, height: SCREEN_H * 0.55 },
  navLeft: { position: 'absolute', left: 8, top: '50%', marginTop: -24, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 24 },
  navRight: { position: 'absolute', right: 8, top: '50%', marginTop: -24, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 24 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'rgba(0,0,0,0.6)', paddingBottom: 40 },
  tagPill: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  coverBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.1)' },
  coverBtnActive: { borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.15)' },
  coverBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

const styles = StyleSheet.create({
  header: { backgroundColor: '#6366f1', paddingHorizontal: 16, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: '#c7d2fe', marginTop: 1 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  uploadBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  statPillText: { fontSize: 12, fontWeight: '600' },
  featuredCard: { borderRadius: 14, padding: 12 },
  featuredHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  featuredTitle: { fontSize: 13, fontWeight: '700', flex: 1 },
  featuredCount: { fontSize: 11 },
  featuredTile: { width: 66, height: 66, borderRadius: 12, overflow: 'hidden' },
  featuredImage: { width: '100%', height: '100%' },
  tagFilterPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  tagFilterText: { fontSize: 12, fontWeight: '600' },
  tile: { width: TILE_SIZE, height: TILE_SIZE, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  tileImage: { width: '100%', height: '100%' },
  videoOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  playCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
  coverBadge: { position: 'absolute', top: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: 3 },
  tagBadge: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(99,102,241,0.85)', borderRadius: 8, padding: 3 },
  videoBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(139,92,246,0.85)', borderRadius: 8, padding: 3 },
  emptyIcon: { width: 80, height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptySub: { fontSize: 13, textAlign: 'center', maxWidth: 260, marginBottom: 20 },
  uploadBtnLarge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#6366f1', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  reelsBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  // Reels insights modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  reelsBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800' },
  statLbl: { fontSize: 10, color: '#6b7280', marginTop: 2 },
  reelCard: { borderRadius: 12, padding: 12, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 10 },
  saveBtn: { backgroundColor: '#6366f1', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
