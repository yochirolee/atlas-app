import React, { useState, useRef, useEffect } from "react";
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
   TextInput,
   KeyboardAvoidingView,
   Platform,
   Modal,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Spacing, Radius, Shadows } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TrackingResponse } from "../../data/types";
import { useParcelTracking } from "../../hooks/useTracking";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import { getEventLabel, getEventStatusKey, getLatestEvent } from "../../lib/tracking-events";

const { width } = Dimensions.get("window");
const SCAN_SIZE = width * 0.7; // Exact match with delivery.tsx

/* ───────────────────────── Result Card ───────────────────────── */
function ScanResult({ tracking, onScanAgain }: { tracking: TrackingResponse; onScanAgain: () => void }) {
   const router = useRouter();
   const { Colors } = useTheme();
   const styles = useStyles(Colors);

   const status_config: any = {
      in_transit: { label: "In Transit", color: Colors.primary, dimColor: Colors.cardBorder, icon: "airplane" },
      delivered: { label: "Delivered", color: Colors.green, dimColor: Colors.greenDim, icon: "checkmark-circle" },
   };
   const parcel = tracking.parcels[0];
   const lastEvent = getLatestEvent(parcel.events || []);
   const statusKey = getEventStatusKey(lastEvent, (parcel as any).status);
   const configKey = statusKey === "DELIVERED" ? "delivered" : "in_transit";
   const config = status_config[configKey] || status_config["in_transit"];

   const scale = useRef(new Animated.Value(0.85)).current;
   const opacity = useRef(new Animated.Value(0)).current;

   useEffect(() => {
      Animated.parallel([
         Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 65, friction: 8 }),
         Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
   }, []);

   return (
      <Animated.View style={[styles.resultCard, { transform: [{ scale }], opacity }]}>
         <View style={[styles.resultIconWrap, { backgroundColor: Colors.greenDim }]}>
            <Ionicons name="checkmark-circle" size={34} color={Colors.green} />
         </View>
         <Text style={[styles.resultFoundText, { color: Colors.green }]}>PACKAGE FOUND</Text>
         <Text style={styles.resultTitle} numberOfLines={2}>
            {parcel.description}
         </Text>
         <Text style={styles.resultTracking}>{parcel.hbl}</Text>

         <View style={[styles.resultStatusBadge, { backgroundColor: config.dimColor }]}>
            <Ionicons name={config.icon as any} size={14} color={config.color} />
            <Text style={[styles.resultStatusText, { color: config.color }]}>
               {lastEvent ? getEventLabel(lastEvent) : config.label}
            </Text>
         </View>

         <View style={styles.resultMeta}>
            <View style={styles.resultMetaItem}>
               <Text style={styles.resultMetaLabel}>AGENCY</Text>
               <Text style={styles.resultMetaValue}>{tracking.agency}</Text>
            </View>
            <View style={styles.resultMetaArrow}>
               <Ionicons name="airplane" size={14} color={Colors.primary} />
            </View>
            <View style={[styles.resultMetaItem, { alignItems: "flex-end" }]}>
               <Text style={styles.resultMetaLabel}>DESTINATION</Text>
               <Text style={styles.resultMetaValue}>
                  {typeof tracking.city === "object" ? tracking.city?.name : tracking.city},{" "}
                  {typeof tracking.province === "object" ? tracking.province?.name : tracking.province}
               </Text>
            </View>
         </View>

         <View style={styles.resultWeightRow}>
            <Ionicons name="scale-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.resultWeightLabel}>Weight</Text>
            <Text style={styles.resultWeightValue}>{parcel.weight} kg</Text>
         </View>

         <View style={styles.resultActions}>
            <TouchableOpacity
               style={styles.resultViewBtn}
               activeOpacity={0.85}
               onPress={() => router.push({ pathname: "/history/[id]", params: { id: parcel.hbl } })}
            >
               <Text style={styles.resultViewText}>View Details</Text>
               <View style={styles.viewIconCircle}>
                  <Ionicons name="arrow-forward" size={18} color={Colors.primary} />
               </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resultScanAgain} onPress={onScanAgain} activeOpacity={0.7}>
               <Ionicons name="scan-outline" size={20} color={Colors.textSecondary} />
               <Text style={styles.resultScanAgainText}>Scan Another Package</Text>
            </TouchableOpacity>
         </View>
      </Animated.View>
   );
}

