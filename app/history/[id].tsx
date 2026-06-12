import React, { useState, useEffect } from "react";
import {
   View,
   Text,
   ScrollView,
   StyleSheet,
   TouchableOpacity,
   StatusBar,
   Dimensions,
   ActivityIndicator,
   Image,
   Modal,
   FlatList,
   Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Spacing, Radius, Shadows, AppColors } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { useParcelTracking } from "../../hooks/useTracking";
import { getPhotosByHbl, getLocationByHbl } from "../../services/delivery-db";
import { WebView } from "react-native-webview";
import { LinearGradient } from "expo-linear-gradient";
import { STATUS_CONFIG } from "../../constants/status";
import { getEventLabel, getEventStatusKey, getEventSubtitle, getEventTimestamp, getLatestEvent, getDeliveryCoordinates, sortEventsNewestFirst } from "../../lib/tracking-events";

const { width } = Dimensions.get("window");

type TabKey = "timeline" | "details" | "proof";

export default function PackageDetail() {
   const { id } = useLocalSearchParams<{ id: string }>();
   const router = useRouter();
   const insets = useSafeAreaInsets();
   const { Colors } = useTheme();
   const styles = makeStyles(Colors);
   const [tab, setTab] = useState<TabKey>("timeline");
   const [selectedHbl, setSelectedHbl] = useState<string | null>(id || null);
   const [localPhotos, setLocalPhotos] = useState<string[]>([]);
   const [deliveryLocation, setDeliveryLocation] = useState<{ latitude: number; longitude: number } | null>(null);
   const [isMapModalVisible, setIsMapModalVisible] = useState(false);
   const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

   const { data, isLoading, error } = useParcelTracking(id as string);

   // Sync selectedHbl when navigate from one history item to another or when data loads
   useEffect(() => {
      if (id) {
         setSelectedHbl(id);
      } else if (data && data.parcels?.length > 0 && !selectedHbl) {
         setSelectedHbl(data.parcels[0].hbl);
      }
   }, [data, id]);

   // Fetch local data (photos and location) when HBL changes
   useEffect(() => {
      if (selectedHbl) {
         setLocalPhotos([]); // Reset to avoid showing old photos
         setDeliveryLocation(null); // Reset location
         getPhotosByHbl(selectedHbl).then(setLocalPhotos);

         // Try local DB first, then fallback to API data if local coords are missing
         getLocationByHbl(selectedHbl).then((loc) => {
            if (loc) {
               setDeliveryLocation(loc);
            } else if (data?.parcels) {
               const currentParcel =
                  data.parcels.find((p: any) => p.hbl === selectedHbl || p.tracking_number === selectedHbl) ||
                  data.parcels[0];
               const coords = getDeliveryCoordinates(currentParcel);
               if (coords) setDeliveryLocation(coords);
            }
         });
      }
   }, [selectedHbl, data]);

   if (isLoading) {
      return (
         <View style={[styles.container, { paddingTop: insets.top, alignItems: "center", justifyContent: "center" }]}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={{ color: Colors.textSecondary, marginTop: 12 }}>Loading tracking details...</Text>
         </View>
      );
   }

   if (error || !data || !data.parcels?.length) {
      return (
         <View style={[styles.container, { paddingTop: insets.top, alignItems: "center", justifyContent: "center" }]}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.red} />
            <Text style={{ color: Colors.textPrimary, marginTop: 12 }}>Package not found</Text>
            <TouchableOpacity style={styles.backBtnSmall} onPress={() => router.back()}>
               <Text style={{ color: Colors.primary }}>Go Back</Text>
            </TouchableOpacity>
         </View>
      );
   }

   // Find the selected parcel
   const parcel = data.parcels.find((p: any) => p.hbl === selectedHbl || p.tracking_number === selectedHbl) || data.parcels[0];
   const orderId = data.orderId ?? data.order_id;
   const parcelWeight = parcel.weight || data.weight;
   const trackingNumber = parcel.hbl || parcel.tracking_number || selectedHbl;

   // Local DB is source of truth on device; fall back to API event photos when none stored locally
   const allPhotos = localPhotos.length > 0 ? localPhotos : (parcel.photos || []);
   const proofLocation = deliveryLocation ?? getDeliveryCoordinates(parcel);

   // Map real status to a visual config
   const timelineEvents = sortEventsNewestFirst(parcel.events || []);
   const lastEvent = getLatestEvent(parcel.events || []);
   const statusKey = getEventStatusKey(lastEvent, parcel.status || data.status);

   // Defensive check for STATUS_CONFIG
   const config = (STATUS_CONFIG as any)?.[statusKey] || STATUS_CONFIG["DEFAULT"];

   const TABS: { key: TabKey; label: string; icon: string }[] = [
      { key: "timeline", label: "Timeline", icon: "git-branch-outline" },
      { key: "details", label: "Details", icon: "cube-outline" },
      { key: "proof", label: "Proof", icon: "camera-outline" },
   ];

   return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
         <StatusBar barStyle="dark-content" />

         {/* Header */}
         <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
               <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
               <Text style={styles.headerTitle} numberOfLines={1}>
                  {parcel?.description || "Parcel Details"}
               </Text>
               <Text style={styles.headerTracking}>{trackingNumber}</Text>
            </View>
            <TouchableOpacity style={styles.shareBtn}>
               <Ionicons name="share-outline" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
         </View>

         {/* Parcel Selector if multiple exist */}
         {data.parcels.length > 1 && (
            <View style={styles.parcelSelector}>
               <Text style={[styles.selectorLabel, { color: Colors.textSecondary }]}>
                  Order contains {data.parcels.length} parcels:
               </Text>
               <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.selectorScroll}
               >
                  {data.parcels.map((p: any) => (
                     <TouchableOpacity
                        key={p.hbl}
                        style={[styles.selectorChip, selectedHbl === p.hbl && styles.selectorChipActive]}
                        onPress={() => setSelectedHbl(p.hbl)}
                     >
                        <Text style={[styles.selectorChipText, selectedHbl === p.hbl && styles.selectorChipTextActive]}>
                           {p.hbl}
                        </Text>
                     </TouchableOpacity>
                  ))}
               </ScrollView>
            </View>
         )}

         <View style={styles.statusHero}>
            <View
               style={[styles.statusIconBig, { backgroundColor: config.dimColor, borderColor: config.color + "40" }]}
            >
               <Ionicons name={config.icon as any} size={32} color={config.color} />
            </View>
            <Text style={[styles.statusBig, { color: config.color }]}>
               {getEventLabel(lastEvent || {})}
            </Text>
            <View style={styles.routeHero}>
               <View style={styles.routeHeroItem}>
                  <Text style={styles.routeHeroLabel}>Origin Agency</Text>
                  <Text style={styles.routeHeroValue}>{data.agency}</Text>
               </View>
               <View style={styles.routeHeroArrow}>
                  <Ionicons name="airplane" size={16} color={Colors.primary} />
               </View>
               <View style={[styles.routeHeroItem, { alignItems: "flex-end" }]}>
                  <Text style={styles.routeHeroLabel}>Destination</Text>
                  <Text style={styles.routeHeroValue}>
                     {typeof data.city === "object" ? data.city?.name : data.city},{" "}
                     {typeof data.province === "object" ? data.province?.name : data.province}
                  </Text>
               </View>
            </View>
         </View>

         {/* Tab Bar */}
         <View style={styles.tabs}>
            {TABS.map((t) => (
               <TouchableOpacity
                  key={t.key}
                  style={[styles.tab, tab === t.key && styles.tabActive]}
                  onPress={() => setTab(t.key)}
               >
                  <Ionicons name={t.icon as any} size={14} color={tab === t.key ? "#FFFFFF" : Colors.textMuted} />
                  <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
               </TouchableOpacity>
            ))}
         </View>

         <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {/* TIMELINE TAB */}
            {tab === "timeline" && (
               <View style={styles.timeline}>
                  {timelineEvents.map((event: any, idx: number, arr: any[]) => {
                        const dateObj = new Date(getEventTimestamp(event));
                        const month = dateObj.toLocaleDateString("en-US", { month: "short" });
                        const day = dateObj.getDate();
                        const timeStr = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                        const eventLabel = getEventLabel(event);
                        const eventSubtitle = getEventSubtitle(event);
                        const isFirst = idx === 0;
                        const isLast = idx === arr.length - 1;

                        return (
                           <View key={idx} style={styles.timelineRow}>
                              {/* Left rail: date + dot + line */}
                              <View style={styles.timelineLeft}>
                                 <Text style={[styles.timelineDateMonth, isFirst && { color: config.color }]}>
                                    {month}
                                 </Text>
                                 <Text style={[styles.timelineDateDay, isFirst && { color: config.color }]}>{day}</Text>
                                 <View
                                    style={[
                                       styles.timelineDot,
                                       isFirst
                                          ? {
                                               backgroundColor: config.color,
                                               borderColor: config.color,
                                               shadowColor: config.color,
                                               shadowOpacity: 0.4,
                                               shadowRadius: 6,
                                               elevation: 4,
                                            }
                                          : { backgroundColor: Colors.elevated, borderColor: Colors.cardBorder },
                                    ]}
                                 >
                                    {isFirst && <Ionicons name={config.icon as any} size={12} color="#fff" />}
                                 </View>
                                 {!isLast && (
                                    <View style={styles.timelineLineWrap}>
                                       <View
                                          style={[
                                             styles.timelineLine,
                                             isFirst
                                                ? { backgroundColor: config.color + "30" }
                                                : { backgroundColor: Colors.cardBorder },
                                          ]}
                                       />
                                    </View>
                                 )}
                              </View>

                              {/* Right card */}
                              <View
                                 style={[
                                    styles.timelineContent,
                                    isFirst && { backgroundColor: config.dimColor, borderColor: config.color + "30" },
                                 ]}
                              >
                                 <Text style={[styles.timelineStatus, isFirst && { color: config.color }]}>
                                    {eventLabel}
                                 </Text>
                                 {eventSubtitle != null && (
                                    <Text style={styles.timelineNotes} numberOfLines={2}>
                                       {eventSubtitle}
                                    </Text>
                                 )}
                                 <Text style={styles.timelineTime}>{timeStr}</Text>
                              </View>
                           </View>
                        );
                     })}
               </View>
            )}

            {/* DETAILS TAB */}
            {tab === "details" && (
               <View style={styles.detailsGrid}>
                  {[
                     { label: "Tracking HBL", value: trackingNumber, icon: "qr-code-outline" },
                     { label: "Description", value: parcel.description || '--', icon: "document-text-outline" },
                     { label: "Weight", value: parcelWeight ? `${parcelWeight} lbs` : '--', icon: "scale-outline" },
                     { label: "Order ID", value: orderId ? `#${orderId}` : '--', icon: "receipt-outline" },
                     { label: "Origin", value: typeof data.agency === 'object' ? (data.agency as any)?.name : data.agency || '--', icon: "business-outline" },
                     {
                        label: "Destination",
                        value: `${typeof data.city === "object" ? data.city?.name : data.city}, ${typeof data.province === "object" ? data.province?.name : data.province}`,
                        icon: "location-outline",
                     },
                  ].map((row) => (
                     <View key={row.label} style={styles.detailRow}>
                        <View style={styles.detailIconWrap}>
                           <Ionicons name={row.icon as any} size={16} color={Colors.textPrimary} />
                        </View>
                        <View style={{ flex: 1 }}>
                           <Text style={styles.detailLabel}>{row.label}</Text>
                           <Text style={styles.detailValue}>{row.value}</Text>
                        </View>
                     </View>
                  ))}
               </View>
            )}

            {/* PROOF TAB */}
            {tab === "proof" && (
               <View style={styles.proofWrap}>
                  {/* Delivery Map Section */}
                  {proofLocation && (
                     <View style={styles.mapSection}>
                        <View style={styles.sectionHeader}>
                           <Ionicons name="location" size={18} color={Colors.primary} />
                           <Text style={styles.sectionTitle}>Delivery Location</Text>
                        </View>
                        <TouchableOpacity
                           activeOpacity={0.9}
                           style={styles.mapContainer}
                           onPress={() => setIsMapModalVisible(true)}
                        >
                           <WebView
                              originWhitelist={["*"]}
                              scrollEnabled={false}
                              style={{ flex: 1, backgroundColor: "#000" }}
                              source={{
                                 html: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
                          <script src="https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.js"></script>
                          <link href="https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.css" rel="stylesheet" />
                          <style>
                            body { margin: 0; padding: 0; background: #000; }
                            #map { position: absolute; top: 0; bottom: 0; width: 100%; }
                            .marker {
                              background-color: ${Colors.cyan};
                              width: 14px;
                              height: 14px;
                              border-radius: 50%;
                              border: 3px solid #fff;
                              box-shadow: 0 0 15px ${Colors.cyan};
                              animation: pulse 2s infinite;
                            }
                            @keyframes pulse {
                              0% { transform: scale(1); opacity: 1; }
                              50% { transform: scale(1.5); opacity: 0.7; }
                              100% { transform: scale(1); opacity: 1; }
                            }
                          </style>
                        </head>
                        <body>
                          <div id="map"></div>
                          <script>
                          const map = new maplibregl.Map({
                                container: 'map',
                                style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
                                center: [${proofLocation.longitude}, ${proofLocation.latitude}],
                                zoom: 15,
                                interactive: false,
                                attributionControl: false
                              });
 
                              map.on('load', () => {
                                map.resize();
                                map.jumpTo({
                                  center: [${proofLocation.longitude}, ${proofLocation.latitude}],
                                  zoom: 15
                                });
                                
                                new maplibregl.Marker({ color: '${Colors.cyan}' })
                                  .setLngLat([${proofLocation.longitude}, ${proofLocation.latitude}])
                                  .addTo(map);
                              });
                            </script>
                          </body>
                          </html>
                        `,
                              }}
                           />
                           <LinearGradient colors={["rgba(0,0,0,0.6)", "transparent"]} style={styles.mapOverlay} />
                           <TouchableOpacity style={styles.expandMapBtn} onPress={() => setIsMapModalVisible(true)}>
                              <Ionicons name="expand-outline" size={16} color="#fff" />
                           </TouchableOpacity>
                        </TouchableOpacity>
                        <Text style={styles.mapHint}>Precise location where the package was delivered.</Text>
                     </View>
                  )}

                  <View style={styles.sectionHeader}>
                     <Ionicons name="camera" size={18} color={Colors.primary} />
                     <Text style={styles.sectionTitle}>Delivery Photos</Text>
                  </View>

                  {allPhotos.length > 0 ? (
                     <View style={styles.photoGrid}>
                        {allPhotos.map((p, i) => (
                           <TouchableOpacity
                              key={i}
                              style={styles.photoThumbWrap}
                              onPress={() => setSelectedPhotoIndex(i)}
                           >
                              <Image source={{ uri: p }} style={styles.photoThumb} />
                           </TouchableOpacity>
                        ))}
                     </View>
                  ) : (
                     <View style={styles.emptyProof}>
                        <Ionicons name="camera-outline" size={48} color={Colors.textMuted} />
                        <Text style={styles.emptyProofText}>No delivery photos available yet.</Text>
                        <Text style={styles.emptyProofSub}>
                           Proof of delivery will appear here once the package is delivered.
                        </Text>
                     </View>
                  )}
               </View>
            )}
         </ScrollView>

         {/* FULL SCREEN MAP MODAL */}
         <Modal visible={isMapModalVisible} animationType="slide" transparent={false}>
            <View style={{ flex: 1, backgroundColor: "#000" }}>
               {proofLocation && (
                  <WebView
                     originWhitelist={["*"]}
                     style={{ flex: 1 }}
                     source={{
                        html: `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
                    <script src="https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.js"></script>
                    <link href="https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.css" rel="stylesheet" />
                    <style>
                      body { margin: 0; padding: 0; background: #000; }
                      #map { position: absolute; top: 0; bottom: 0; width: 100%; }
                      .marker {
                        background-color: ${Colors.cyan};
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        border: 4px solid #fff;
                        box-shadow: 0 0 20px ${Colors.cyan};
                        animation: pulse 2s infinite;
                      }
                      @keyframes pulse {
                        0% { transform: scale(1); opacity: 1; }
                        50% { transform: scale(1.5); opacity: 0.7; }
                        100% { transform: scale(1); opacity: 1; }
                      }
                    </style>
                  </head>
                  <body>
                    <div id="map"></div>
                    <script>
                        const map = new maplibregl.Map({
                          container: 'map',
                          style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
                          center: [${proofLocation.longitude}, ${proofLocation.latitude}],
                          zoom: 16,
                          interactive: true,
                          attributionControl: false
                        });
 
                        map.on('load', () => {
                          map.resize();
                          map.jumpTo({
                            center: [${proofLocation.longitude}, ${proofLocation.latitude}],
                            zoom: 16
                          });
                          
                          new maplibregl.Marker({ color: '${Colors.cyan}' })
                            .setLngLat([${proofLocation.longitude}, ${proofLocation.latitude}])
                            .addTo(map);
                        });
                        
                        map.addControl(new maplibregl.NavigationControl());
                      </script>
                    </body>
                    </html>
                  `,
                     }}
                  />
               )}
               <TouchableOpacity
                  style={[styles.modalCloseBtn, { top: insets.top + 10 }]}
                  onPress={() => setIsMapModalVisible(false)}
               >
                  <Ionicons name="close" size={24} color="#fff" />
               </TouchableOpacity>
            </View>
         </Modal>

         {/* PHOTO GALLERY MODAL */}
         <Modal visible={selectedPhotoIndex !== null} animationType="fade" transparent={false}>
            <View style={{ flex: 1, backgroundColor: "#000" }}>
               <FlatList
                  data={allPhotos}
                  horizontal
                  pagingEnabled
                  initialScrollIndex={selectedPhotoIndex || 0}
                  getItemLayout={(data, index) => ({
                     length: width,
                     offset: width * index,
                     index,
                  })}
                  keyExtractor={(_, i) => i.toString()}
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item }) => (
                     <View style={{ width: width, height: "100%", justifyContent: "center" }}>
                        <Image source={{ uri: item }} style={{ width: "100%", height: "80%" }} resizeMode="contain" />
                     </View>
                  )}
               />
               <TouchableOpacity
                  style={[styles.modalCloseBtn, { top: insets.top + 10 }]}
                  onPress={() => setSelectedPhotoIndex(null)}
               >
                  <Ionicons name="close" size={24} color="#fff" />
               </TouchableOpacity>
               <View style={styles.galleryCounter}>
                  <Text style={styles.galleryCounterText}>
                     {(selectedPhotoIndex || 0) + 1} / {allPhotos.length}
                  </Text>
               </View>
            </View>
         </Modal>
      </View>
   );
}

function makeStyles(Colors: AppColors) {
   return StyleSheet.create({
      container: {
         flex: 1,
         backgroundColor: Colors.bg,
      },
      header: {
         flexDirection: "row",
         alignItems: "center",
         paddingHorizontal: Spacing.md,
         paddingVertical: Spacing.sm,
         gap: Spacing.sm,
      },
      backBtn: {
         width: 40,
         height: 40,
         borderRadius: 999,
         backgroundColor: Colors.elevated,
         alignItems: "center",
         justifyContent: "center",
      },
      backBtnSmall: {
         marginTop: 20,
         padding: 10,
      },
      headerTitle: {
         fontSize: 16,
         fontWeight: "700",
         color: Colors.textPrimary,
      },
      headerTracking: {
         fontSize: 11,
         color: Colors.textMuted,
         fontWeight: "500",
         letterSpacing: 0.5,
      },
      shareBtn: {
         width: 40,
         height: 40,
         borderRadius: 999,
         backgroundColor: Colors.elevated,
         alignItems: "center",
         justifyContent: "center",
      },
      statusHero: {
         alignItems: "center",
         paddingVertical: Spacing.lg,
         paddingHorizontal: Spacing.md,
         gap: Spacing.sm,
      },
      statusIconBig: {
         width: 72,
         height: 72,
         borderRadius: 999,
         borderWidth: 1,
         alignItems: "center",
         justifyContent: "center",
      },
      statusBig: {
         fontSize: 20,
         fontWeight: "800",
         letterSpacing: -0.3,
      },
      routeHero: {
         flexDirection: "row",
         alignItems: "center",
         backgroundColor: Colors.card,
         borderRadius: Radius.sm,
         padding: Spacing.md,
         width: "100%",
      },
      routeHeroItem: {
         flex: 1,
      },
      routeHeroLabel: {
         fontSize: 10,
         color: Colors.textMuted,
         fontWeight: "700",
         letterSpacing: 0.8,
         textTransform: "uppercase",
         marginBottom: 3,
      },
      routeHeroValue: {
         fontSize: 14,
         fontWeight: "700",
         color: Colors.textPrimary,
      },
      routeHeroArrow: {
         paddingHorizontal: Spacing.md,
      },
      tabs: {
         flexDirection: "row",
         marginHorizontal: Spacing.md,
         backgroundColor: Colors.elevated,
         borderRadius: Radius.sm,
         padding: 4,
         marginBottom: Spacing.md,
      },
      tab: {
         flex: 1,
         flexDirection: "row",
         alignItems: "center",
         justifyContent: "center",
         gap: 5,
         paddingVertical: 9,
         borderRadius: Radius.sm,
      },
      tabActive: {
         backgroundColor: Colors.primary,
      },
      tabText: {
         fontSize: 12,
         fontWeight: "600",
         color: Colors.textMuted,
      },
      tabTextActive: {
         color: "#FFFFFF",
      },
      body: {
         paddingHorizontal: Spacing.md,
         paddingBottom: 40,
      },
      timeline: {
         gap: 0,
         paddingLeft: 4,
      },
      timelineRow: {
         flexDirection: "row",
         gap: 14,
      },
      timelineLeft: {
         alignItems: "center",
         width: 50,
         paddingTop: 4,
      },
      timelineDateMonth: {
         fontSize: 10,
         fontWeight: "700",
         color: Colors.textMuted,
         letterSpacing: 0.5,
         textTransform: "uppercase",
      },
      timelineDateDay: {
         fontSize: 18,
         fontWeight: "800",
         color: Colors.textSecondary,
         marginBottom: 6,
         letterSpacing: -0.5,
      },
      timelineDot: {
         width: 28,
         height: 28,
         borderRadius: 14,
         borderWidth: 2,
         alignItems: "center",
         justifyContent: "center",
         zIndex: 1,
      },
      timelineLineWrap: {
         flex: 1,
         alignItems: "center",
         paddingVertical: 2,
      },
      timelineLine: {
         width: 2,
         flex: 1,
         borderRadius: 1,
         minHeight: 16,
      },
      timelineContent: {
         flex: 1,
         backgroundColor: Colors.card,
         borderRadius: Radius.sm,
         ...{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 3,
            elevation: 1,
         },
         borderWidth: 1,
         borderColor: Colors.cardBorder,
         padding: Spacing.md,
         marginBottom: Spacing.sm,
         gap: 6,
      },
      timelineStatus: {
         fontSize: 14,
         fontWeight: "700",
         color: Colors.textPrimary,
      },
      timelineNotes: {
         fontSize: 12,
         color: Colors.textSecondary,
         lineHeight: 16,
      },
      timelineTime: {
         fontSize: 12,
         color: Colors.textMuted,
         fontWeight: "500",
      },
      detailsGrid: {
         gap: Spacing.xs,
      },
      detailRow: {
         flexDirection: "row",
         alignItems: "center",
         backgroundColor: Colors.card,
         borderRadius: Radius.md,
         borderWidth: 1,
         borderColor: Colors.cardBorder,
         padding: Spacing.md,
         gap: Spacing.md,
      },
      detailIconWrap: {
         width: 36,
         height: 36,
         borderRadius: Radius.sm,
         backgroundColor: Colors.elevated,
         alignItems: "center",
         justifyContent: "center",
      },
      detailLabel: {
         fontSize: 11,
         color: Colors.textMuted,
         fontWeight: "600",
         textTransform: "uppercase",
         letterSpacing: 0.5,
         marginBottom: 3,
      },
      detailValue: {
         fontSize: 14,
         color: Colors.textPrimary,
         fontWeight: "600",
      },
      parcelSelector: {
         paddingHorizontal: Spacing.md,
         paddingBottom: Spacing.md,
      },
      selectorLabel: {
         fontSize: 12,
         fontWeight: "700",
         color: Colors.textSecondary,
         marginBottom: 10,
      },
      selectorScroll: {
         gap: Spacing.sm,
         paddingRight: 20,
      },
      selectorChip: {
         paddingHorizontal: 16,
         paddingVertical: 8,
         borderRadius: Radius.full,
         backgroundColor: Colors.card,
         borderWidth: 1,
         borderColor: Colors.cardBorder,
      },
      selectorChipActive: {
         backgroundColor: Colors.primary,
         borderColor: Colors.primary,
      },
      selectorChipText: {
         fontSize: 12,
         color: Colors.textMuted,
         fontWeight: "600",
      },
      selectorChipTextActive: {
         color: "#FFFFFF",
         fontWeight: "700",
      },
      proofWrap: {
         paddingTop: Spacing.sm,
         gap: Spacing.lg,
      },
      mapSection: {
         gap: Spacing.sm,
      },
      sectionHeader: {
         flexDirection: "row",
         alignItems: "center",
         gap: 8,
         marginBottom: 4,
      },
      sectionTitle: {
         fontSize: 14,
         fontWeight: "800",
         color: Colors.textPrimary,
         textTransform: "uppercase",
         letterSpacing: 0.5,
      },
      mapContainer: {
         height: 300,
         borderRadius: Radius.lg,
         overflow: "hidden",
         borderWidth: 1,
         borderColor: Colors.cardBorder,
         backgroundColor: "#000",
         position: "relative",
      },
      mapOverlay: {
         position: "absolute",
         top: 0,
         left: 0,
         right: 0,
         height: 40,
      },
      expandMapBtn: {
         position: "absolute",
         bottom: 12,
         right: 12,
         width: 36,
         height: 36,
         borderRadius: 18,
         backgroundColor: "rgba(0,0,0,0.5)",
         alignItems: "center",
         justifyContent: "center",
         borderWidth: 1,
         borderColor: "rgba(255,255,255,0.2)",
      },
      mapHint: {
         fontSize: 12,
         fontStyle: "italic",
         textAlign: "center",
         color: Colors.textSecondary,
      },
      modalCloseBtn: {
         position: "absolute",
         right: 20,
         width: 44,
         height: 44,
         borderRadius: 22,
         backgroundColor: "rgba(0,0,0,0.6)",
         alignItems: "center",
         justifyContent: "center",
         zIndex: 10,
      },
      galleryCounter: {
         position: "absolute",
         bottom: 40,
         width: "100%",
         alignItems: "center",
      },
      galleryCounterText: {
         color: "#fff",
         fontSize: 14,
         fontWeight: "700",
         backgroundColor: "rgba(0,0,0,0.5)",
         paddingHorizontal: 16,
         paddingVertical: 6,
         borderRadius: 20,
      },
      photoGrid: {
         flexDirection: "row",
         flexWrap: "wrap",
         gap: 12,
      },
      photoThumbWrap: {
         width: (width - 48 - 12) / 2,
         aspectRatio: 3 / 4,
         borderRadius: Radius.lg,
         overflow: "hidden",
         backgroundColor: Colors.card,
         borderWidth: 1,
         borderColor: Colors.cardBorder,
      },
      photoThumb: {
         width: "100%",
         height: "100%",
      },
      emptyProof: {
         alignItems: "center",
         justifyContent: "center",
         paddingVertical: 60,
         gap: 12,
      },
      emptyProofText: {
         fontSize: 16,
         fontWeight: "700",
         color: Colors.textPrimary,
      },
      emptyProofSub: {
         fontSize: 13,
         color: Colors.textMuted,
         textAlign: "center",
         paddingHorizontal: 40,
         lineHeight: 20,
      },
   });
}
