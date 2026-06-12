import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { Radius, AppColors } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStopWithPhotos } from '../../services/delivery-db';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Proof() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { Colors } = useTheme();
  const styles = makeStyles(Colors);
  const { ids } = useLocalSearchParams<{ ids: string }>();
  const parcelIds = ids ? JSON.parse(ids) as number[] : [];
  
  const DRAFT_KEY = `proof_draft_${parcelIds.sort().join('_')}`;

  const [photos, setPhotos] = useState<string[]>([]);
  const [location, setLocation] = useState<Location.LocationObject['coords'] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCamera, setShowCamera] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const takingPhotoRef = useRef(false);
  const savingRef = useRef(false);

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const draft = await AsyncStorage.getItem(DRAFT_KEY);
        if (draft) {
          const { photos: draftPhotos, location: draftLoc } = JSON.parse(draft);
          if (draftPhotos?.length) setPhotos([...new Set(draftPhotos as string[])]);
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

  useEffect(() => {
    if (showCamera) setCameraReady(false);
  }, [showCamera]);

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
    if (!cameraRef.current || takingPhotoRef.current || !cameraReady) return;
    takingPhotoRef.current = true;
    setIsTakingPhoto(true);
    try {
      const pic = await cameraRef.current.takePictureAsync({
        quality: 0.5,
      });
      if (pic?.uri) {
        setPhotos((prev) => (prev.includes(pic.uri) ? prev : [...prev, pic.uri]));
        setShowCamera(false);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.error('takePictureAsync failed:', e);
      alert('Error taking photo. Wait for the camera preview, then try again.');
    } finally {
      takingPhotoRef.current = false;
      setIsTakingPhoto(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) setShowCamera(true);
      return next;
    });
  };

  const handleSave = async () => {
    if (savingRef.current || photos.length === 0 || !location) {
      if (photos.length === 0 || !location) {
        alert('Please provide both photo(s) and location proof.');
      }
      return;
    }
    savingRef.current = true;
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
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.permWrap, { paddingTop: insets.top + 24 }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.permContent}>
          <Ionicons name="camera-outline" size={48} color="#fff" />
          <Text style={styles.permTitle}>Camera access required</Text>
          <Text style={styles.permSub}>Allow camera access to capture delivery proof photos.</Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Allow Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {showCamera ? (
        <View style={{ flex: 1 }}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            mode="picture"
            onCameraReady={() => setCameraReady(true)}
            onMountError={({ message }) => {
              console.error('Camera mount error:', message);
              alert(`Camera error: ${message}`);
            }}
          />

          <View style={styles.cameraOverlay} pointerEvents="none">
             <View style={styles.cameraFrame} />
             <Text style={styles.cameraHint}>Capture proof for {parcelIds.length} packages</Text>
          </View>

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

          <TouchableOpacity 
            style={[
              styles.shutterBtn,
              { bottom: insets.bottom + 40 },
              (!cameraReady || isTakingPhoto) && { opacity: 0.5 },
            ]} 
            onPress={handleTakePhoto}
            disabled={isTakingPhoto || !cameraReady}
          >
            {isTakingPhoto ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.shutterInner} />
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.previewContainer}>
          <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setShowCamera(true)}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={[styles.title, { color: Colors.textPrimary }]}>Review Stop Proof</Text>
            <TouchableOpacity style={styles.backBtn} onPress={() => handleGetLocation(false)} disabled={isLocating}>
              {isLocating ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="locate" size={24} color={location ? Colors.green : '#fff'} />
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.previewScroll, { paddingTop: insets.top + 70, paddingBottom: insets.bottom + 220 }]}
          >
            <View style={styles.photoGrid}>
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

            <View style={styles.mapSection}>
              <View style={styles.mapHeaderRow}>
                <Ionicons name="location" size={18} color={Colors.primary} />
                <Text style={[styles.mapTitle, { color: Colors.textPrimary }]}>Delivery Location</Text>
              </View>
              {location ? (
                <>
                  <View style={styles.mapContainer}>
                    <WebView
                      originWhitelist={['*']}
                      scrollEnabled={false}
                      style={styles.mapWebView}
                      source={{ html: buildMapHtml(location.latitude, location.longitude, Colors.primary) }}
                    />
                  </View>
                  <Text style={[styles.mapCoords, { color: Colors.textSecondary }]}>
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    {location.accuracy != null ? ` · ±${Math.round(location.accuracy)}m` : ''}
                  </Text>
                </>
              ) : (
                <View style={[styles.mapPlaceholder, { borderColor: Colors.cardBorder, backgroundColor: Colors.elevated }]}>
                  <Ionicons name="locate-outline" size={28} color={Colors.textMuted} />
                  <Text style={[styles.mapPlaceholderText, { color: Colors.textSecondary }]}>
                    {isLocating ? 'Detecting location...' : 'Tap the locate button to capture GPS'}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          <BlurView intensity={80} tint="light" style={[styles.bottomPanel, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.infoRow}>
               <Ionicons name="cube" size={20} color={Colors.textPrimary} />
               <Text style={[styles.infoText, { color: Colors.textPrimary }]}>{parcelIds.length} Packages in this stop</Text>
            </View>
            
            <View style={styles.infoRow}>
               <Ionicons name="location" size={20} color={location ? Colors.green : Colors.textMuted} />
               <Text style={[styles.infoText, { color: Colors.textPrimary }]}>
                 {location ? 'Location captured' : isLocating ? 'Detecting location...' : 'Location required'}
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

function makeStyles(Colors: AppColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permWrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  permContent: { alignItems: 'center', gap: 12 },
  permTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 8 },
  permSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  permBtn: { marginTop: 12, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 999 },
  permBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  camera: { flex: 1 },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  cameraFrame: { width: '80%', aspectRatio: 3/4, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 20, borderStyle: 'dashed' },
  cameraHint: { color: '#fff', marginTop: 20, fontSize: 14, fontWeight: '600', textAlign: 'center', paddingHorizontal: 40 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, zIndex: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  counter: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  counterText: { color: '#000', fontSize: 14, fontWeight: '700' },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  shutterBtn: { position: 'absolute', alignSelf: 'center', width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff' },
  previewContainer: { flex: 1, backgroundColor: Colors.bg },
  previewScroll: { paddingHorizontal: 20 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  gridThumbWrap: { width: '31%', aspectRatio: 1, borderRadius: Radius.md, overflow: 'hidden' },
  gridThumb: { width: '100%', height: '100%' },
  removePhotoBtn: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.8)', alignItems: 'center', justifyContent: 'center' },
  addMoreBtn: { width: '31%', aspectRatio: 1, borderRadius: Radius.md, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addMoreText: { fontSize: 10, fontWeight: '700' },
  mapSection: { marginBottom: 12 },
  mapHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  mapTitle: { fontSize: 15, fontWeight: '800' },
  mapContainer: { height: 180, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: '#000' },
  mapWebView: { flex: 1, backgroundColor: '#000' },
  mapCoords: { fontSize: 12, fontWeight: '600', marginTop: 8 },
  mapPlaceholder: {
    height: 180,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  mapPlaceholderText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  bottomPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  infoText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  saveBtn: { borderRadius: 999, overflow: 'hidden', marginTop: 10 },
  saveInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 999 },
  saveText: { fontSize: 16, fontWeight: '700' },
});
}

function buildMapHtml(latitude: number, longitude: number, markerColor: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
  <script src="https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.js"></script>
  <link href="https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.css" rel="stylesheet" />
  <style>
    body { margin: 0; padding: 0; background: #000; }
    #map { position: absolute; top: 0; bottom: 0; width: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = new maplibregl.Map({
      container: 'map',
      style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
      center: [${longitude}, ${latitude}],
      zoom: 15,
      interactive: false,
      attributionControl: false
    });
    map.on('load', () => {
      map.resize();
      new maplibregl.Marker({ color: '${markerColor}' })
        .setLngLat([${longitude}, ${latitude}])
        .addTo(map);
    });
  </script>
</body>
</html>`;
}