/* ───────────────────────── Main Screen ───────────────────────── */
export default function Scan() {
   const router = useRouter();
   const insets = useSafeAreaInsets();
   const [permission, requestPermission] = useCameraPermissions();
   const [scanned, setScanned] = useState(false);
   const [scannedId, setScannedId] = useState<string | null>(null);
   const [foundPackage, setFoundPackage] = useState<TrackingResponse | null>(null);
   const [torch, setTorch] = useState(false);
   const [showManual, setShowManual] = useState(false);
   const [manualInput, setManualInput] = useState("");

   const { data: trackingData, isLoading, error, isSuccess, isError } = useParcelTracking(scannedId || "");

   const { Colors, Spacing, Radius, Shadows } = useTheme();
   const styles = useStyles(Colors);

   const cooldownRef = useRef(false);

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

   useEffect(() => {
      if (scannedId && isSuccess && trackingData) {
         if (trackingData.parcels?.length > 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(console.error);
            setFoundPackage(trackingData);
            setScanned(true);
            setShowManual(false);

            Animated.sequence([
               Animated.timing(flashAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
               Animated.timing(flashAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]).start();
         } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(console.error);
            alert("Package not found: " + scannedId);
            setScannedId(null);
            cooldownRef.current = false;
         }
      }
   }, [trackingData, isSuccess, scannedId]);

   useEffect(() => {
      if (scannedId && isError) {
         console.error(error);
         Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(console.error);
         alert("Error searching for package");
         setScannedId(null);
         cooldownRef.current = false;
      }
   }, [error, isError, scannedId]);

   const handleBarCodeScanned = async ({ data }: { data: string }) => {
      if (cooldownRef.current || scanned || isLoading || scannedId || showManual) return;

      const isUrl = /^(exp|http|https|ftp):\/\//i.test(data.trim());
      if (isUrl) return;

      cooldownRef.current = true;
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(console.error);
      setScannedId(data.trim());

      setTimeout(() => {
         if (!scanned && !foundPackage) {
            cooldownRef.current = false;
         }
      }, 5000);
   };

   const handleManualSubmit = async () => {
      const value = manualInput.trim();
      if (!value || isLoading) return;
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(console.error);
      setScannedId(value);
   };

   const reset = () => {
      setScanned(false);
      setScannedId(null);
      setFoundPackage(null);
      setManualInput("");
      cooldownRef.current = false;
   };

   if (!permission) return <View style={styles.container} />;

   if (!permission.granted) {
      return (
         <View style={[styles.permWrap, { paddingTop: insets.top }]}>
            <View style={styles.permContent}>
               <View style={styles.permIcon}>
                  <Ionicons name="camera" size={44} color={Colors.primary} />
               </View>
               <Text style={styles.permTitle}>Camera Access</Text>
               <Text style={styles.permSub}>
                  We need access to your camera to scan QR codes and barcodes on packages.
               </Text>
               <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                  <Text style={styles.permBtnText}>Allow Camera</Text>
               </TouchableOpacity>
            </View>
         </View>
      );
   }

   return (
      <View style={styles.container}>
         <StatusBar barStyle="light-content" translucent />

         <Animated.View pointerEvents="none" style={[styles.flashOverlay, { opacity: flashAnim }]} />

         <CameraView
            style={styles.camera}
            facing="back"
            enableTorch={torch}
            onBarcodeScanned={scanned || isLoading || showManual ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["qr", "code128", "code39", "ean13", "pdf417"] }}
         />

         {!foundPackage && (
            <>
               <View style={styles.overlay}>
                  <View style={styles.overlayTop} />
                  <View style={styles.overlayMiddle}>
                     <View style={styles.overlaySide} />
                     <Animated.View style={[styles.scanWindow, { transform: [{ scale: pulseAnim }] }]}>
                        {[
                           { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
                           { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
                           { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
                           {
                              bottom: 0,
                              right: 0,
                              borderBottomWidth: 4,
                              borderRightWidth: 4,
                              borderBottomRightRadius: 16,
                           },
                        ].map((c, i) => (
                           <View key={i} style={[styles.corner, c as any, { borderColor: "#FFFFFF" }]} />
                        ))}
                        <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanY }] }]}>
                           <View style={styles.scanLineInner} />
                        </Animated.View>

                        {isLoading && (
                           <View style={styles.loadingOverlay}>
                              <ActivityIndicator color="#FFFFFF" size="large" />
                              <Text style={styles.loadingText}>Searching…</Text>
                           </View>
                        )}
                     </Animated.View>
                     <View style={styles.overlaySide} />
                  </View>
                  <View style={styles.overlayBottom} />
               </View>

               <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
                  <View style={styles.topBarRow}>
                     <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color="#fff" />
                     </TouchableOpacity>
                     <View style={styles.topBarCenter}>
                        <Ionicons name="scan" size={16} color="#FFFFFF" />
                        <Text style={styles.topBarTitle}>Package Scanner</Text>
                     </View>
                     <TouchableOpacity
                        style={[styles.iconBtn, torch && styles.iconBtnActive]}
                        onPress={() => setTorch((t) => !t)}
                     >
                        <Ionicons name={torch ? "flash" : "flash-outline"} size={20} color={torch ? "#000" : "#fff"} />
                     </TouchableOpacity>
                  </View>
               </View>

               <View style={[styles.bottomArea, { paddingBottom: insets.bottom + 16 }]}>
                  <Text style={styles.hint}>Align barcode or QR code within the frame</Text>

                  <View style={styles.dividerRow}>
                     <View style={styles.dividerLine} />
                     <Text style={styles.dividerText}>OR</Text>
                     <View style={styles.dividerLine} />
                  </View>

                  <TouchableOpacity
                     style={styles.manualBtn}
                     activeOpacity={0.8}
                     onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(console.error);
                        setShowManual(true);
                     }}
                  >
                     <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                     <Text style={styles.manualBtnText}>Enter Tracking Manually</Text>
                     <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.5)" />
                  </TouchableOpacity>
               </View>
            </>
         )}

         <Modal visible={showManual} transparent animationType="slide" onRequestClose={() => setShowManual(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalWrap}>
               <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setShowManual(false)} />
               <View style={styles.modalSheet}>
                  <View style={styles.modalHandle} />

                  <View style={styles.modalHeader}>
                     <View style={styles.modalIconWrap}>
                        <Ionicons name="document-text-outline" size={24} color={Colors.primary} />
                     </View>
                     <Text style={styles.modalTitle}>Manual Entry</Text>
                     <Text style={styles.modalSub}>Type or paste the HBL tracking number</Text>
                  </View>

                  <View style={styles.inputRow}>
                     <Ionicons name="search-outline" size={20} color={Colors.textMuted} />
                     <TextInput
                        style={styles.input}
                        placeholder="e.g. CTE260200000V02"
                        placeholderTextColor={Colors.textMuted}
                        value={manualInput}
                        onChangeText={setManualInput}
                        autoCapitalize="characters"
                        autoFocus
                        returnKeyType="search"
                        onSubmitEditing={handleManualSubmit}
                     />
                     {manualInput.length > 0 && (
                        <TouchableOpacity onPress={() => setManualInput("")}>
                           <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
                        </TouchableOpacity>
                     )}
                  </View>

                  <TouchableOpacity
                     style={[styles.submitBtn, (!manualInput.trim() || isLoading) && styles.submitBtnDisabled]}
                     onPress={handleManualSubmit}
                     disabled={!manualInput.trim() || isLoading}
                     activeOpacity={0.8}
                  >
                     {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                     ) : (
                        <>
                           <Ionicons name="search" size={20} color="#FFFFFF" />
                           <Text style={styles.submitText}>Track Package</Text>
                        </>
                     )}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowManual(false)}>
                     <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
               </View>
            </KeyboardAvoidingView>
         </Modal>

         {foundPackage && (
            <View style={styles.resultOverlay}>
               <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
               <View style={styles.resultContent}>
                  <ScanResult tracking={foundPackage} onScanAgain={reset} />
               </View>
            </View>
         )}
      </View>
   );
}

