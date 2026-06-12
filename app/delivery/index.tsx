import React, { useState, useEffect, useCallback, useRef } from "react";
import {
   View,
   Text,
   StyleSheet,
   TouchableOpacity,
   StatusBar,
   Dimensions,
   Animated,
   Easing,
   FlatList,
   ActivityIndicator,
   Image,
   LayoutAnimation,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Spacing, Radius, Shadows } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";

import {
   addScanHbl,
   getAllStops,
   getStopStats,
   getOrphanedScanIds,
   clearSynced,
   clearAll,
   type ScannedDelivery,
   type GroupedStop,
} from "../../services/delivery-db";
import { syncPendingDeliveries, startSyncListener, stopSyncListener, isOnline } from "../../services/delivery-sync";

const { width } = Dimensions.get("window");
const SCAN_SIZE = width * 0.6;

export default function Delivery() {
   const router = useRouter();
   const insets = useSafeAreaInsets();
   const [permission, requestPermission] = useCameraPermissions();
   const [locPermission, requestLocPermission] = Location.useForegroundPermissions();

   const handleRequestAllPermissions = async () => {
      await requestPermission();
      await requestLocPermission();
   };
   const { Colors } = useTheme();
   const styles = useStyles(Colors);
   const [torch, setTorch] = useState(false);
   const [stops, setStops] = useState<GroupedStop[]>([]);
   const [stats, setStats] = useState({ total: 0, pending: 0, synced: 0, error: 0 });
   const [isSyncing, setIsSyncing] = useState(false);
   const [online, setOnline] = useState(true);
   const [lastScanned, setLastScanned] = useState<string | null>(null);

   // Batch state
   const [batchIds, setBatchIds] = useState<number[]>([]);

   // Scan cooldown ref
   const cooldownRef = useRef(false);
   const cameraRef = useRef<CameraView>(null);

   // Animations
   const pulseAnim = useRef(new Animated.Value(1)).current;
   const scanY = useRef(new Animated.Value(0)).current;
   const flashAnim = useRef(new Animated.Value(0)).current;

   useEffect(() => {
      Animated.loop(
         Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
         ]),
      ).start();
      Animated.loop(
         Animated.sequence([
            Animated.timing(scanY, {
               toValue: SCAN_SIZE - 4,
               duration: 2000,
               easing: Easing.inOut(Easing.ease),
               useNativeDriver: true,
            }),
            Animated.timing(scanY, {
               toValue: 0,
               duration: 2000,
               easing: Easing.inOut(Easing.ease),
               useNativeDriver: true,
            }),
         ]),
      ).start();
   }, []);

   const refreshData = useCallback(async () => {
      const [allStops, newStats, onlineStatus] = await Promise.all([getAllStops(), getStopStats(), isOnline()]);
      setStops(allStops);
      setStats(newStats);
      setOnline(onlineStatus);
   }, []);

   useEffect(() => {
      const init = async () => {
         await refreshData();
         const orphanedIds = await getOrphanedScanIds();
         if (orphanedIds.length > 0) {
            setBatchIds(orphanedIds);
         }
      };
      init();
      startSyncListener((result) => {
         if (result.synced > 0) refreshData();
      });
      return () => stopSyncListener();
   }, []);

   const handleBarCodeScanned = async ({ data }: { data: string }) => {
      if (cooldownRef.current) return;
      cooldownRef.current = true;

      const newId = await addScanHbl(data);

      if (newId) {
         setBatchIds((prev) => [...prev, newId]);
         await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
         setLastScanned(data);
         // Flash animation
         Animated.sequence([
            Animated.timing(flashAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
            Animated.timing(flashAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
         ]).start();
      } else {
         await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
         setLastScanned(`⚠ ${data} (duplicate)`);
      }

      await refreshData();

      // 1s cooldown between scans
      setTimeout(() => {
         cooldownRef.current = false;
      }, 1000);
   };

   const handleSync = async () => {
      setIsSyncing(true);
      try {
         await syncPendingDeliveries();
         await refreshData();
         await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
         await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
         setIsSyncing(false);
      }
   };

   const handleClearSynced = async () => {
      await clearSynced();
      await refreshData();
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
   };

   const handleResetAll = async () => {
      await clearAll();
      await refreshData();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
   };

   if (!permission || !locPermission) return <View style={styles.container} />;

   if (!permission.granted || !locPermission.granted) {
      return (
         <View style={[styles.permWrap, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.permContent}>
               <View style={styles.permIcon}>
                  <Ionicons name="lock-open" size={44} color={Colors.primary} />
               </View>
               <Text style={styles.permTitle}>Permisos Requeridos</Text>
               <Text style={styles.permSub}>Necesitamos acceso a la Cámara y Ubicación para procesar entregas.</Text>
               <TouchableOpacity
                  style={[styles.permBtn, { backgroundColor: Colors.primary }]}
                  onPress={handleRequestAllPermissions}
               >
                  <Text style={[styles.permBtnText, { color: "#FFFFFF" }]}>Permitir Acceso</Text>
               </TouchableOpacity>
            </View>
         </View>
      );
   }

   // ── Scanner view ──
   return (
      <View style={styles.container}>
         <StatusBar barStyle="light-content" translucent />

         {/* Flash overlay */}
         <Animated.View pointerEvents="none" style={[styles.flashOverlay, { opacity: flashAnim }]} />

         <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            enableTorch={torch}
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["qr", "code128", "code39", "ean13", "pdf417"] }}
         />

         {/* Overlay */}
         <View style={styles.overlay}>
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
                     <View key={i} style={[styles.corner, c as any, { borderColor: "#FFFFFF" }]} />
                  ))}
                  <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanY }] }]}>
                     <View style={styles.scanLineInner} />
                  </Animated.View>
               </Animated.View>
               <View style={styles.overlaySide} />
            </View>
            <View style={styles.overlayBottom} />
         </View>

         {/* Top bar */}
         <View style={styles.topBar}>
            <BlurView intensity={50} tint="dark" style={[styles.topBarBlur, { paddingTop: insets.top + 8 }]}>
               <View style={styles.topBarRow}>
                  <TouchableOpacity
                     style={styles.iconBtn}
                     onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
                  >
                     <Ionicons name="arrow-back" size={20} color="#fff" />
                  </TouchableOpacity>
                  <View style={styles.topBarCenter}>
                     <View style={[styles.modeBadge, { backgroundColor: Colors.greenDim }]}>
                        <View style={[styles.liveDot, { backgroundColor: Colors.green }]} />
                        <Text style={[styles.modeBadgeText, { color: Colors.green }]}>DELIVERY MODE</Text>
                     </View>
                  </View>
                  <TouchableOpacity
                     style={[styles.iconBtn, torch && styles.iconBtnActive]}
                     onPress={() => setTorch((t) => !t)}
                  >
                     <Ionicons name={torch ? "flash" : "flash-outline"} size={20} color={torch ? "#000000" : "#fff"} />
                  </TouchableOpacity>
               </View>
            </BlurView>
         </View>

         {/* Bottom panel */}
         <View style={styles.bottomPanel}>
            <BlurView intensity={60} tint="dark" style={[styles.bottomBlur, { paddingBottom: insets.bottom + 12 }]}>
               {/* Connection status & Proof Info */}
               <View style={styles.topInfoRow}>
                  <View style={styles.connRow}>
                     <View style={[styles.connDot, { backgroundColor: online ? Colors.green : Colors.red }]} />
                     <Text style={styles.connText}>{online ? "Online" : "Offline"}</Text>
                  </View>
                  <View style={styles.batchCountRow}>
                     <View
                        style={[
                           styles.batchCountBadge,
                           {
                              backgroundColor:
                                 batchIds.length > 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
                           },
                        ]}
                     >
                        <Ionicons
                           name="cube"
                           size={14}
                           color={batchIds.length > 0 ? "#FFFFFF" : "rgba(255,255,255,0.4)"}
                        />
                        <Text
                           style={[
                              styles.batchCountText,
                              { color: batchIds.length > 0 ? "#FFFFFF" : "rgba(255,255,255,0.4)" },
                           ]}
                        >
                           {batchIds.length} Packages scanned in this stop
                        </Text>
                     </View>
                  </View>
               </View>

               {/* Stop Completion */}
               <View style={styles.proofActionRow}>
                  <TouchableOpacity
                     style={[styles.confirmBtn, batchIds.length === 0 && { opacity: 0.5 }]}
                     onPress={() =>
                        router.push({ pathname: "/delivery/proof", params: { ids: JSON.stringify(batchIds) } })
                     }
                     disabled={batchIds.length === 0}
                  >
                     <View style={styles.confirmInner}>
                        <Ionicons name="arrow-forward-circle" size={22} color="#fff" />
                        <Text style={styles.confirmBtnText}>Finish Scanning & Take Proof</Text>
                     </View>
                  </TouchableOpacity>
               </View>

               {/* Last scanned */}
               {lastScanned && (
                  <View style={styles.lastScanRow}>
                     <Ionicons name="checkmark-circle" size={16} color={Colors.green} />
                     <Text style={[styles.lastScanText, { color: Colors.green }]} numberOfLines={1}>
                        {lastScanned}
                     </Text>
                  </View>
               )}

               {/* Counter chips */}
               <View style={styles.counterRow}>
                  <View style={styles.counterChip}>
                     <Text style={[styles.counterValue, { color: "#FFFFFF" }]}>{stats.total}</Text>
                     <Text style={styles.counterLabel}>Total Stops</Text>
                  </View>
                  <View style={styles.counterChip}>
                     <Text style={[styles.counterValue, { color: Colors.amber }]}>{stats.pending}</Text>
                     <Text style={styles.counterLabel}>Pending</Text>
                  </View>
                  <View style={styles.counterChip}>
                     {isSyncing ? (
                        <ActivityIndicator size="small" color={Colors.green} />
                     ) : (
                        <Text style={[styles.counterValue, { color: Colors.green }]}>{stats.synced}</Text>
                     )}
                     <Text style={styles.counterLabel}>Synced</Text>
                  </View>
               </View>

               {/* Sync Trigger / Retry if pending */}
               {(stats.pending > 0 || stats.error > 0) && (
                  <TouchableOpacity
                     style={[styles.syncTriggerBtn, isSyncing && { opacity: 0.7 }]}
                     onPress={handleSync}
                     disabled={isSyncing}
                  >
                     {isSyncing ? (
                        <>
                           <ActivityIndicator size="small" color="#000" />
                           <Text style={styles.syncTriggerBtnText}>Syncing now...</Text>
                        </>
                     ) : (
                        <>
                           <Ionicons name="refresh" size={18} color="#000" />
                           <Text style={styles.syncTriggerBtnText}>
                              {stats.error > 0
                                 ? `Retry ${stats.error} Failed Stops`
                                 : `Sync ${stats.pending} Pending Stops`}
                           </Text>
                        </>
                     )}
                  </TouchableOpacity>
               )}

               {/* Actions */}
               <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.listBtn} onPress={() => router.push("/history")}>
                     <Ionicons name="list" size={18} color="#FFFFFF" />
                     <Text style={[styles.listBtnText, { color: "#FFFFFF" }]}>View All Delivery History</Text>
                  </TouchableOpacity>
               </View>
            </BlurView>
         </View>
      </View>
   );
}

