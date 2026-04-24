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
import { Colors, Spacing, Radius, Shadows } from '../../constants/theme';
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

  const [sessionStats, setSessionStats] = useState({ total: 0, pending: 0, synced: 0 });
  const [isSyncing, setIsSyncing] = useState(false);

  const { data, isLoading, refetch } = useParcels({
    search: search || undefined,
    limit: 50
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
    { key: 'all', label: 'All', icon: 'list' },
    { key: 'PENDING_SYNC', label: 'Syncing', icon: 'cloud-upload' },
    { key: 'DELIVERED', label: 'Delivered', icon: 'checkmark-circle' },
    { key: 'IN_TRANSIT', label: 'Transit', icon: 'airplane' },
    { key: 'PENDING', label: 'Pending', icon: 'time' },
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

      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>History</Text>
          <Text style={styles.headerSub}>{ parcels.length} total shipments</Text>
        </View>
        
        {/* Session Actions */}
        {(sessionStats.total > 0) && (
          <View style={styles.sessionActions}>
            {sessionStats.pending > 0 && (
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.20)' }]} 
                onPress={handleSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={16} color="#3B82F6" />
                    <Text style={[styles.actionText, { color: '#3B82F6' }]}>{sessionStats.pending}</Text>
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
              style={[styles.actionBtn, { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.20)' }]} 
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

      {/* Status pills — Uber chip inversion */}
      <View>
        <FlatList
          horizontal
          data={statusOpts}
          keyExtractor={item => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pills}
          style={{ marginBottom: Spacing.sm, maxHeight: 50 }}
          renderItem={({ item: s }) => {
            const active = statusFilter === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                style={[
                    styles.pill, 
                    active && styles.pillActive
                ]}
                onPress={() => setStatusFilter(s.key)}
              >
                <Ionicons name={s.icon as any} size={13} color={active ? '#FFFFFF' : Colors.textMuted} />
                <Text style={[
                    styles.pillText, 
                    active && styles.pillTextActive
                ]}>{s.label}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

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
              <Ionicons name="time-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No shipments found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  sessionActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.bg,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '400',
  },
  pills: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    paddingBottom: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.chipBg,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pillActive: {
    backgroundColor: Colors.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 24,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
