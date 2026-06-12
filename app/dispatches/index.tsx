import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing, Radius, Shadows, AppColors } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import api from '../../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function DispatchList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { Colors } = useTheme();
  const styles = makeStyles(Colors);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dispatches'],
    queryFn: () => api.dispatch.get(0, 50),
  });

  const createMutation = useMutation({
    mutationFn: () => api.dispatch.create(),
    onSuccess: (newDispatch: any) => {
      queryClient.invalidateQueries({ queryKey: ['dispatches'] });
      if (newDispatch?.id) {
        router.push({ pathname: '/dispatches/[id]', params: { id: newDispatch.id.toString() } });
      }
    },
  });

  const dispatches = data?.rows || [];

  // Load-by-ID modal (receive flow)
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [dispatchIdInput, setDispatchIdInput] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  // Where to surface validation errors: the modal (typed ID) or an alert (card button)
  const errorSinkRef = useRef<'modal' | 'alert'>('modal');

  const reportLoadError = (msg: string): void => {
    if (errorSinkRef.current === 'modal') {
      setLoadError(msg);
    } else {
      Alert.alert('Cannot Receive', msg);
    }
  };

  const loadDispatchMutation = useMutation({
    mutationFn: (dispatch_id: number) => api.dispatch.getById(dispatch_id),
    onSuccess: (dispatch: any, dispatch_id: number) => {
      if (dispatch?.status === 'RECEIVED') {
        reportLoadError(`Dispatch #${dispatch_id} was already received.`);
        return;
      }
      if ((dispatch?.declared_parcels_count ?? 0) === 0) {
        reportLoadError(`Dispatch #${dispatch_id} has no parcels to receive.`);
        return;
      }
      setShowLoadModal(false);
      setDispatchIdInput('');
      setLoadError(null);
      router.push({ pathname: '/dispatches/receive' as any, params: { id: dispatch_id.toString() } });
    },
    onError: (err: any, dispatch_id: number) => {
      if (err?.response?.status === 404) {
        reportLoadError(`Dispatch #${dispatch_id} does not exist.`);
        return;
      }
      reportLoadError(err?.response?.data?.message || 'Failed to load dispatch.');
    },
  });

  const handleLoadDispatch = (): void => {
    const id = parseInt(dispatchIdInput.trim(), 10);
    if (isNaN(id) || id <= 0) {
      setLoadError('Enter a valid dispatch ID.');
      return;
    }
    setLoadError(null);
    errorSinkRef.current = 'modal';
    loadDispatchMutation.mutate(id);
  };

  const handleReceiveDispatch = (dispatch_id: number): void => {
    if (loadDispatchMutation.isPending) return;
    errorSinkRef.current = 'alert';
    loadDispatchMutation.mutate(dispatch_id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LOADING': return Colors.amber;
      case 'RECEIVED': return Colors.green;
      case 'SENT': return Colors.primary;
      default: return Colors.textMuted;
    }
  };

  const renderDispatch = ({ item }: { item: any }) => {
    const parcelCount = item.declared_parcels_count ?? item.parcels_count ?? item._count?.parcels ?? 0;
    const isReceivable = item.status !== 'RECEIVED';
    const isLoadingThis = loadDispatchMutation.isPending && loadDispatchMutation.variables === item.id;
    return (
      <TouchableOpacity
        style={styles.dispatchCard}
        onPress={() =>
          item.status === 'RECEIVED'
            ? router.push({ pathname: '/dispatches/details' as any, params: { id: item.id.toString() } })
            : router.push({ pathname: '/dispatches/[id]', params: { id: item.id.toString() } })
        }
        activeOpacity={0.8}
      >
        <View style={styles.dispatchIconWrap}>
          <Ionicons name="paper-plane" size={22} color={Colors.textPrimary} />
        </View>
        <View style={styles.dispatchInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.dispatchTitle}>Dispatch #{item.id}</Text>
            <View style={[styles.statusBadge, { 
              backgroundColor: getStatusColor(item.status) + '12',
            }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
            </View>
          </View>
          <Text style={styles.agencyText}>{item.sender_agency?.name || 'Unknown Agency'}</Text>
          <Text style={styles.dispatchSub}>
            {parcelCount} parcels • {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        {isReceivable ? (
          <TouchableOpacity
            style={[styles.receiveBtn, { backgroundColor: Colors.greenDim }]}
            onPress={() => handleReceiveDispatch(item.id)}
            disabled={loadDispatchMutation.isPending}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            {isLoadingThis ? (
              <ActivityIndicator size="small" color={Colors.green} />
            ) : (
              <Ionicons name="cloud-download-outline" size={20} color={Colors.green} />
            )}
          </TouchableOpacity>
        ) : (
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} style={{ marginLeft: 8 }} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dispatches</Text>
        <TouchableOpacity
          style={styles.headerReceiveBtn}
          onPress={() => {
            setLoadError(null);
            setDispatchIdInput('');
            setShowLoadModal(true);
          }}
        >
          <Ionicons name="cloud-download-outline" size={20} color={Colors.green} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : dispatches.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="paper-plane-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No Dispatches found</Text>
          <Text style={styles.emptySub}>Create a new dispatch to start receiving parcels.</Text>
          <TouchableOpacity 
            style={[styles.createBtnInline, { backgroundColor: Colors.primary }]}
            onPress={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            <Text style={[styles.createBtnText, { color: '#FFFFFF' }]}>Create First Dispatch</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={dispatches}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderDispatch}
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

      {/* Load dispatch by ID (receive) */}
      <Modal
        visible={showLoadModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowLoadModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalWrap}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowLoadModal(false)} />
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, { backgroundColor: Colors.greenDim }]}>
              <Ionicons name="cloud-download-outline" size={24} color={Colors.green} />
            </View>
            <Text style={styles.modalTitle}>Receive Dispatch</Text>
            <Text style={styles.modalSub}>Enter the ID of the dispatch you want to receive.</Text>
            <TextInput
              style={[styles.modalInput, loadError != null && { borderColor: Colors.red }]}
              value={dispatchIdInput}
              onChangeText={(t) => {
                setDispatchIdInput(t.replace(/[^0-9]/g, ''));
                setLoadError(null);
              }}
              placeholder="Dispatch ID"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              autoFocus
              returnKeyType="go"
              onSubmitEditing={handleLoadDispatch}
            />
            {loadError != null && (
              <Text style={styles.modalError}>{loadError}</Text>
            )}
            <TouchableOpacity
              style={[
                styles.modalLoadBtn,
                { backgroundColor: Colors.primary },
                (dispatchIdInput.trim() === '' || loadDispatchMutation.isPending) && { opacity: 0.5 },
              ]}
              onPress={handleLoadDispatch}
              disabled={dispatchIdInput.trim() === '' || loadDispatchMutation.isPending}
            >
              {loadDispatchMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.modalLoadBtnText}>Load Dispatch</Text>
              )}
            </TouchableOpacity>
            <View style={styles.modalDividerRow}>
              <View style={styles.modalDividerLine} />
              <Text style={styles.modalDividerText}>or</Text>
              <View style={styles.modalDividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.modalFreeBtn, { borderColor: Colors.cardBorder }]}
              onPress={() => {
                setShowLoadModal(false);
                setDispatchIdInput('');
                setLoadError(null);
                router.push('/dispatches/receive' as any);
              }}
            >
              <Ionicons name="scan-outline" size={18} color={Colors.textPrimary} />
              <Text style={[styles.modalFreeBtnText, { color: Colors.textPrimary }]}>
                Receive without dispatch
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowLoadModal(false)}>
              <Text style={[styles.modalCancelText, { color: Colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  headerReceiveBtn: { width: 44, height: 44, borderRadius: 999, backgroundColor: Colors.greenDim, alignItems: 'center', justifyContent: 'center' },
  receiveBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  modalWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: 24,
    alignItems: 'center',
    ...Shadows.elevated,
  },
  modalIconWrap: { width: 52, height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  modalSub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  modalInput: {
    width: '100%',
    marginTop: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: Radius.sm,
    backgroundColor: Colors.elevated,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 1,
  },
  modalError: { fontSize: 12, fontWeight: '600', color: Colors.red, marginTop: 8, textAlign: 'center' },
  modalLoadBtn: {
    width: '100%',
    marginTop: 16,
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLoadBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  modalDividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', marginTop: 16 },
  modalDividerLine: { flex: 1, height: 1, backgroundColor: Colors.cardBorder },
  modalDividerText: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  modalFreeBtn: {
    width: '100%',
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalFreeBtnText: { fontSize: 14, fontWeight: '700' },
  modalCancelBtn: { marginTop: 10, paddingVertical: 10, paddingHorizontal: 20 },
  modalCancelText: { fontSize: 14, fontWeight: '600' },
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
  dispatchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: Radius.sm,
    marginBottom: 10,
    backgroundColor: Colors.card,
    ...Shadows.subtle,
  },
  dispatchIconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    backgroundColor: Colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  dispatchInfo: { flex: 1 },
  dispatchTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
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
    color: Colors.textPrimary,
  },
  dispatchSub: { fontSize: 13, marginTop: 4, color: Colors.textSecondary },
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
}