/* ─── Static styles ─── */
const staticStyles = StyleSheet.create({
   container: { flex: 1, backgroundColor: "#000" },
   camera: { flex: 1 },
   flashOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "#FFFFFF",
      zIndex: 30,
   },

   /* overlay mask */
   overlay: { ...StyleSheet.absoluteFillObject, flexDirection: "column" },
   overlayTop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
   overlayMiddle: { flexDirection: "row", height: SCAN_SIZE },
   overlaySide: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
   overlayBottom: { flex: 1.5, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
   locHintWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: "rgba(245,158,11,0.15)",
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: "rgba(245,158,11,0.3)",
   },
   locHintText: { fontSize: 13, fontWeight: "700", textAlign: "center" },
   scanWindow: {
      width: SCAN_SIZE,
      height: SCAN_SIZE,
      position: "relative",
      overflow: "hidden",
      backgroundColor: "transparent",
   },
   corner: { position: "absolute", width: 32, height: 32, zIndex: 2 },
   scanLine: { position: "absolute", left: 8, right: 8, height: 3, zIndex: 1 },
   scanLineInner: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.6)" },

   /* top bar */
   topBar: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
   topBarBlur: { overflow: "hidden" },
   topBarRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: Spacing.md,
      paddingVertical: 14,
   },
   topBarCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
   iconBtn: {
      width: 44,
      height: 44,
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
   },
   iconBtnActive: { backgroundColor: "#FFFFFF" },
   modeBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: Radius.full,
   },
   modeBadgeText: { fontSize: 12, fontWeight: "800", letterSpacing: 1 },
   liveDot: { width: 8, height: 8, borderRadius: 4 },

   /* bottom panel */
   bottomPanel: { position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10 },
   bottomBlur: { overflow: "hidden", padding: Spacing.md, gap: 10 },
   topInfoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
   proofActionRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: 4 },
   confirmBtn: { flex: 1, borderRadius: 999, overflow: "hidden" },
   confirmInner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingVertical: 16,
      backgroundColor: "#FFFFFF",
      borderRadius: 999,
   },
   confirmBtnText: { color: "#000000", fontSize: 16, fontWeight: "700" },
   batchCountRow: { alignItems: "center", marginBottom: 4 },
   batchCountBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: Radius.full,
   },
   batchCountText: { fontSize: 12, fontWeight: "700" },
   connRow: { flexDirection: "row", alignItems: "center", gap: 6 },
   connDot: { width: 8, height: 8, borderRadius: 4 },
   connText: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
   lastScanRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "rgba(16,185,129,0.1)",
      borderRadius: Radius.md,
      padding: 10,
   },
   lastScanText: { flex: 1, fontSize: 13, fontWeight: "700" },
   counterRow: { flexDirection: "row", gap: Spacing.sm },
   counterChip: {
      flex: 1,
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.06)",
      borderRadius: Radius.md,
      paddingVertical: 10,
   },
   counterValue: { fontSize: 22, fontWeight: "900" },
   counterLabel: { fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: "600", marginTop: 2 },
   actionRow: { flexDirection: "row", gap: Spacing.sm },
   listBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: "rgba(255,255,255,0.08)",
      borderRadius: Radius.lg,
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.08)",
   },
   listBtnText: { fontSize: 14, fontWeight: "700" },
   syncTriggerBtn: {
      backgroundColor: "#FFFFFF",
      borderRadius: Radius.md,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 4,
      ...Shadows.subtle,
   },
   syncTriggerBtnText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#000",
   },

   emptyWrap: { alignItems: "center", paddingTop: 60, gap: 10 },
});

function makeModalStyles(C: any) {
   return StyleSheet.create({
      emptyText: { fontSize: 16, color: C.textSecondary, fontWeight: "600" },

      /* permission */
      permWrap: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
      permContent: { alignItems: "center", paddingHorizontal: 40, gap: 12 },
      permIcon: {
         width: 100,
         height: 100,
         borderRadius: 999,
         backgroundColor: C.elevated,
         alignItems: "center",
         justifyContent: "center",
         marginBottom: 8,
      },
      permTitle: { fontSize: 24, fontWeight: "700", color: C.textPrimary },
      permSub: { fontSize: 15, textAlign: "center", lineHeight: 24, color: C.textSecondary },
      permBtn: {
         paddingHorizontal: 40,
         paddingVertical: 16,
         borderRadius: 999,
         marginTop: 8,
         backgroundColor: C.primary,
      },
      permBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
   });
}

function useStyles(C: any) {
   return { ...staticStyles, ...makeModalStyles(C) };
}
