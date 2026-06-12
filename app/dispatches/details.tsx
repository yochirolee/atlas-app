import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing, Radius, Shadows, AppColors } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import api from '../../services/api';
import { useQuery } from '@tanstack/react-query';

export default function DispatchDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatchId = parseInt(id);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { Colors } = useTheme();
  const styles = makeStyles(Colors);

  const { data: dispatch, isLoading: loadingDispatch, refetch: refetchDispatch } = useQuery({
    queryKey: ['dispatch', dispatchId],
    queryFn: () => api.dispatch.getById(dispatchId),
  });

  const { data: parcelsData, isLoading: loadingParcels, refetch: refetchParcels } = useQuery({
    queryKey: ['dispatch-parcels', dispatchId],
    queryFn: () => api.dispatch.getParcelsByDispatchId(dispatchId, 0, 500),
  });

  const parcels: any[] = parcelsData?.rows || [];
  const isLoading = loadingDispatch || loadingParcels;

  const getStatusColor = (status?: string): string => {
    switch (status) {
      case 'LOADING': return Colors.amber;
      case 'RECEIVED': return Colors.green;
      case 'SENT':
      case 'DISPATCHED': return Colors.primary;
      default: return Colors.textMuted;
    }
  };

  const formatDate = (value?: string): string =>
    value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '--';

  const statusColor = getStatusColor(dispatch?.status);

  const renderParcel = ({ item }: { item: any }) => (
    <View style={styles.parcelRow}>
      <View style={[styles.parcelIconWrap, { backgroundColor: Colors.elevated }]}>
        <Ionicons name="cube-outline" size={18} color={Colors.textPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.parcelTracking} numberOfLines={1}>{item.tracking_number}</Text>
        <Text style={styles.parcelSub} numberOfLines={1}>
          {[item.description, item.weight ? `${item.weight} lbs` : null, item.agency?.name]
            .filter(Boolean)
            .join(' • ') || 'No description'}
        </Text>
      </View>
      <View style={[styles.parcelStatusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
        <Text style={[styles.parcelStatusText, { color: getStatusColor(item.status) }]}>
          {String(item.status || '').replace(/_/g, ' ')}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dispatch #{dispatchId}</Text>
        <View style={{ width: 44 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={parcels}
          keyExtractor={(item) => item.id?.toString() || item.tracking_number}
          renderItem={renderParcel}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => { refetchDispatch(); refetchParcels(); }}
              tintColor={Colors.primary}
            />
          }
          ListHeaderComponent={
            <View>
              {/* Status hero */}
              <View style={styles.heroCard}>
                <View style={[styles.heroIconWrap, { backgroundColor: statusColor + '15' }]}>
                  <Ionicons
                    name={dispatch?.status === 'RECEIVED' ? 'checkmark-done' : 'paper-plane'}
                    size={26}
                    color={statusColor}
                  />
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                  <Text style={[styles.statusBadgeText, { color: statusColor }]}>{dispatch?.status || '--'}</Text>
                </View>
                <View style={styles.heroStatsRow}>
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatVal}>{dispatch?.declared_parcels_count ?? parcels.length}</Text>
                    <Text style={styles.heroStatLab}>Declared</Text>
                  </View>
                  <View style={styles.heroStatDivider} />
                  <View style={styles.heroStat}>
                    <Text style={[styles.heroStatVal, { color: Colors.green }]}>
                      {dispatch?.received_parcels_count ?? 0}
                    </Text>
                    <Text style={styles.heroStatLab}>Received</Text>
                  </View>
                  <View style={styles.heroStatDivider} />
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatVal}>{dispatch?.declared_weight ?? '--'}</Text>
                    <Text style={styles.heroStatLab}>Weight (lbs)</Text>
                  </View>
                </View>
              </View>

              {/* Info card */}
              <View style={styles.infoCard}>
                <InfoRow label="Payment status" value={dispatch?.payment_status || '--'} styles={styles} />
                <View style={styles.infoDivider} />
                <InfoRow label="Created" value={formatDate(dispatch?.created_at)} styles={styles} />
                <View style={styles.infoDivider} />
                <InfoRow label="Last update" value={formatDate(dispatch?.updated_at)} styles={styles} />
              </View>

              <Text style={styles.sectionTitle}>Parcels ({parcels.length})</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="cube-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No parcels in this dispatch</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  styles: ReturnType<typeof makeStyles>;
}

function InfoRow({ label, value, styles }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function makeStyles(Colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.md,
      height: 56,
    },
    backBtn: { width: 44, height: 44, borderRadius: 999, backgroundColor: Colors.elevated, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    listContent: { padding: Spacing.md, paddingBottom: 40 },

    heroCard: {
      backgroundColor: Colors.card,
      borderRadius: Radius.md,
      padding: 24,
      alignItems: 'center',
      marginBottom: 12,
      ...Shadows.subtle,
    },
    heroIconWrap: { width: 56, height: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
    statusBadgeText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    heroStatsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, width: '100%' },
    heroStat: { flex: 1, alignItems: 'center' },
    heroStatVal: { fontSize: 22, fontWeight: '900', color: Colors.textPrimary },
    heroStatLab: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', marginTop: 4 },
    heroStatDivider: { width: 1, height: 32, backgroundColor: Colors.cardBorder },

    infoCard: {
      backgroundColor: Colors.card,
      borderRadius: Radius.md,
      paddingHorizontal: 16,
      marginBottom: 20,
      ...Shadows.subtle,
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
    infoLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
    infoValue: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
    infoDivider: { height: 1, backgroundColor: Colors.cardBorder },

    sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginBottom: 10 },

    parcelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: Colors.card,
      borderRadius: Radius.sm,
      padding: 14,
      marginBottom: 8,
      ...Shadows.subtle,
    },
    parcelIconWrap: { width: 38, height: 38, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
    parcelTracking: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 0.3 },
    parcelSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    parcelStatusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
    parcelStatusText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },

    emptyWrap: { alignItems: 'center', paddingVertical: 48, gap: 12 },
    emptyText: { fontSize: 14, color: Colors.textSecondary },
  });
}
