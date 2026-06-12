import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Spacing, Radius, AppColors } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Dashboard() {
   const router = useRouter();
   const insets = useSafeAreaInsets();
   const { Colors } = useTheme();
   const styles = makeStyles(Colors);

   return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
         {/* ── Header ── */}
         <View style={styles.header}>
            <View style={styles.headerLeft}>
               <View style={styles.logoWrap}>
                  <Ionicons name="cube" size={18} color={Colors.primary} />
               </View>
               <View>
                  <Text style={styles.headerTitle}>ATLAS</Text>
                  <Text style={styles.headerDate}>
                     {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </Text>
               </View>
            </View>
            <View style={styles.headerRight}>
               <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/settings" as any)}>
                  <Ionicons name="settings-outline" size={20} color={Colors.textSecondary} />
               </TouchableOpacity>
               <TouchableOpacity style={styles.iconBtn}>
                  <Ionicons name="notifications-outline" size={20} color={Colors.textSecondary} />
               </TouchableOpacity>
            </View>
         </View>

         <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
            {/* ── Quick Actions ── */}
            <View style={styles.mainActions}>
               <TouchableOpacity
                  style={[styles.actionCard, { flex: 1 }]}
                  onPress={() => router.push("/pallets" as any)}
                  activeOpacity={0.8}
               >
                  <View style={[styles.actionIcon, { backgroundColor: Colors.purpleDim }]}>
                     <Ionicons name="apps-outline" size={24} color={Colors.purple} />
                  </View>
                  <Text style={styles.actionLabel}>Pallet Builder</Text>
                  <Text style={styles.actionSub}>Create & Scan</Text>
               </TouchableOpacity>

               <TouchableOpacity
                  style={[styles.actionCard, { flex: 1 }]}
                  onPress={() => router.push("/dispatches" as any)}
                  activeOpacity={0.8}
               >
                  <View style={[styles.actionIcon, { backgroundColor: Colors.cyanDim }]}>
                     <Ionicons name="paper-plane-outline" size={22} color={Colors.primary} />
                  </View>
                  <Text style={styles.actionLabel}>Dispatch</Text>
                  <Text style={styles.actionSub}>Create & Scan</Text>
               </TouchableOpacity>
            </View>

            {/* ── Delivery Mode wide card ── */}
            <View style={[styles.mainActions, { marginTop: 12 }]}>
               <TouchableOpacity
                  style={styles.deliveryCard}
                  onPress={() => router.push("/delivery" as any)}
                  activeOpacity={0.8}
               >
                  <View style={[styles.actionIcon, { backgroundColor: Colors.greenDim, marginBottom: 0 }]}>
                     <Ionicons name="car-outline" size={26} color={Colors.green} />
                  </View>
                  <View style={{ flex: 1 }}>
                     <Text style={styles.actionLabel}>Delivery Mode</Text>
                     <Text style={styles.actionSub}>Local Scanning & Proof</Text>
                  </View>
                  <View style={styles.deliveryChevron}>
                     <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                  </View>
               </TouchableOpacity>
            </View>
         </ScrollView>

         {/* ── FAB ── */}
         <TouchableOpacity style={styles.fab} onPress={() => router.push("/scan" as any)}>
            <Ionicons name="scan-outline" size={24} color="#FFFFFF" />
         </TouchableOpacity>
      </View>
   );
}

