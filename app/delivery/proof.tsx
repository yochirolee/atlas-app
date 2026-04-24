import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Image,
} from 'react-native';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Spacing, Radius, Shadows } from '../../constants/theme';
import { Colors } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStopWithPhotos } from '../../services/delivery-db';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Proof() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { ids } = useLocalSearchParams<{ ids: string }>();
  const parcelIds = ids ? JSON.parse(ids) as number[] : [];
  
  const DRAFT_KEY = `proof_draft_${parcelIds.sort().join('_')}`;

  const [photos, setPhotos] = useState<string[]>([]);
  const [location, setLocation] = useState<Location.LocationObject['coords'] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCamera, setShowCamera] = useState(true);
  const cameraRef = useRef<CameraView>(null);

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const draft = await AsyncStorage.getItem(DRAFT_KEY);
        if (draft) {
          const { photos: draftPhotos, location: draftLoc } = JSON.parse(draft);
          if (draftPhotos) setPhotos(draftPhotos);
          if (draftLoc) setLocation(draftLoc);
          if (draftPhotos?.length > 0) setShowCamera(false);
        }
      } catch (e) {
        console.error('Error loading draft:', e);
      }
    };
    loadDraft();
  }, [DRAFT_KEY]);

  // Save draft when data changes
  useEffect(() => {
    const saveDraft = async () => {
      if (photos.length > 0 || location) {
        try {
          await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ photos, location }));
        } catch (e) {
          console.error('Error saving draft:', e);
        }
      }
    };
    saveDraft();
  }, [photos, location, DRAFT_KEY]);

  useEffect(() => {
    // Only get location automatically if we don't have a draft one
    if (!location) {
      handleGetLocation(true);
    }
  }, []);

  const handleGetLocation = async (silent = false) => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!silent) alert('Location permission is required');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation(loc.coords);
      if (!silent) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      if (!silent) alert('Error getting location');
    } finally {
      setIsLocating(false);
    }
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;
    setIsTakingPhoto(true);
    try {
      const pic = await cameraRef.current.takePictureAsync({
        quality: 0.5,
      });
      if (pic) {
        setPhotos(prev => [...prev, pic.uri]);
        setShowCamera(false);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      alert('Error taking photo');
    } finally {
      setIsTakingPhoto(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    if (photos.length === 1) setShowCamera(true);
  };

  const handleSave = async () => {
    if (photos.length === 0 || !location) {
      alert('Please provide both photo(s) and location proof.');
      return;
    }
    setIsSaving(true);
    try {
      await createStopWithPhotos(parcelIds, {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy || 0,
      }, photos);
      
      // Clear draft on success
      await AsyncStorage.removeItem(DRAFT_KEY);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.dismissAll();
      router.replace('/delivery');
    } catch (e) {
      alert('Error saving proof');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {showCamera ? (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
        >
          <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity 
              style={styles.backBtn} 
              onPress={() => {
                if (photos.length > 0) setShowCamera(false);
                else if (router.canGoBack()) router.back();
                else router.replace('/delivery');
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>Take Photo {photos.length + 1}</Text>
            <View style={{ width: 44 }}>
               {photos.length > 0 && (
                 <TouchableOpacity style={styles.counter} onPress={() => setShowCamera(false)}>
                   <Text style={styles.counterText}>{photos.length}</Text>
                 </TouchableOpacity>
               )}
            </View>
          </View>

          <View style={styles.cameraOverlay}>
             <View style={styles.cameraFrame} />
             <Text style={styles.cameraHint}>Capture proof for {parcelIds.length} packages</Text>
          </View>

          <TouchableOpacity 
            style={[styles.shutterBtn, { bottom: insets.bottom + 40 }]} 
            onPress={handleTakePhoto}
            disabled={isTakingPhoto}
          >
            <View style={styles.shutterInner} />
          </TouchableOpacity>
        </CameraView>
      ) : (
        <View style={styles.previewContainer}>
          <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setShowCamera(true)}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={[styles.title, { color: Colors.textPrimary }]}>Review Stop Proof</Text>
            <TouchableOpacity style={styles.backBtn} onPress={() => handleGetLocation(false)}>
              <Ionicons name="locate" size={24} color={location ? Colors.green : "#fff"} />
            </TouchableOpacity>
          </View>

          <View style={[styles.photoGrid, { paddingTop: insets.top + 70 }]}>
            {photos.map((p, i) => (
              <View key={i} style={styles.gridThumbWrap}>
                <Image source={{ uri: p }} style={styles.gridThumb} />
                <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removePhoto(i)}>
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 5 && (
              <TouchableOpacity style={[styles.addMoreBtn, { borderColor: Colors.cardBorder }]} onPress={() => setShowCamera(true)}>
                <Ionicons name="camera" size={30} color={Colors.textMuted} />
                <Text style={[styles.addMoreText, { color: Colors.textMuted }]}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          <BlurView intensity={80} tint="light" style={[styles.bottomPanel, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.infoRow}>
               <Ionicons name="cube" size={20} color={Colors.textPrimary} />
               <Text style={[styles.infoText, { color: Colors.textPrimary }]}>{parcelIds.length} Packages in this stop</Text>
            </View>
            
            <View style={styles.infoRow}>
               <Ionicons name="location" size={20} color={location ? Colors.green : Colors.textMuted} />
               <Text style={[styles.infoText, { color: Colors.textPrimary }]}>
                 {location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : 'Detecting location...'}
               </Text>
            </View>

            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: Colors.primary }, (photos.length === 0 || !location) && { opacity: 0.5 }]} 
              onPress={handleSave}
              disabled={isSaving || photos.length === 0 || !location}
            >
              <View style={[styles.saveInner, { backgroundColor: 'transparent' }]}>
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={[styles.saveText, { color: '#FFFFFF' }]}>Complete Delivery Stop</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </BlurView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  cameraFrame: { width: '80%', aspectRatio: 3/4, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 20, borderStyle: 'dashed' },
  cameraHint: { color: '#fff', marginTop: 20, fontSize: 14, fontWeight: '600', textAlign: 'center', paddingHorizontal: 40 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, zIndex: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  counter: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  counterText: { color: '#000', fontSize: 14, fontWeight: '700' },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  shutterBtn: { position: 'absolute', alignSelf: 'center', width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff' },
  previewContainer: { flex: 1 },
  preview: { ...StyleSheet.absoluteFillObject },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20 },
  gridThumbWrap: { width: '31%', aspectRatio: 1, borderRadius: Radius.md, overflow: 'hidden' },
  gridThumb: { width: '100%', height: '100%' },
  removePhotoBtn: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.8)', alignItems: 'center', justifyContent: 'center' },
  addMoreBtn: { width: '31%', aspectRatio: 1, borderRadius: Radius.md, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addMoreText: { fontSize: 10, fontWeight: '700' },
  bottomPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  infoText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  saveBtn: { borderRadius: 999, overflow: 'hidden', marginTop: 10 },
  saveInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 999 },
  saveText: { fontSize: 16, fontWeight: '700' },
});
