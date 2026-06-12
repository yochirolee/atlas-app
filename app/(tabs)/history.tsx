import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Spacing, Radius, AppColors } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useParcels } from '../../hooks/useParcels';

import { HistoryRow } from '../../components/HistoryRow';
import { STATUS_CONFIG } from '../../constants/status';
import { clearSynced, clearAll, getStopStats } from '../../services/delivery-db';
import { syncPendingDeliveries } from '../../services/delivery-sync';
import * as Haptics from 'expo-haptics';

export default function History() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { Colors } = useTheme();
  const styles = makeStyles(Colors);

  const [sessionStats, setSessionStats] = useState({ total: 0, pending: 0, synced: 0 });
  const [isSyncing, setIsSyncing] = useState(false);

  const { data, isLoading, refetch } = useParcels({
    search: search || undefined,
    limit: 50,
  });

  const refreshSession = async () => {
    const s = await getStopStats();
    setSessionStats(s);
  };

  React.useEffect(() => {
    refreshSession();
  }, [data]);

  const handleReset = async () => {
    await clearAll();
    await refreshSession();
    refetch();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const handleClearSynced = async () => {
    await clearSynced();
    await refreshSession();
    refetch();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncPendingDeliveries();
      await refreshSession();
      refetch();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSyncing(false);
    }
  };

  const [refreshing, setRefreshing] = useState(false);

  const statusOpts = [
    { key: 'all', label: 'All' },
    { key: 'PENDING_SYNC', label: 'Syncing' },
    { key: 'DELIVERED', label: 'Delivered' },
    { key: 'IN_TRANSIT', label: 'Transit' },
    { key: 'PENDING', label: 'Pending' },
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refreshSession()]);
    } finally {
      setRefreshing(false);
    }
  };

  const parcels = data?.rows || [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>History</Text>
          <Text style={styles.headerSub}>{parcels.length} total shipments</Text>
        </View>

        {sessionStats.total > 0 && (
          <View style={styles.sessionActions}>
            {sessionStats.pending > 0 && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: 'rgba(37,99,235,0.12)', borderColor: 'rgba(37,99,235,0.25)' }]}
                onPress={handleSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={16} color={Colors.primary} />
                    <Text style={[styles.actionText, { color: Colors.primary }]}>{sessionStats.pending}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {sessionStats.synced > 0 && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: Colors.elevated, borderColor: Colors.cardBorder }]}
                onPress={handleClearSynced}
              >
                <Ionicons name="brush-outline" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Colors.redDim, borderColor: 'rgba(239,68,68,0.25)' }]}
              onPress={handleReset}
            >
              <Ionicons name="trash-outline" size={16} color={Colors.red} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search shipments…"
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          selectionColor={Colors.primary}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Pills */}
      <FlatList
        horizontal
        data={statusOpts}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pills}
        style={{ marginBottom: Spacing.sm }}
        renderItem={({ item: s }) => {
          const active = statusFilter === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => setStatusFilter(s.key)}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={parcels.filter((o: any) => statusFilter === 'all' || o.status === statusFilter)}
          keyExtractor={(item: any) => item.id.toString()}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }: { item: any }) => (
            <HistoryRow
              item={item}
              type="parcel"
              onPress={() => {
                const hbl = item.tracking_number;
                if (hbl) router.push({ pathname: '/history/[id]', params: { id: hbl } });
              }}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="time-outline" size={32} color={Colors.textMuted} />
              </View>
              <Text style={styles.emptyText}>No shipments found</Text>
              <Text style={styles.emptySubText}>Try adjusting your search or filters</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: {
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
      flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    },
    sessionActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    actionBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1,
    },
    actionText: { fontSize: 13, fontWeight: '700' },
    headerTitle: { fontSize: 26, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.5 },
    headerSub: { fontSize: 12, color: C.textMuted, marginTop: 3 },
    searchWrap: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      backgroundColor: C.card, borderRadius: Radius.sm, borderWidth: 1,
      borderColor: C.cardBorder, marginHorizontal: Spacing.md,
      marginBottom: Spacing.sm, paddingHorizontal: Spacing.md, height: 48,
    },
    searchInput: { flex: 1, color: C.textPrimary, fontSize: 14, fontWeight: '500' },
    pills: { paddingHorizontal: Spacing.md, gap: 8, paddingBottom: 12, paddingTop: 2 },
    pill: {
      height: 36, alignItems: 'center', justifyContent: 'center',
      backgroundColor: C.elevated, borderRadius: 999,
      paddingHorizontal: 16, borderWidth: 1, borderColor: C.cardBorder,
    },
    pillActive: { backgroundColor: C.primary, borderColor: C.primary },
    pillText: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
    pillTextActive: { color: '#FFFFFF', fontWeight: '700' },
    list: { paddingHorizontal: Spacing.md, paddingBottom: 24, paddingTop: 4 },
    empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
    emptyIcon: {
      width: 72, height: 72, borderRadius: 999, backgroundColor: C.card,
      borderWidth: 1, borderColor: C.cardBorder,
      alignItems: 'center', justifyContent: 'center', marginBottom: 4,
    },
    emptyText: { fontSize: 16, color: C.textSecondary, fontWeight: '700' },
    emptySubText: { fontSize: 13, color: C.textMuted },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  });
}