function makeStyles(C: AppColors) {
   return StyleSheet.create({
      container: { flex: 1, backgroundColor: C.bg },
      header: {
         flexDirection: "row",
         justifyContent: "space-between",
         alignItems: "center",
         paddingHorizontal: Spacing.md,
         paddingVertical: Spacing.md,
      },
      headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
      logoWrap: {
         width: 36,
         height: 36,
         borderRadius: Radius.sm,
         backgroundColor: C.card,
         borderWidth: 1,
         borderColor: C.cardBorder,
         alignItems: "center",
         justifyContent: "center",
      },
      headerTitle: { fontSize: 18, fontWeight: "800", color: C.textPrimary, letterSpacing: 2 },
      headerDate: { fontSize: 11, color: C.textMuted, marginTop: 1 },
      headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
      iconBtn: {
         width: 40,
         height: 40,
         borderRadius: 999,
         backgroundColor: C.card,
         borderWidth: 1,
         borderColor: C.cardBorder,
         alignItems: "center",
         justifyContent: "center",
      },
      pillContainer: { flexDirection: "row", paddingHorizontal: Spacing.md, marginTop: 24, gap: 8 },
      pill: {
         flex: 1,
         height: 36,
         borderRadius: 999,
         backgroundColor: C.elevated,
         alignItems: "center",
         justifyContent: "center",
         borderWidth: 1,
         borderColor: C.cardBorder,
      },
      pillActive: { backgroundColor: C.primary, borderColor: C.primary },
      pillText: { color: C.textSecondary, fontSize: 13, fontWeight: "600" },
      pillTextActive: { color: "#FFFFFF", fontWeight: "700" },
      chartCard: {
         marginHorizontal: Spacing.md,
         marginTop: 24,
         backgroundColor: C.card,
         borderRadius: Radius.md,
         padding: 20,
         borderWidth: 1,
         borderColor: C.cardBorder,
      },
      sectionTitle: { fontSize: 16, fontWeight: "700", color: C.textPrimary, marginBottom: 16 },
      chartCircleWrapper: { alignItems: "center", marginVertical: 12 },
      chartCircle: {
         width: 160,
         height: 160,
         borderRadius: 80,
         borderWidth: 20,
         borderColor: C.green,
         borderTopColor: C.primary,
         borderRightColor: C.purple,
         borderBottomColor: C.amber,
         alignItems: "center",
         justifyContent: "center",
      },
      chartHole: {
         width: 118,
         height: 118,
         borderRadius: 59,
         backgroundColor: C.card,
         alignItems: "center",
         justifyContent: "center",
      },
      chartHoleLabel: { fontSize: 11, fontWeight: "700", color: C.textMuted, letterSpacing: 0.5 },
      recentSection: { paddingHorizontal: Spacing.md, marginTop: 24 },
      sectionHeader: {
         flexDirection: "row",
         justifyContent: "space-between",
         alignItems: "center",
         marginBottom: 12,
      },
      seeAll: { color: C.primary, fontSize: 13, fontWeight: "600" },
      listItem: {
         flexDirection: "row",
         alignItems: "center",
         backgroundColor: C.card,
         paddingVertical: 14,
         paddingHorizontal: 14,
         borderRadius: Radius.sm,
         marginBottom: 8,
         borderWidth: 1,
         borderColor: C.cardBorder,
      },
      listIconWrap: {
         width: 40,
         height: 40,
         borderRadius: Radius.sm,
         alignItems: "center",
         justifyContent: "center",
         marginRight: 12,
      },
      listContent: { flex: 1 },
      listTitle: { fontSize: 14, fontWeight: "700", color: C.textPrimary, marginBottom: 3 },
      listSub: { fontSize: 12, color: C.textMuted },
      listRight: { flexDirection: "row", alignItems: "center", gap: 4 },
      listAmount: { fontSize: 13, fontWeight: "700", color: C.textSecondary },
      emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
      emptyText: { fontSize: 14, color: C.textMuted },
      fab: {
         position: "absolute",
         bottom: 24,
         right: 24,
         width: 56,
         height: 56,
         borderRadius: 999,
         backgroundColor: C.primary,
         alignItems: "center",
         justifyContent: "center",
         shadowColor: C.primary,
         shadowOffset: { width: 0, height: 4 },
         shadowOpacity: 0.5,
         shadowRadius: 12,
         elevation: 8,
         zIndex: 999,
      },
      mainActions: { flexDirection: "row", gap: 12, paddingHorizontal: Spacing.md, marginTop: 20 },
      actionCard: {
         backgroundColor: C.card,
         padding: 18,
         borderRadius: Radius.md,
         borderWidth: 1,
         borderColor: C.cardBorder,
         overflow: "hidden",
      },
      deliveryCard: {
         flex: 1,
         flexDirection: "row",
         alignItems: "center",
         gap: 16,
         backgroundColor: C.card,
         padding: 18,
         borderRadius: Radius.md,
         borderWidth: 1,
         borderColor: C.cardBorder,
      },
      deliveryChevron: {
         width: 32,
         height: 32,
         borderRadius: 999,
         backgroundColor: C.cyanDim,
         alignItems: "center",
         justifyContent: "center",
      },
      actionIcon: {
         width: 46,
         height: 46,
         borderRadius: Radius.sm,
         alignItems: "center",
         justifyContent: "center",
         marginBottom: 14,
      },
      actionLabel: { fontSize: 15, fontWeight: "700", color: C.textPrimary },
      actionSub: { fontSize: 12, color: C.textMuted, fontWeight: "500", marginTop: 3 },
   });
}

function legendStyles(C: AppColors) {
   return StyleSheet.create({
      legendContainer: { marginTop: 8, gap: 10 },
      legendRow: {
         flexDirection: "row",
         justifyContent: "space-between",
         alignItems: "center",
         paddingVertical: 5,
         borderBottomWidth: 1,
         borderBottomColor: C.cardBorder,
      },
      legendItem: { flexDirection: "row", alignItems: "center", gap: 10 },
      legendDot: { width: 10, height: 10, borderRadius: 5 },
      legendText: { color: C.textSecondary, fontSize: 13, fontWeight: "500" },
      legendValue: { color: C.textPrimary, fontSize: 14, fontWeight: "700" },
   });
}
