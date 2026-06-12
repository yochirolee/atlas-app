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
  Modal,
  Pressable,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Spacing, Radius, AppColors } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const { width } = Dimensions.get('window');
const SCAN_SIZE = width * 0.7;

interface ScannedParcel {
  tracking_number: string;
  scanned_at: number;
  expected: boolean | null; // null = free receive mode (no dispatch loaded)
  description?: string;
  weight?: string;
  agency_name?: string;
}

export default function ReceiveScanner() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const dispatchId = id ? parseInt(id) : null;

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { Colors } = useTheme();
  const styles = makeStyles(Colors);
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [showList, setShowList] = useState(false);
  const [listTab, setListTab] = useState<'scanned' | 'pending'>('scanned');
  const [scans, setScans] = useState<ScannedParcel[]>([]);

  // Status banner
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
    }, 2200);
  }, []);

  // Expected parcels when receiving a specific dispatch
  const { data: dispatchParcels, isLoading: loadingExpected } = useQuery({
    queryKey: ['dispatch-parcels', dispatchId],
    queryFn: () => api.dispatch.getParcelsByDispatchId(dispatchId as number, 0, 6000),
    enabled: dispatchId != null,
  });

  const allRows: any[] = dispatchParcels?.rows || [];
  // tracking_number -> manifest row, for enriching scans with parcel details
  const manifestByTracking = new Map<string, any>(
    allRows.map((p) => [String(p.tracking_number || p.hbl || '').toUpperCase(), p])
  );
  // Parcels still pending reception (same rule as web: RECEIVED_IN_DISPATCH = already received)
  const expectedSet = new Set(
    allRows
      .filter((p) => p.status !== 'RECEIVED_IN_DISPATCH')
      .map((p) => String(p.tracking_number || p.hbl || '').toUpperCase())
      .filter(Boolean)
  );
  const alreadyReceivedSet = new Set(
    allRows
      .filter((p) => p.status === 'RECEIVED_IN_DISPATCH')
      .map((p) => String(p.tracking_number || p.hbl || '').toUpperCase())
      .filter(Boolean)
  );

  const matchedCount = scans.filter((s) => s.expected === true).length;
  const surplusCount = scans.filter((s) => s.expected === false).length;

  // Expected parcels not scanned yet
  const scannedSet = new Set(scans.map((s) => s.tracking_number));
  const pendingParcels = allRows.filter((p) => {
    const tn = String(p.tracking_number || p.hbl || '').toUpperCase();
    return tn && p.status !== 'RECEIVED_IN_DISPATCH' && !scannedSet.has(tn);
  });

  // Send everything to smart-receive in one batch
  const receiveMutation = useMutation({
    mutationFn: (tracking_numbers: string[]) => api.dispatch.smartReceive(tracking_numbers),
    onSuccess: (result: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(console.error);
      queryClient.invalidateQueries({ queryKey: ['dispatches'] });
      if (dispatchId != null) {
        queryClient.invalidateQueries({ queryKey: ['dispatch-parcels', dispatchId] });
      }

      // Same response contract as web: { summary, created_dispatches, finalized_dispatches, received_in_existing, details }
      const summary = result?.summary || {};
      const totalReceived: number = summary.total_received ?? 0;
      const totalSkipped: number = summary.total_skipped ?? 0;
      const details: any[] = result?.details || [];

      const lines: string[] = [`${totalReceived} parcel(s) received`];

      const createdIds = (result?.created_dispatches || []).map((d: any) => `#${d.dispatch_id}`);
      if (createdIds.length > 0) lines.push(`New dispatches created: ${createdIds.join(', ')}`);

      const finalizedIds = (result?.finalized_dispatches || []).map((d: any) => `#${d.dispatch_id}`);
      if (finalizedIds.length > 0) lines.push(`Dispatches finalized: ${finalizedIds.join(', ')}`);

      const existingIds = (result?.received_in_existing || []).map((d: any) => `#${d.dispatch_id}`);
      if (existingIds.length > 0) lines.push(`Received in existing dispatches: ${existingIds.join(', ')}`);

      if (totalSkipped > 0) {
        const skippedDetails = details
          .filter((d) => d.status === 'skipped')
          .map((d) => `${d.tracking_number}: ${d.reason || 'Not found'}`)
          .join('\n');
        lines.push(`\n${totalSkipped} skipped:\n${skippedDetails}`);
      }

      Alert.alert('Reception Complete', lines.join('\n'), [
        { text: 'OK', onPress: () => (router.canGoBack() ? router.back() : router.replace('/dispatches' as any)) },
      ]);
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(console.error);
      Alert.alert('Reception Failed', err?.response?.data?.message || 'Could not send parcels to the server. Your scans are kept — try again.');
    },
  });

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanY = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const scannedDebounce = useRef(false);

  useEffect(() => {
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

  const handleBarCodeScanned = ({ data }: { data: string }): void => {
    if (scannedDebounce.current) return;
    scannedDebounce.current = true;
    setTimeout(() => { scannedDebounce.current = false; }, 1000);

    const tn = data.trim().toUpperCase();
    if (!tn) return;

    setScans((prev) => {
      if (prev.some((s) => s.tracking_number === tn)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(console.error);
        showStatus(`${tn} already scanned`, 'error');
        return prev;
      }

      if (alreadyReceivedSet.has(tn)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(console.error);
        showStatus(`${tn} was already received`, 'error');
        return prev;
      }

      const expected = dispatchId != null ? expectedSet.has(tn) : null;
      const manifest = manifestByTracking.get(tn);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(console.error);
      showStatus(
        expected === false ? `${tn} — not in this dispatch (surplus)` : `Scanned: ${tn}`,
        expected === false ? 'error' : 'success'
      );

      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 0.8, duration: 100, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();

      return [{
        tracking_number: tn,
        scanned_at: Date.now(),
        expected,
        description: manifest?.description,
        weight: manifest?.weight,
        agency_name: manifest?.agency?.name,
      }, ...prev];
    });
  };

  const removeScanItem = (tn: string): void => {
    setScans((prev) => prev.filter((s) => s.tracking_number !== tn));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(console.error);
  };

  const handleSend = (): void => {
    if (scans.length === 0 || receiveMutation.isPending) return;
    const numbers = scans.map((s) => s.tracking_number);
    Alert.alert(
      'Confirm Reception',
      dispatchId != null
        ? `Receive ${numbers.length} parcels for Dispatch #${dispatchId}?${surplusCount > 0 ? `\n(${surplusCount} not expected in this dispatch)` : ''}`
        : `Receive ${numbers.length} scanned parcels?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Receive', onPress: () => receiveMutation.mutate(numbers) },
      ]
    );
  };

  if (!permission) return <View style={styles.container} />;
  if (!permission.granted) {
    return (
      <View style={styles.permWrap}>
        <Text style={{ color: Colors.textPrimary, fontSize: 18, fontWeight: '700' }}>Camera Access Required</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.permBtn}>
          <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent />

      {/* Flash overlay */}
      <Animated.View pointerEvents="none" style={[styles.flashOverlay, { opacity: flashAnim }]} />

      {/* Status banner */}
      <Animated.View style={[styles.statusBanner, {
        transform: [{ translateY: statusAnim }],
        backgroundColor: status.type === 'error' ? Colors.red : Colors.green,
        paddingTop: insets.top + 8,
      }]}>
        <Ionicons name={status.type === 'error' ? 'alert-circle' : 'checkmark-circle'} size={20} color="#fff" />
        <Text style={styles.statusBannerText}>{status.msg}</Text>
      </Animated.View>

      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={torch}
        onBarcodeScanned={showList ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'pdf417'] }}
      />

      {/* Overlay mask */}
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.overlayTop} />
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
          </Animated.View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom} />
      </View>

      {/* Top bar */}
      <View style={styles.topBar}>
        <BlurView intensity={60} tint="dark" style={[styles.topBarBlur, { paddingTop: insets.top + 8 }]}>
          <View style={styles.topBarRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => (router.canGoBack() ? router.back() : router.replace('/dispatches' as any))}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.topBarCenter}>
              <Text style={styles.topBarTitle}>
                {dispatchId != null ? `Dispatch #${dispatchId}` : 'Receive Parcels'}
              </Text>
              <View style={[styles.modeBadge, { backgroundColor: 'rgba(34,197,94,0.25)' }]}>
                <Ionicons name="cloud-download" size={12} color="#fff" />
                <Text style={styles.modeBadgeText}>
                  {dispatchId != null ? 'RECEIVE DISPATCH' : 'SMART RECEIVE'}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={[styles.iconBtn, torch && styles.iconBtnActive]} onPress={() => setTorch(!torch)}>
              <Ionicons name={torch ? 'flash' : 'flash-outline'} size={20} color={torch ? '#000000' : '#fff'} />
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>

      {/* Bottom panel */}
      <View style={styles.bottomArea}>
        <BlurView intensity={70} tint="dark" style={[styles.bottomBlur, { paddingBottom: insets.bottom + 12 }]}>
          {/* Progress / stats */}
          <TouchableOpacity
            style={styles.statsCard}
            activeOpacity={0.85}
            onPress={() => {
              setListTab('scanned');
              setShowList(true);
            }}
            disabled={scans.length === 0 && pendingParcels.length === 0}
          >
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{scans.length}</Text>
              <Text style={styles.statLab}>Scanned</Text>
            </View>
            {dispatchId != null && (
              <>
                <View style={styles.statDivider} />
                <TouchableOpacity
                  style={styles.statItem}
                  onPress={() => {
                    setListTab('pending');
                    setShowList(true);
                  }}
                  disabled={pendingParcels.length === 0}
                >
                  {loadingExpected ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.statVal, { color: pendingParcels.length > 0 ? Colors.amber : Colors.green }]}>
                      {pendingParcels.length}
                    </Text>
                  )}
                  <Text style={styles.statLab}>Pending</Text>
                </TouchableOpacity>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statVal, { color: surplusCount > 0 ? Colors.amber : 'rgba(255,255,255,0.4)' }]}>
                    {surplusCount}
                  </Text>
                  <Text style={styles.statLab}>Surplus</Text>
                </View>
              </>
            )}
            {(scans.length > 0 || pendingParcels.length > 0) && (
              <View style={styles.viewListBtn}>
                <Text style={styles.viewListText}>View</Text>
                <Ionicons name="chevron-up" size={13} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          {/* Send CTA */}
          <TouchableOpacity
            style={[styles.sendBtn, (scans.length === 0 || receiveMutation.isPending) && { opacity: 0.5 }]}
            onPress={handleSend}
            disabled={scans.length === 0 || receiveMutation.isPending}
          >
            {receiveMutation.isPending ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color="#000000" />
                <Text style={styles.sendBtnText}>
                  Receive {scans.length > 0 ? `${scans.length} ` : ''}Parcels
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.hintText}>
            Scans are kept on device until you send them to the server.
          </Text>
        </BlurView>
      </View>

      {/* Scanned list sheet */}
      <Modal visible={showList} animationType="slide" transparent onRequestClose={() => setShowList(false)}>
        <View style={styles.sheetWrap}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowList(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {dispatchId != null ? `Dispatch #${dispatchId}` : 'Scanned Parcels'}
              </Text>
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={styles.sheetCloseBtn} onPress={() => setShowList(false)}>
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {dispatchId != null && (
              <View style={styles.sheetTabs}>
                <TouchableOpacity
                  style={[styles.sheetTab, listTab === 'scanned' && styles.sheetTabActive]}
                  onPress={() => setListTab('scanned')}
                >
                  <Text style={[styles.sheetTabText, listTab === 'scanned' && styles.sheetTabTextActive]}>
                    Scanned ({scans.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sheetTab, listTab === 'pending' && styles.sheetTabActive]}
                  onPress={() => setListTab('pending')}
                >
                  <Text style={[
                    styles.sheetTabText,
                    listTab === 'pending' && styles.sheetTabTextActive,
                    pendingParcels.length > 0 && { color: Colors.amber },
                  ]}>
                    Pending ({pendingParcels.length})
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {listTab === 'pending' && dispatchId != null ? (
              <FlatList
                data={pendingParcels}
                keyExtractor={(item) => item.id?.toString() || item.tracking_number}
                style={{ maxHeight: 400 }}
                ItemSeparatorComponent={() => <View style={styles.sheetDivider} />}
                ListEmptyComponent={
                  <View style={styles.sheetEmpty}>
                    <Ionicons name="checkmark-done" size={32} color={Colors.green} />
                    <Text style={styles.sheetEmptyText}>All expected parcels scanned</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={styles.scanRow}>
                    <View style={[styles.scanIconWrap, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                      <Ionicons name="time-outline" size={16} color={Colors.amber} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.scanHbl} numberOfLines={1}>{item.tracking_number}</Text>
                      <Text style={styles.scanSub} numberOfLines={1}>
                        {[
                          item.description,
                          item.weight ? `${item.weight} lbs` : null,
                          item.agency?.name,
                        ].filter(Boolean).join(' • ') || 'No description'}
                      </Text>
                    </View>
                  </View>
                )}
              />
            ) : (
              <FlatList
                data={scans}
                keyExtractor={(item) => item.tracking_number}
                style={{ maxHeight: 400 }}
                ItemSeparatorComponent={() => <View style={styles.sheetDivider} />}
                ListEmptyComponent={
                  <View style={styles.sheetEmpty}>
                    <Ionicons name="qr-code-outline" size={32} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.sheetEmptyText}>No parcels scanned yet</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={styles.scanRow}>
                    <View style={[
                      styles.scanIconWrap,
                      item.expected === false && { backgroundColor: 'rgba(245,158,11,0.15)' },
                    ]}>
                      <Ionicons
                        name={item.expected === false ? 'help-circle-outline' : 'qr-code-outline'}
                        size={16}
                        color={item.expected === false ? Colors.amber : Colors.green}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.scanHbl} numberOfLines={1}>{item.tracking_number}</Text>
                      <Text style={styles.scanSub} numberOfLines={1}>
                        {item.expected === false
                          ? 'Not in this dispatch'
                          : [
                              item.description,
                              item.weight ? `${item.weight} lbs` : null,
                              item.agency_name,
                            ].filter(Boolean).join(' • ') ||
                            new Date(item.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.scanRemoveBtn}
                      onPress={() => removeScanItem(item.tracking_number)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={17} color={Colors.red} />
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(Colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    camera: { flex: 1 },
    flashOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff', zIndex: 30 },
    permWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg, gap: 16 },
    permBtn: { backgroundColor: Colors.primary, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 999 },

    statusBanner: {
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, paddingBottom: 12,
    },
    statusBannerText: { color: '#fff', fontWeight: '800', fontSize: 14, textAlign: 'center' },

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
    topBarTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
    modeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginTop: 4, gap: 4 },
    modeBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
    iconBtn: { width: 44, height: 44, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    iconBtnActive: { backgroundColor: '#FFFFFF' },

    bottomArea: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20 },
    bottomBlur: { overflow: 'hidden', padding: Spacing.md, gap: 10 },
    statsCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
      borderRadius: Radius.md, paddingVertical: 12, paddingHorizontal: Spacing.md,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statVal: { fontSize: 22, fontWeight: '900', color: '#fff' },
    statLab: { fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
    statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.12)' },
    viewListBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 3,
      backgroundColor: 'rgba(255,255,255,0.14)',
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full,
    },
    viewListText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
    sendBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
      backgroundColor: '#FFFFFF', borderRadius: 999, paddingVertical: 16,
    },
    sendBtnText: { color: '#000000', fontSize: 16, fontWeight: '700' },
    hintText: { fontSize: 11, color: 'rgba(255,255,255,0.45)', textAlign: 'center', fontWeight: '500' },

    /* sheet */
    sheetWrap: { flex: 1, justifyContent: 'flex-end' },
    sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
    sheet: {
      backgroundColor: '#161920',
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingHorizontal: Spacing.md, paddingTop: 10,
    },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 14 },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    sheetTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
    sheetTabs: {
      flexDirection: 'row',
      backgroundColor: 'rgba(255,255,255,0.07)',
      borderRadius: Radius.full,
      padding: 3,
      marginBottom: 10,
    },
    sheetTab: { flex: 1, paddingVertical: 8, borderRadius: Radius.full, alignItems: 'center' },
    sheetTabActive: { backgroundColor: 'rgba(255,255,255,0.15)' },
    sheetTabText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
    sheetTabTextActive: { color: '#FFFFFF' },
    sheetEmpty: { alignItems: 'center', paddingVertical: 32, gap: 10 },
    sheetEmptyText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
    sheetCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    sheetDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
    scanRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    scanIconWrap: { width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: 'rgba(34,197,94,0.12)', alignItems: 'center', justifyContent: 'center' },
    scanHbl: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.4 },
    scanSub: { fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: '500', marginTop: 2 },
    scanRemoveBtn: { width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: 'rgba(239,68,68,0.12)', alignItems: 'center', justifyContent: 'center' },
  });
}
