import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Shadows } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDashboard } from '../../hooks/useDashboard';
import { useParcels } from '../../hooks/useParcels';

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('Week');
  
  const { data: dashboard, isLoading: dashLoading } = useDashboard();
  const { data: parcelsData, isLoading: parcelsLoading }  = useParcels({ limit: 10 });

  const activeParcels = parcelsData?.rows || [];

  const formatCurrency = (val: number | undefined) => 
    (val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerDate}>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
      {/*   <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Outstanding</Text>
          {dashLoading ? (
            <ActivityIndicator color="#FFFFFF" style={{ alignSelf: 'flex-start', marginVertical: 10 }} />
          ) : (
            <Text style={styles.balanceAmount}>
              ${formatCurrency(dashboard?.totalOutstanding)}
            </Text>
          )}
          <View style={styles.balanceRow}>
            <View style={styles.balanceColumn}>
              <View style={styles.balanceSubRow}>
                <Ionicons name="arrow-down" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.balanceSubLabel}>Total Paid</Text>
              </View>
              <Text style={styles.balanceSubValue}>${formatCurrency(dashboard?.totalPaid)}</Text>
            </View>
            <View style={styles.balanceColumn}>
              <View style={styles.balanceSubRow}>
                <Ionicons name="arrow-up" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.balanceSubLabel}>Reports</Text>
              </View>
              <Text style={styles.balanceSubValue}>{dashboard?.activeShipments || 0}</Text>
            </View>
          </View>
        </View> */}

        <View style={styles.mainActions}>
          <TouchableOpacity 
            style={[styles.actionCard, { flex: 1 }]}
            onPress={() => router.push('/pallets')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.purpleDim }]}>
              <Ionicons name="apps-outline" size={24} color={Colors.purple} />
            </View>
            <View>
              <Text style={styles.actionLabel }>Pallet Builder</Text>
              <Text style={styles.actionSub}>Create & Scan</Text>
            </View>
          </TouchableOpacity>
 
          <TouchableOpacity 
            style={[styles.actionCard, { flex: 1 }]}
            onPress={() => router.push('/dispatches')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.elevated }]}>
              <Ionicons name="paper-plane-outline" size={22} color={Colors.textPrimary} />
            </View>
            <View>
              <Text style={styles.actionLabel}>Dispatch</Text>
              <Text style={styles.actionSub}>Create & Scan</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.mainActions, { marginTop: 12 }]}>
          <TouchableOpacity 
            style={[styles.actionCard, { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 20, borderColor: Colors.hoverGray, borderWidth: .8 }]}
            onPress={() => router.push('/delivery')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.greenDim, marginBottom: 0 }]}>
              <Ionicons name="car-outline" size={26} color={Colors.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionLabel}>Delivery Mode</Text>
              <Text style={styles.actionSub}>Local Scanning & Proof</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
 
        {/* Pill Toggles */}
        <View style={styles.pillContainer}>
          {['Week', 'Month', 'Year'].map((tab) => (
            <TouchableOpacity 
              key={tab} 
              style={[
                styles.pill, 
                activeTab === tab && styles.pillActive
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[
                styles.pillText, 
                activeTab === tab && styles.pillTextActive
              ]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Packages by Status</Text>
          {/* Donut Chart */}
          <View style={styles.chartCircleWrapper}>
            <View style={[styles.chartCircle, { borderColor: Colors.green, borderTopColor: Colors.primary, borderRightColor: Colors.purple, borderBottomColor: Colors.amber }]}>
              <View style={styles.chartHole} />
            </View>
          </View>
          
          <View style={legendStyles.legendContainer}>
            <View style={legendStyles.legendRow}>
              <View style={legendStyles.legendItem}>
                <View style={[legendStyles.legendDot, { backgroundColor: Colors.green }]} />
                <Text style={legendStyles.legendText}>Delivered</Text>
              </View>
              <Text style={legendStyles.legendValue}>12</Text>
            </View>
            <View style={legendStyles.legendRow}>
              <View style={legendStyles.legendItem}>
                <View style={[legendStyles.legendDot, { backgroundColor: Colors.primary }]} />
                <Text style={legendStyles.legendText}>In Transit</Text>
              </View>
              <Text style={legendStyles.legendValue}>8</Text>
            </View>
            <View style={legendStyles.legendRow}>
              <View style={legendStyles.legendItem}>
                <View style={[legendStyles.legendDot, { backgroundColor: Colors.purple }]} />
                <Text style={legendStyles.legendText}>Customs</Text>
              </View>
              <Text style={legendStyles.legendValue}>3</Text>
            </View>
            <View style={legendStyles.legendRow}>
              <View style={legendStyles.legendItem}>
                <View style={[legendStyles.legendDot, { backgroundColor: Colors.amber }]} />
                <Text style={legendStyles.legendText}>Pending Payment</Text>
              </View>
              <Text style={legendStyles.legendValue}>2</Text>
            </View>
          </View>
        </View>

        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity onPress={() => router.push('/history')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {parcelsLoading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : activeParcels.length === 0 ? (
            <Text style={{ color: Colors.textMuted, textAlign: 'center', marginVertical: 20 }}>No orders found</Text>
          ) : (
            activeParcels.slice(0, 5).map((parcel: any) => {
              const firstHbl = parcel.tracking_number;
              const isPaid = parcel.payment_status === 'PAID';
              return (
                <TouchableOpacity 
                   key={parcel.id} 
                  style={styles.listItem}
                  onPress={() => {
                    if (firstHbl) {
                      router.push({ pathname: '/history/[id]', params: { id: firstHbl } });
                    }
                  }}
                >
                  <View style={styles.listIconWrap}>
                    <Ionicons name={isPaid ? "checkmark-circle" : "alert-circle"} size={20} color={isPaid ? Colors.green : Colors.amber} />
                  </View>
                  <View style={styles.listContent}>
                    <Text style={styles.listTitle}>{parcel.customer?.name || 'Order #' + parcel.id}</Text>
                    <Text style={styles.listSub}>
                      {typeof parcel.receiver?.city === 'object' ? parcel.receiver?.city?.name : (parcel.receiver?.city || 'No Destination')}
                    </Text>
                  </View>
                  <Text style={styles.listAmount}>
                    ${formatCurrency(parcel.weight)}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/scan')}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerDate: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: Colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Balance Card — Uber Black hero */
  balanceCard: {
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    padding: 24,
    marginTop: 8,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 24,
    letterSpacing: -1,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceColumn: {
    flex: 1,
  },
  balanceSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  balanceSubLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  balanceSubValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  /* Period Pills — Uber chip inversion */
  pillContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    marginTop: 24,
    gap: 8,
  },
  pill: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    backgroundColor: Colors.chipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: Colors.primary,
  },
  pillText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },

  /* Chart Card */
  chartCard: {
    marginHorizontal: Spacing.md,
    marginTop: 24,
    backgroundColor: Colors.card,
    borderRadius: Radius.sm,
    padding: 24,
    ...Shadows.card,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  chartCircleWrapper: {
    alignItems: 'center',
    marginVertical: 16,
  },
  chartCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 20,
    borderColor: Colors.green,
    borderTopColor: Colors.primary,
    borderRightColor: Colors.purple,
    borderBottomColor: Colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartHole: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.bg,
  },

  /* Recent Orders */
  recentSection: {
    paddingHorizontal: Spacing.md,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAll: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: Radius.sm,
    marginBottom: 8,
    ...Shadows.subtle,
  },
  listIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    backgroundColor: Colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listContent: {
    flex: 1,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  listSub: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  listAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  /* FAB — Uber Black pill */
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.elevated,
    zIndex: 999,
  },

  /* Action Cards */
  mainActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: Spacing.md,
    marginTop: 20,
  },
  actionCard: {
    backgroundColor: Colors.card,
    padding: 24,
    borderRadius: Radius.sm,
    ...Shadows.card,
    overflow: 'hidden',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  actionSub: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
    marginTop: 4,
  },
});

const legendStyles = StyleSheet.create({
  legendContainer: {
    marginTop: 16,
    gap: 12,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  legendValue: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});
