import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Image, Dimensions,
  Modal, ScrollView, StatusBar, TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { showSuccess, showError } from '../../utils/toast';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const NUM_COLS = 3;
const TILE_SIZE = (SCREEN_W - 32 - (NUM_COLS - 1) * 4) / NUM_COLS;
const ALL_TAGS = ['Haircut', 'Beard', 'Facial', 'Spa', 'Nails', 'Makeup'];

function Lightbox({ photos, initialIndex, coverId, onClose, onDeleted, onCoverSet }) {
  const [idx, setIdx] = useState(initialIndex);
  const [deleting, setDeleting] = useState(false);
  const [settingCover, setSettingCover] = useState(false);
  const photo = photos[idx];
  if (!photo) return null;

  const photoUrl = photo.url || photo.imageUrl || photo.image;
  const isCover = photo._id === coverId;

  const handleDelete = () => {
    Alert.alert('Delete Photo', 'Remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setDeleting(true);
          try {
            await api.delete(`/owner/gallery/${photo._id}`);
            onDeleted(photo._id);
            if (photos.length <= 1) { onClose(); return; }
            setIdx(prev => Math.max(0, prev - 1));
          } catch { showError('Error', 'Failed to delete photo'); }
          finally { setDeleting(false); }
        }
      },
    ]);
  };

  const handleSetCover = async () => {
    if (isCover) return;
    setSettingCover(true);
    try {
      await api.put('/owner/salon', { coverPhoto: photoUrl });
      onCoverSet(photo._id);
      showSuccess('Cover Updated', 'Cover photo updated!');
    } catch { showError('Error', 'Failed to set cover photo'); }
    finally { setSettingCover(false); }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={lbStyles.overlay}>
        <View style={lbStyles.topBar}>
          <TouchableOpacity style={lbStyles.topBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={lbStyles.counter}>{idx + 1} / {photos.length}</Text>
          <TouchableOpacity style={lbStyles.topBtn} onPress={handleDelete} disabled={deleting}>
            {deleting ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="trash-outline" size={22} color="#fff" />}
          </TouchableOpacity>
        </View>

        <TouchableWithoutFeedback onPress={onClose}>
          <View style={lbStyles.imageWrap}>
            <Image source={{ uri: photoUrl }} style={lbStyles.image} resizeMode="contain" />
          </View>
        </TouchableWithoutFeedback>

        {idx > 0 && (
          <TouchableOpacity style={lbStyles.navLeft} onPress={() => setIdx(idx - 1)}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
        )}
        {idx < photos.length - 1 && (
          <TouchableOpacity style={lbStyles.navRight} onPress={() => setIdx(idx + 1)}>
            <Ionicons name="chevron-forward" size={28} color="#fff" />
          </TouchableOpacity>
        )}

        <View style={lbStyles.bottomBar}>
          {photo.tags?.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {photo.tags.map(t => (
                  <View key={t} style={lbStyles.tagPill}>
                    <Text style={lbStyles.tagText}>{t}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
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
        </View>
      </View>
    </Modal>
  );
}

export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [coverId, setCoverId] = useState(null);
  const [activeTag, setActiveTag] = useState(null);
  const [lightbox, setLightbox] = useState(null);

  const fetchPhotos = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [galRes, salonRes] = await Promise.all([
        api.get('/owner/gallery'),
        api.get('/owner/salon'),
      ]);
      const d = galRes.data?.data;
      const arr = Array.isArray(d) ? d : (d?.photos || d?.images || []);
      setPhotos(arr);
      const coverUrl = salonRes.data?.data?.coverPhoto;
      if (coverUrl) {
        const cover = arr.find(p => (p.url || p.imageUrl || p.image) === coverUrl);
        if (cover) setCoverId(cover._id);
      }
    } catch { setPhotos([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);
  const onRefresh = async () => { setRefreshing(true); await fetchPhotos(true); setRefreshing(false); };

  const pickAndUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { showError('Permission Denied', 'Please allow photo library access'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      for (const asset of result.assets) {
        const fd = new FormData();
        fd.append('image', { uri: asset.uri, type: asset.mimeType || 'image/jpeg', name: asset.fileName || `photo_${Date.now()}.jpg` });
        await api.post('/owner/gallery', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      showSuccess('Uploaded', `${result.assets.length} photo${result.assets.length > 1 ? 's' : ''} uploaded`);
      fetchPhotos(true);
    } catch (err) {
      showError('Error', err.response?.data?.message || 'Failed to upload');
    } finally { setUploading(false); }
  };

  const handleDeleteFromGrid = (photo) => {
    Alert.alert('Delete Photo', 'Remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/owner/gallery/${photo._id}`);
            setPhotos(prev => prev.filter(p => p._id !== photo._id));
            if (photo._id === coverId) setCoverId(null);
            showSuccess('Deleted', 'Photo removed');
          } catch { showError('Error', 'Failed to delete photo'); }
        }
      },
    ]);
  };

  const handleLightboxDelete = (id) => {
    setPhotos(prev => prev.filter(p => p._id !== id));
    if (id === coverId) setCoverId(null);
  };

  const handleCoverSet = (id) => {
    setCoverId(id);
    setPhotos(prev => prev.map(p => ({ ...p, isCover: p._id === id })));
  };

  const visiblePhotos = useMemo(() =>
    activeTag ? photos.filter(p => p.tags?.includes(activeTag)) : photos
  , [photos, activeTag]);

  const tagCount = (tag) => photos.filter(p => p.tags?.includes(tag)).length;
  const availableTags = ALL_TAGS.filter(t => tagCount(t) > 0);
  const featuredPhotos = useMemo(() =>
    photos.filter(p => p.tags?.length > 0 || p._id === coverId).slice(0, 6)
  , [photos, coverId]);

  const openLightbox = (photo) => {
    const idx = visiblePhotos.findIndex(p => p._id === photo._id);
    setLightbox({ index: idx >= 0 ? idx : 0 });
  };

  const renderItem = ({ item }) => {
    const isCover = item._id === coverId;
    return (
      <TouchableOpacity style={styles.tile} onPress={() => openLightbox(item)} onLongPress={() => handleDeleteFromGrid(item)} activeOpacity={0.85}>
        <Image source={{ uri: item.url || item.imageUrl || item.image }} style={styles.tileImage} resizeMode="cover" />
        {isCover && (
          <View style={styles.coverBadge}>
            <Ionicons name="star" size={10} color="#f59e0b" />
          </View>
        )}
        {item.tags?.length > 0 && (
          <View style={styles.tagBadge}>
            <Ionicons name="pricetag" size={9} color="#6366f1" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View style={{ gap: 12, marginBottom: 12 }}>
      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8, paddingRight: 12 }}>
            <View style={[styles.statPill, { borderColor: '#818cf8', backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : '#eef2ff' }]}>
              <Ionicons name="images-outline" size={13} color="#6366f1" />
              <Text style={[styles.statPillText, { color: '#6366f1' }]}>{photos.length} photos</Text>
            </View>
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

      {photos.length > 0 && (
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
            <Text style={styles.headerSub}>Showcase your salon's best work</Text>
          </View>
          <TouchableOpacity style={styles.uploadBtn} onPress={pickAndUpload} disabled={uploading}>
            {uploading
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Ionicons name="cloud-upload-outline" size={17} color="#fff" /><Text style={styles.uploadBtnText}>Upload</Text></>
            }
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={visiblePhotos}
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
                {activeTag ? `No ${activeTag} photos` : 'No photos uploaded yet'}
              </Text>
              <Text style={[styles.emptySub, { color: theme.subText }]}>
                {activeTag ? 'Try a different tag filter' : 'Upload photos to attract more customers and showcase your salon'}
              </Text>
              {!activeTag && (
                <TouchableOpacity style={styles.uploadBtnLarge} onPress={pickAndUpload}>
                  <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                  <Text style={styles.uploadBtnText}>Upload Your First Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {lightbox !== null && (
        <Lightbox
          photos={visiblePhotos}
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.96)', justifyContent: 'center' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: StatusBar.currentHeight || 44, paddingBottom: 12, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)' },
  topBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  counter: { color: '#fff', fontSize: 14, fontWeight: '600' },
  imageWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: { width: SCREEN_W, height: SCREEN_H * 0.65 },
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
  coverBadge: { position: 'absolute', top: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: 3 },
  tagBadge: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(99,102,241,0.85)', borderRadius: 8, padding: 3 },
  emptyIcon: { width: 80, height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptySub: { fontSize: 13, textAlign: 'center', maxWidth: 260, marginBottom: 20 },
  uploadBtnLarge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#6366f1', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
});
