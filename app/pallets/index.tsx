import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, Shadows } from '../../constants/theme';
import api from '../../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function PalletList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pallets'],
    queryFn: () => api.pallets.get(0, 50),
  });

  const createMutation = useMutation({
    mutationFn: () => api.pallets.create(),
    onSuccess: (newPallet) => {
      queryClient.invalidateQueries({ queryKey: ['pallets'] });
      if (newPallet?.id) {
        router.push({ pathname: '/pallets/[id]', params: { id: newPallet.id.toString() } });
      }
    },
  });

  const pallets = data?.rows || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return Colors.green;
      case 'CLOSED': return Colors.amber;
      default: return Colors.textMuted;
    }
  };

  const renderPallet = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.palletCard}
      onPress={() => router.push({ pathname: '/pallets/[id]', params: { id: item.id.toString() } })}
      activeOpacity={0.8}
    >
      <View style={[styles.palletIconWrap, { backgroundColor: Colors.purpleDim }]}>
        <Ionicons name="apps" size={22} color={Colors.purple} />
      </View>
      <View style={styles.palletInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.palletTitle}>Pallet #{item.id}</Text>
          <View style={[styles.statusBadge, { 
            backgroundColor: getStatusColor(item.status) + '12',
          }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={[styles.agencyText, { color: Colors.purple }]}>{item.agency?.name || 'Unknown Agency'}</Text>
        <Text style={styles.palletSub}>
          {item.parcels_count ?? item.parcel_count ?? item._count?.parcels ?? 0} parcels • {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pallets</Text>
        <View style={{ width: 44 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : pallets.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="apps-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No Pallets found</Text>
          <Text style={styles.emptySub}>Create a new pallet to start scanning parcels into it.</Text>
          <TouchableOpacity 
            style={[styles.createBtnInline, { backgroundColor: Colors.primary }]}
            onPress={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            <Text style={[styles.createBtnText, { color: '#FFFFFF' }]}>Create First Pallet</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={pallets}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPallet}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.primary} />
          }
        />
      )}

      {/* FAB — Uber Black */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: Colors.primary }]}
        onPress={() => createMutation.mutate()}
        disabled={createMutation.isPending}
        activeOpacity={0.85}
      >
        {createMutation.isPending ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Ionicons name="add" size={28} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginTop: 16 },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  createBtnInline: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
  },
  createBtnText: { fontWeight: '600', fontSize: 15 },
  listContent: { padding: Spacing.md, paddingBottom: 100 },
  palletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: Radius.sm,
    marginBottom: 10,
    ...Shadows.subtle,
  },
  palletIconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  palletInfo: { flex: 1 },
  palletTitle: { fontSize: 16, fontWeight: '700' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  agencyText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  palletSub: { fontSize: 13, marginTop: 4 },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.elevated,
  },
});
