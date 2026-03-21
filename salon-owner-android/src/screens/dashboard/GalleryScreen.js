import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Image, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { showSuccess, showError } from '../../utils/toast';

const NUM_COLS = 3;
const TILE_SIZE = (Dimensions.get('window').width - 32 - (NUM_COLS - 1) * 4) / NUM_COLS;

export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await api.get('/owner/gallery');
      const d = res.data.data;
      setPhotos(Array.isArray(d) ? d : (d?.photos || d?.images || []));
    } catch {
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);
  const onRefresh = async () => { setRefreshing(true); await fetchPhotos(); setRefreshing(false); };

  const pickAndUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showError('Permission Denied', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (result.canceled) return;

    setUploading(true);
    try {
      for (const asset of result.assets) {
        const formData = new FormData();
        formData.append('image', {
          uri: asset.uri,
          type: asset.mimeType || 'image/jpeg',
          name: asset.fileName || `photo_${Date.now()}.jpg`,
        });
        await api.post('/owner/gallery', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      showSuccess('Uploaded', `${result.assets.length} photo${result.assets.length > 1 ? 's' : ''} uploaded`);
      fetchPhotos();
    } catch (err) {
      showError('Error', err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = (photo) => {
    Alert.alert('Delete Photo', 'Remove this photo from your gallery?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/owner/gallery/${photo._id}`);
            showSuccess('Deleted', 'Photo removed');
            fetchPhotos();
          } catch {
            showError('Error', 'Failed to delete photo');
          }
        }
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.tile}>
      <Image
        source={{ uri: item.url || item.imageUrl || item.image }}
        style={styles.tileImage}
        resizeMode="cover"
      />
      <TouchableOpacity style={styles.deleteOverlay} onPress={() => deletePhoto(item)}>
        <Ionicons name="trash" size={14} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ padding: 4, marginTop: 4 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gallery</Text>
        </View>
        <Text style={styles.headerSub}>Showcase your salon's best work</Text>
      </View>

      {/* Upload bar */}
      <View style={[styles.uploadBar, { backgroundColor: theme.card, borderBottomColor: theme.border || '#e5e7eb' }]}>
        <TouchableOpacity style={styles.uploadBtn} onPress={pickAndUpload} disabled={uploading}>
          {uploading
            ? <ActivityIndicator color="#fff" size="small" />
            : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                <Text style={styles.uploadBtnText}>Upload Photos</Text>
              </>
            )}
        </TouchableOpacity>
        <Text style={[styles.photoCount, { color: theme.subText }]}>{photos.length} photo{photos.length !== 1 ? 's' : ''}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={photos}
          keyExtractor={item => item._id || item.url}
          renderItem={renderItem}
          numColumns={NUM_COLS}
          contentContainerStyle={{ padding: 12, paddingBottom: 40, gap: 4 }}
          columnWrapperStyle={{ gap: 4 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons name="images-outline" size={56} color="#d1d5db" />
              <Text style={{ color: theme.subText, marginTop: 12, fontSize: 15, fontWeight: '600' }}>No photos yet</Text>
              <Text style={{ color: theme.subText, marginTop: 4, fontSize: 13 }}>Upload photos to showcase your salon</Text>
              <TouchableOpacity style={[styles.uploadBtn, { marginTop: 20 }]} onPress={pickAndUpload}>
                <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                <Text style={styles.uploadBtnText}>Upload Photos</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: '#bfdbfe', marginTop: 2 },
  uploadBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#2563eb', paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10 },
  uploadBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  photoCount: { fontSize: 13 },
  tile: { width: TILE_SIZE, height: TILE_SIZE, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  tileImage: { width: '100%', height: '100%' },
  deleteOverlay: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 14, padding: 4 },
});