/* ─── Static styles (camera overlay — hardcoded, not theme-dependent) ─── */
const staticStyles = StyleSheet.create({
   container: { flex: 1, backgroundColor: "#000" },
   camera: { flex: 1 },
   flashOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "#fff",
      zIndex: 30,
   },
   overlay: { ...StyleSheet.absoluteFillObject, flexDirection: "column" },
   overlayTop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
   overlayMiddle: { flexDirection: "row", height: SCAN_SIZE },
   overlaySide: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
   overlayBottom: { flex: 1.5, backgroundColor: "rgba(0,0,0,0.55)" },
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
   topBar: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
   topBarRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: Spacing.md,
      paddingVertical: 14,
   },
   topBarCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
   topBarTitle: { fontSize: 17, fontWeight: "700", color: "#fff", letterSpacing: -0.3 },
   iconBtn: {
      width: 44,
      height: 44,
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
   },
   iconBtnActive: { backgroundColor: "#FFFFFF" },
   bottomArea: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: Spacing.lg,
      alignItems: "center",
      gap: 14,
   },
   hint: { fontSize: 14, color: "rgba(255,255,255,0.7)", fontWeight: "500", textAlign: "center" },
   dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, width: "60%" },
   dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.15)" },
   dividerText: { fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: "700" },
   manualBtn: {
      width: "100%",
      borderRadius: 999,
      overflow: "hidden",
      backgroundColor: "rgba(255,255,255,0.15)",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingVertical: 16,
      paddingHorizontal: 20,
   },
   manualBtnText: { flex: 1, color: "#fff", fontSize: 15, fontWeight: "600" },
   loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      zIndex: 5,
   },
   loadingText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
   modalWrap: { flex: 1, justifyContent: "flex-end" },
   modalDismiss: { flex: 1 },
});

