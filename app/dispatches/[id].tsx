import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
  Easing,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Colors, Spacing, Radius, Shadows } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import api from '../../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const { width } = Dimensions.get('window');
const SCAN_SIZE = width * 0.7;

export default function DispatchScanner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatchId = parseInt(id);
  
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [showList, setShowList] = useState(false);

  // Status Banner State
  const [status, setStatus] = useState<{ msg: string; type: 'success' | 'error' | null }>({ msg: '', type: null });
  const statusAnim = useRef(new Animated.Value(-100)).current;
  const statusTimer = useRef<any>(null);

  const showStatus = useCallback((msg: string, type: 'success' | 'error') => {
    if (statusTimer.current) clearTimeout(statusTimer.current);
    setStatus({ msg, type });
    Animated.spring(statusAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 7 }).start();
    statusTimer.current = setTimeout(() => {
        Animated.timing(statusAnim, { toValue: -100, duration: 300, useNativeDriver: true }).start(() => {
            setStatus({ msg: '', type: null });
        });
    }, 2500);
  }, []);

  // Queries
  const { data: dispatchParcels, isLoading: loadingParcels } = useQuery({
    queryKey: ['dispatch-parcels', dispatchId],
    queryFn: () => api.dispatch.getParcelsByDispatchId(dispatchId, 0, 100),
  });

  const scanMutation = useMutation({
    mutationFn: (scannedValue: string) => api.dispatch.addParcelByScan(dispatchId, scannedValue),
    onSuccess: (data: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(console.error);
        queryClient.invalidateQueries({ queryKey: ['dispatch-parcels', dispatchId] });
        showStatus(`Added: ${data?.hbl || 'Parcel'}`, 'success');
        
        // Trigger flash
        Animated.sequence([
            Animated.timing(flashAnim, { toValue: 0.8, duration: 100, useNativeDriver: true }),
            Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();
    },
    onError: (err: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(console.error);
        const errMsg = err?.response?.data?.message || 'Error adding parcel';
        showStatus(errMsg, 'error');
    },
    onSettled: () => {
        setTimeout(() => {
            scannedDebounce.current = false;
        }, 1200);
    }
  });

  const removeMutation = useMutation({
    mutationFn: (trackingNumber: string) => api.dispatch.removeParcel(dispatchId, trackingNumber),
    onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(console.error);
        queryClient.invalidateQueries({ queryKey: ['dispatch-parcels', dispatchId] });
        showStatus('Parcel removed', 'success');
    },
    onError: (err: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(console.error);
        const errMsg = err?.response?.data?.message || 'Failed to remove parcel';
        showStatus(errMsg, 'error');
    }
  });

  const parcelsList = dispatchParcels?.rows || [];

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanY = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const listHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Looping animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, { toValue: SCAN_SIZE - 4, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scanY, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();

    return () => {
        if (statusTimer.current) clearTimeout(statusTimer.current);
    };
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scannedDebounce.current || scanMutation.isPending) return;
    scannedDebounce.current = true;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(console.error);
    scanMutation.mutate(data);
  };

  const scannedDebounce = useRef(false);

  const toggleList = () => {
    const toValue = showList ? 0 : 1;
    setShowList(!showList);
    Animated.spring(listHeight, {
      toValue,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
  };

  if (!permission) return <View style={styles.container} />;
  if (!permission.granted) {
      return (
        <View style={styles.permWrap}>
            <Text style={{color: Colors.textPrimary, fontSize: 18, fontWeight: '700'}}>Camera Access Required</Text>
            <TouchableOpacity onPress={requestPermission} style={styles.permBtn}>
                <Text style={{color: '#FFFFFF', fontWeight: '800'}}>Allow Camera</Text>
            </TouchableOpacity>
        </View>
      );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent />

      {/* Flash overlay */}
      <Animated.View pointerEvents="none" style={[styles.flashOverlay, { opacity: flashAnim }]} />

      {/* Status Banner */}
      <Animated.View style={[styles.statusBanner, { 
        transform: [{ translateY: statusAnim }],
        backgroundColor: status.type === 'error' ? Colors.red : Colors.green,
        paddingTop: insets.top + 8
      }]}>
          <Ionicons name={status.type === 'error' ? 'alert-circle' : 'checkmark-circle'} size={20} color="#fff" />
          <Text style={styles.statusText}>{status.msg}</Text>
      </Animated.View>

      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={torch}
        onBarcodeScanned={showList ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'pdf417'] }}
      />

      {/* Overlay Mask */}
      <View style={styles.overlay}>
        <View style={styles.overlayTop}>
           <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        </View>
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <Animated.View style={[styles.scanWindow, { transform: [{ scale: pulseAnim }] }]}>
            {[
              { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
              { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
              { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
              { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 },
            ].map((c, i) => (
              <View key={i} style={[styles.corner, c as any, { borderColor: '#FFFFFF' }]} />
            ))}
            <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanY }] }]}>
              <LinearGradient
                colors={['transparent', Colors.green + 'CC', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.scanLineInner}
              />
            </Animated.View>

            {scanMutation.isPending && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }]}>
                    <ActivityIndicator color={Colors.green} size="large" />
                </View>
            )}
          </Animated.View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom}>
             <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        </View>
      </View>

      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <BlurView intensity={60} tint="dark" style={styles.topBarBlur}>
           <View style={styles.topBarRow}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
                    <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.topBarCenter}>
                    <Text style={styles.topBarTitle}>Dispatch #{dispatchId}</Text>
                    <View style={[styles.onlineBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                        <Ionicons name="cloud-download" size={12} color="#fff" />
                        <Text style={styles.onlineText}>Receive Mode</Text>
                    </View>
                </View>
                <TouchableOpacity style={[styles.iconBtn, torch && styles.iconBtnActive]} onPress={() => setTorch(!torch)}>
                    <Ionicons name={torch ? "flash" : "flash-outline"} size={20} color={torch ? Colors.bg : "#fff"} />
                </TouchableOpacity>
           </View>
        </BlurView>
      </View>

      {/* Bottom Panel */}
      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.statsCard} activeOpacity={0.9} onPress={toggleList}>
          <BlurView intensity={80} tint="dark" style={styles.statsBlur}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statVal}>{parcelsList.length}</Text>
                <Text style={styles.statLab}>Parcel Count</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <ActivityIndicator animating={loadingParcels} color="#fff" size="small" />
                <Text style={styles.statLab}>{loadingParcels ? 'Updating…' : 'Synced'}</Text>
              </View>
            </View>
            <View style={styles.listToggleIndicator}>
                <Text style={styles.listToggleLabel}>Tap to view list</Text>
                <Ionicons name={showList ? "chevron-down" : "chevron-up"} size={16} color="rgba(255,255,255,0.4)" />
            </View>
          </BlurView>
        </TouchableOpacity>

        <View style={styles.hintBox}>
            <Ionicons name="information-circle-outline" size={16} color="rgba(255,255,255,0.5)" />
            <Text style={styles.hintText}>Parcels are received instantly on the server.</Text>
        </View>
      </View>

      {/* Scanned List Modal (Animated) */}
      {showList && (
        <Animated.View 
            style={[
                styles.scannedListContainer, 
                { 
                    height: listHeight.interpolate({ inputRange: [0, 1], outputRange: [0, 500] }),
                    opacity: listHeight 
                }
            ]}
        >
            <BlurView intensity={95} tint="light" style={styles.listBlur}>
                <View style={styles.listHeader}>
                    <Text style={styles.listTitle}>Received Parcels</Text>
                    <TouchableOpacity onPress={toggleList} style={styles.listClose}>
                        <Ionicons name="close" size={24} color={Colors.textPrimary} />
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={parcelsList}
                    keyExtractor={(item, index) => item.id?.toString() || `${item.hbl}-${index}`}
                    renderItem={({ item }) => (
                        <View style={[styles.scanItem, { backgroundColor: Colors.elevated }]}>
                            <View style={[styles.statusLine, { backgroundColor: Colors.primary }]} />
                            <View style={styles.scanItemContent}>
                                <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                                    <Text style={styles.scanHbl}>{item.hbl}</Text>
                                    {item.tracking_number && (
                                        <Text style={styles.scanTracking}>({item.tracking_number})</Text>
                                    )}
                                </View>
                                <Text style={styles.scanDetails} numberOfLines={1}>
                                    {item.description || 'No description'} • {item.weight ? `${item.weight} lbs` : '--'}
                                </Text>
                            </View>
                            <TouchableOpacity 
                                onPress={() => {
                                    Alert.alert(
                                        'Remove Parcel',
                                        `Are you sure you want to remove ${item.hbl} from this dispatch?`,
                                        [
                                            { text: 'Cancel', style: 'cancel' },
                                            { text: 'Remove', style: 'destructive', onPress: () => removeMutation.mutate(item.tracking_number || item.hbl) }
                                        ]
                                    );
                                }}
                                disabled={removeMutation.isPending}
                            >
                                <Ionicons name="trash-outline" size={20} color={Colors.red} />
                            </TouchableOpacity>
                        </View>
                    )}
                    contentContainerStyle={{ padding: 16 }}
                />
            </BlurView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  flashOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff', zIndex: 30 },
  permWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg, gap: 16 },
  permBtn: { backgroundColor: Colors.primary, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 999 },

  statusBanner: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    zIndex: 100, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  statusText: { color: '#fff', fontWeight: '800', fontSize: 14, textAlign: 'center' },

  overlay: { ...StyleSheet.absoluteFillObject },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  overlayMiddle: { flexDirection: 'row', height: SCAN_SIZE },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  overlayBottom: { flex: 1.5, backgroundColor: 'rgba(0,0,0,0.5)' },
  scanWindow: { width: SCAN_SIZE, height: SCAN_SIZE, position: 'relative', overflow: 'hidden' },
  corner: { position: 'absolute', width: 32, height: 32, zIndex: 2 },
  scanLine: { position: 'absolute', left: 8, right: 8, height: 3, zIndex: 1 },
  scanLineInner: { flex: 1, height: 3, borderRadius: 2 },

  topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  topBarBlur: { overflow: 'hidden' },
  topBarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  topBarCenter: { alignItems: 'center' },
  topBarTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 4, gap: 4 },
  onlineText: { color: '#fff', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  iconBtn: { width: 44, height: 44, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  iconBtnActive: { backgroundColor: '#FFFFFF' },

  bottomArea: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, zIndex: 20 },
  statsCard: { borderRadius: 24, overflow: 'hidden', marginBottom: 16 },
  statsBlur: { padding: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 24, fontWeight: '900', color: '#fff' },
  statLab: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '700', textTransform: 'uppercase', marginTop: 4 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },
  listToggleIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, gap: 6 },
  listToggleLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' },

  hintBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  hintText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500' },

  scannedListContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
  listBlur: { flex: 1 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  listTitle: { fontSize: 18, fontWeight: '800' },
  listClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scanItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, marginBottom: 8, gap: 12 },
  statusLine: { width: 4, height: '70%', borderRadius: 2 },
  scanItemContent: { flex: 1 },
  scanHbl: { fontSize: 15, fontWeight: '700' },
  scanTracking: { fontSize: 12, fontWeight: '500' },
  scanDetails: { fontSize: 12, marginTop: 2 },
});
