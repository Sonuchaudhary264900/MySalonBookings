import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Image, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useOnboarding } from '../../../context/OnboardingContext';
import api from '../../../services/api';

const { width: W } = Dimensions.get('window');
const THUMB = (W - 48 - 24) / 3; // 3-column grid

async function uploadToCloudinary(uri, resourceType = 'image') {
  // Signature endpoint returns snake_case keys: cloud_name, api_key
  const sigRes = await api.get(`/owner/gallery/upload-signature?resource_type=${resourceType}`);
  const { signature, timestamp, api_key, cloud_name, folder } = sigRes.data.data;
  const formData = new FormData();
  const ext = uri.split('.').pop()?.split('?')[0] || (resourceType === 'video' ? 'mp4' : 'jpg');
  formData.append('file', { uri, type: resourceType === 'video' ? 'video/mp4' : 'image/jpeg', name: `upload.${ext}` });
  formData.append('signature', signature);
  formData.append('timestamp', String(timestamp));
  formData.append('api_key', api_key);
  formData.append('folder', folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/${resourceType}/upload`, {
    method: 'POST', body: formData,
  });
  const data = await res.json();
  if (!data.secure_url) throw new Error(data.error?.message || 'Upload failed');
  return data.secure_url;
}

export default function Step7_Media() {
  const {
    photos, setPhotos,
    videoUrl, setVideoUrl,
    businessLicenseUrl, setBusinessLicenseUrl,
    businessRegUrl, setBusinessRegUrl,
    nextStep,
  } = useOnboarding();

  const [photoUploading, setPhotoUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [docLoading, setDocLoading]         = useState({});
  const [coverIdx, setCoverIdx]             = useState(0);
  const [error, setError]                   = useState('');

  const pickPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (result.canceled) return;
    if (photos.length + result.assets.length > 10) {
      Alert.alert('Limit', 'Maximum 10 photos allowed'); return;
    }
    setPhotoUploading(true);
    setError('');
    try {
      const newPhotos = [];
      for (const asset of result.assets) {
        const compressed = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1080 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        const url = await uploadToCloudinary(compressed.uri, 'image');
        newPhotos.push({ uri: compressed.uri, url });
      }
      setPhotos(prev => [...prev, ...newPhotos]);
    } catch (e) {
      setError('Failed to upload photos. Try again.');
    } finally { setPhotoUploading(false); }
  };

  const removePhoto = (idx) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
    if (coverIdx >= idx && coverIdx > 0) setCoverIdx(c => c - 1);
  };

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow media library access'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      videoMaxDuration: 60,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const fileSizeMB = (asset.fileSize || 0) / (1024 * 1024);
    if (fileSizeMB > 100) { Alert.alert('Too large', 'Video must be under 100MB'); return; }
    setVideoUploading(true);
    setError('');
    try {
      const url = await uploadToCloudinary(asset.uri, 'video');
      setVideoUrl(url);
    } catch (e) {
      setError('Failed to upload video. Try again.');
    } finally { setVideoUploading(false); }
  };

  const uploadDoc = async (type) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (result.canceled) return;
    setDocLoading(p => ({ ...p, [type]: true }));
    try {
      const url = await uploadToCloudinary(result.assets[0].uri, 'image');
      if (type === 'license') setBusinessLicenseUrl(url);
      else setBusinessRegUrl(url);
    } catch (e) {
      setError('Document upload failed.');
    } finally { setDocLoading(p => ({ ...p, [type]: false })); }
  };

  const handleNext = () => {
    if (photos.length === 0) { setError('Please add at least 1 salon photo'); return; }
    setError('');
    nextStep();
  };

  return (
    <ScrollView contentContainerStyle={s.scroll}>
      <Text style={s.title}>Salon Media</Text>
      <Text style={s.sub}>Show customers what your salon looks like</Text>

      {/* Photos */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Ionicons name="images-outline" size={18} color="#818cf8" />
          <Text style={s.sectionTitle}>Salon Photos</Text>
          <Text style={s.sectionReq}>* at least 1</Text>
          <Text style={s.count}>{photos.length}/10</Text>
        </View>

        <View style={s.photoGrid}>
          {photos.map((p, idx) => (
            <View key={idx} style={s.photoItem}>
              <Image source={{ uri: p.uri || p.url }} style={s.photoThumb} />
              <TouchableOpacity style={s.removeBtn} onPress={() => removePhoto(idx)}>
                <Ionicons name="close" size={13} color="#fff" />
              </TouchableOpacity>
              {idx === coverIdx ? (
                <View style={s.coverBadge}><Text style={s.coverText}>Cover</Text></View>
              ) : (
                <TouchableOpacity style={s.setCoverBtn} onPress={() => setCoverIdx(idx)}>
                  <Ionicons name="star-outline" size={12} color="#f59e0b" />
                </TouchableOpacity>
              )}
            </View>
          ))}
          {photos.length < 10 && (
            <TouchableOpacity style={s.addPhotoBtn} onPress={pickPhotos} disabled={photoUploading}>
              {photoUploading
                ? <ActivityIndicator color="#818cf8" />
                : <>
                    <Ionicons name="add" size={28} color="#818cf8" />
                    <Text style={s.addPhotoText}>Add</Text>
                  </>
              }
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Video */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Ionicons name="videocam-outline" size={18} color="#818cf8" />
          <Text style={s.sectionTitle}>Salon Tour Video</Text>
          <Text style={s.sectionOpt}>(optional)</Text>
        </View>
        {videoUrl ? (
          <View style={s.uploadedRow}>
            <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
            <Text style={s.uploadedText}>Video uploaded</Text>
            <TouchableOpacity onPress={() => setVideoUrl('')} style={s.clearBtn}>
              <Ionicons name="trash-outline" size={16} color="#f87171" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={s.uploadBox} onPress={pickVideo} disabled={videoUploading} activeOpacity={0.8}>
            {videoUploading
              ? <ActivityIndicator color="#818cf8" size="large" />
              : <>
                  <Ionicons name="cloud-upload-outline" size={32} color="#818cf8" />
                  <Text style={s.uploadBoxTitle}>Upload Video</Text>
                  <Text style={s.uploadBoxSub}>MP4 / MOV · Max 100MB · 60s</Text>
                </>
            }
          </TouchableOpacity>
        )}
      </View>

      {/* Documents (optional) */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Ionicons name="document-text-outline" size={18} color="#818cf8" />
          <Text style={s.sectionTitle}>Business Documents</Text>
          <Text style={s.sectionOpt}>(optional)</Text>
        </View>
        <DocRow
          label="Business License"
          uploaded={!!businessLicenseUrl}
          loading={!!docLoading.license}
          onPress={() => uploadDoc('license')}
          onClear={() => setBusinessLicenseUrl('')}
        />
        <DocRow
          label="Registration Certificate"
          uploaded={!!businessRegUrl}
          loading={!!docLoading.reg}
          onPress={() => uploadDoc('reg')}
          onClear={() => setBusinessRegUrl('')}
        />
      </View>

      {!!error && <Text style={s.err}>{error}</Text>}

      <TouchableOpacity style={s.btn} onPress={handleNext} activeOpacity={0.88}>
        <Text style={s.btnText}>Continue</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </ScrollView>
  );
}

function DocRow({ label, uploaded, loading, onPress, onClear }) {
  return (
    <View style={s.docRow}>
      <Ionicons name={uploaded ? 'checkmark-circle' : 'document-outline'} size={18} color={uploaded ? '#22c55e' : '#818cf8'} />
      <Text style={s.docLabel}>{label}</Text>
      {uploaded
        ? <TouchableOpacity style={s.clearBtn} onPress={onClear}><Ionicons name="trash-outline" size={15} color="#f87171" /></TouchableOpacity>
        : <TouchableOpacity style={s.docBtn} onPress={onPress} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color="#818cf8" /> : <Text style={s.docBtnText}>Upload</Text>}
          </TouchableOpacity>
      }
    </View>
  );
}

const s = StyleSheet.create({
  scroll:        { flexGrow: 1, paddingHorizontal: 4, paddingTop: 16, paddingBottom: 32 },
  title:         { fontSize: 26, fontWeight: '800', color: '#f1f5f9', marginBottom: 6 },
  sub:           { fontSize: 14, color: '#94a3b8', marginBottom: 20 },
  section:       { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle:  { fontSize: 14, fontWeight: '700', color: '#e2e8f0', flex: 1 },
  sectionReq:    { fontSize: 11, color: '#f87171', fontWeight: '600' },
  sectionOpt:    { fontSize: 11, color: '#475569' },
  count:         { fontSize: 12, color: '#818cf8', fontWeight: '700' },
  photoGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoItem:     { width: THUMB, height: THUMB, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  photoThumb:    { width: '100%', height: '100%', resizeMode: 'cover' },
  removeBtn:     { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(239,68,68,0.85)', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  coverBadge:    { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(99,102,241,0.85)', alignItems: 'center', paddingVertical: 2 },
  coverText:     { fontSize: 10, color: '#fff', fontWeight: '700' },
  setCoverBtn:   { position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, padding: 3 },
  addPhotoBtn:   { width: THUMB, height: THUMB, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(99,102,241,0.4)', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addPhotoText:  { fontSize: 11, color: '#818cf8' },
  uploadBox:     { borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(99,102,241,0.4)', borderRadius: 14, height: 110, alignItems: 'center', justifyContent: 'center', gap: 6 },
  uploadBoxTitle:{ fontSize: 14, fontWeight: '700', color: '#e2e8f0' },
  uploadBoxSub:  { fontSize: 12, color: '#475569' },
  uploadedRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  uploadedText:  { flex: 1, fontSize: 14, color: '#86efac', fontWeight: '600' },
  clearBtn:      { padding: 4 },
  docRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  docLabel:      { flex: 1, fontSize: 13, color: '#cbd5e1' },
  docBtn:        { backgroundColor: 'rgba(99,102,241,0.2)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(99,102,241,0.4)' },
  docBtnText:    { fontSize: 12, color: '#818cf8', fontWeight: '700' },
  err:           { fontSize: 13, color: '#f87171', marginBottom: 12, textAlign: 'center' },
  btn:           { backgroundColor: '#6366f1', borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  btnText:       { color: '#fff', fontSize: 16, fontWeight: '800' },
});