/* ─── Theme-dependent styles ─────────────────────────────────────────── */
function makeModalStyles(C: any) {
   return StyleSheet.create({
      modalSheet: {
         borderTopLeftRadius: 16,
         borderTopRightRadius: 16,
         padding: Spacing.xl,
         backgroundColor: C.bg,
      },
      modalHandle: {
         width: 40,
         height: 5,
         borderRadius: 3,
         alignSelf: "center",
         marginBottom: 24,
         backgroundColor: C.cardBorder,
      },
      modalHeader: { alignItems: "center", marginBottom: 28 },
      modalIconWrap: {
         width: 56,
         height: 56,
         borderRadius: 999,
         alignItems: "center",
         justifyContent: "center",
         marginBottom: 14,
         backgroundColor: C.cyanDim,
      },
      modalTitle: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5, color: C.textPrimary },
      modalSub: { fontSize: 14, marginTop: 6, color: C.textSecondary },
      inputRow: {
         flexDirection: "row",
         alignItems: "center",
         borderRadius: Radius.sm,
         paddingHorizontal: 16,
         height: 56,
         borderWidth: 1,
         borderColor: C.cardBorder,
         backgroundColor: C.elevated,
         gap: 12,
         marginBottom: 20,
      },
      input: { flex: 1, fontSize: 16, fontWeight: "600", letterSpacing: 0.5, color: C.textPrimary },
      submitBtn: {
         borderRadius: 999,
         overflow: "hidden",
         flexDirection: "row",
         alignItems: "center",
         justifyContent: "center",
         backgroundColor: C.primary,
         paddingVertical: 16,
         gap: 8,
      },
      submitBtnDisabled: { opacity: 0.3 },
      submitText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
      cancelBtn: { alignItems: "center", paddingVertical: 16 },
      cancelText: { fontSize: 14, fontWeight: "600", color: C.textSecondary },
      resultOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", zIndex: 20 },
      resultContent: { width: "100%", paddingHorizontal: Spacing.md },
      resultCard: {
         borderRadius: Radius.md,
         padding: Spacing.lg,
         alignItems: "center",
         gap: 6,
         backgroundColor: C.card,
         ...Shadows.elevated,
      },
      resultIconWrap: {
         width: 72,
         height: 72,
         borderRadius: 999,
         alignItems: "center",
         justifyContent: "center",
         marginBottom: 4,
      },
      resultFoundText: { fontSize: 12, fontWeight: "700", letterSpacing: 1.5 },
      resultTitle: { fontSize: 18, fontWeight: "700", textAlign: "center", letterSpacing: -0.3, color: C.textPrimary },
      resultTracking: { fontSize: 13, fontWeight: "500", letterSpacing: 0.5, marginBottom: 4, color: C.textSecondary },
      resultStatusBadge: {
         flexDirection: "row",
         alignItems: "center",
         gap: 6,
         paddingHorizontal: 14,
         paddingVertical: 7,
         borderRadius: 999,
         marginBottom: 12,
      },
      resultStatusText: { fontSize: 12, fontWeight: "700" },
      resultMeta: {
         flexDirection: "row",
         alignItems: "center",
         borderRadius: Radius.sm,
         padding: Spacing.md,
         width: "100%",
         backgroundColor: C.elevated,
      },
      resultMetaItem: { flex: 1 },
      resultMetaArrow: { paddingHorizontal: 10 },
      resultMetaLabel: {
         fontSize: 10,
         fontWeight: "700",
         letterSpacing: 1,
         textTransform: "uppercase",
         marginBottom: 3,
         color: C.textMuted,
      },
      resultMetaValue: { fontSize: 13, fontWeight: "600", color: C.textPrimary },
      resultWeightRow: {
         flexDirection: "row",
         alignItems: "center",
         width: "100%",
         padding: Spacing.md,
         borderRadius: Radius.sm,
         gap: 8,
         marginTop: 4,
         backgroundColor: C.elevated,
      },
      resultWeightLabel: { flex: 1, fontSize: 14, fontWeight: "500", color: C.textSecondary },
      resultWeightValue: { fontSize: 16, fontWeight: "700", color: C.textPrimary },
      resultActions: { gap: 12, width: "100%", marginTop: 20 },
      resultScanAgain: {
         width: "100%",
         borderRadius: 999,
         flexDirection: "row",
         alignItems: "center",
         justifyContent: "center",
         gap: 8,
         paddingVertical: 14,
         backgroundColor: "transparent",
      },
      resultScanAgainText: { fontSize: 14, fontWeight: "600", color: C.textSecondary },
      resultViewBtn: {
         width: "100%",
         borderRadius: 999,
         overflow: "hidden",
         flexDirection: "row",
         alignItems: "center",
         justifyContent: "center",
         gap: 12,
         paddingVertical: 16,
         paddingHorizontal: 4,
         backgroundColor: C.primary,
         ...Shadows.elevated,
      },
      resultViewText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
      viewIconCircle: {
         width: 32,
         height: 32,
         borderRadius: 999,
         alignItems: "center",
         justifyContent: "center",
         backgroundColor: "#FFFFFF",
      },
      permWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg },
      permContent: { alignItems: "center", paddingHorizontal: 40, gap: 12 },
      permIcon: {
         width: 100,
         height: 100,
         borderRadius: 999,
         alignItems: "center",
         justifyContent: "center",
         marginBottom: 8,
         backgroundColor: C.elevated,
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

/* Merge helper so JSX can use one `styles` object */
function useStyles(C: any) {
   return { ...staticStyles, ...makeModalStyles(C) };
}
