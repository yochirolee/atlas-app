import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Image,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius, AppColors } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { STATUS_CONFIG, StatusKey } from '../constants/status';

export type HistoryItemType = 'parcel' | 'stop';

export interface HistoryRowProps {
  item: any;
  type: HistoryItemType;
  onPress?: () => void;
}

export function HistoryRow({ item, type, onPress }: HistoryRowProps) {
  const [expanded, setExpanded] = useState(false);
  const { Colors } = useTheme();
  const styles = makeStyles(Colors);
  const DEFAULT_STATUS = STATUS_CONFIG['DEFAULT'];

  let status: StatusKey = 'PENDING';
  if (type === 'stop') {
    const stopStatus = item.status?.toUpperCase();
    if (stopStatus === 'SYNCED') status = 'DELIVERED';
    else if (stopStatus === 'SYNCING') status = 'SYNCING';
    else if (stopStatus === 'PARTIAL') status = 'PARTIAL';
    else if (stopStatus === 'FAILED') status = 'ERROR';
    else status = 'PENDING_SYNC';
  } else {
    status = (item.status as StatusKey) || 'PENDING';
  }

  const config = STATUS_CONFIG[status] || DEFAULT_STATUS;

  const title =
    type === 'stop'
      ? `${item.scans?.length || 0} Packages`
      : item.order?.customer?.name || 'Package #' + (item.id || '');

  const subTitle =
    type === 'stop'
      ? `${new Date(item.created_at).toLocaleDateString()} • ${new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : item.tracking_number || 'No Tracking #';

  const destination =
    type === 'stop'
      ? `${item.photos?.length || 0} photos captured`
      : typeof item.order?.receiver?.city === 'object'
      ? item.order.receiver?.city?.name
      : item.order?.receiver?.city || 'No Destination';

  const handlePress = () => {
    if (type === 'stop') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpanded(!expanded);
    } else if (onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.row, expanded && styles.rowExpanded]}
      onPress={handlePress}
      activeOpacity={0.75}
    >
      <View style={styles.rowMain}>
        <View style={[styles.rowDot, { backgroundColor: config.dimColor }]}>
          <Ionicons name={config.icon as any} size={20} color={config.color} />
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: config.dimColor }]}>
              <Text style={[styles.statusText, { color: config.color }]}>
                {config.label.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.rowSubtitle}>{subTitle}</Text>
          <View style={styles.rowMeta}>
            <Ionicons
              name={type === 'stop' ? 'camera-outline' : 'location-outline'}
              size={11}
              color={Colors.textMuted}
            />
            <Text style={styles.rowMetaText} numberOfLines={1}>{destination}</Text>
          </View>
        </View>
        {type === 'parcel' || expanded ? (
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-forward'} size={16} color={Colors.textMuted} style={{ marginTop: 12 }} />
        ) : (
          <Ionicons name="chevron-down" size={16} color={Colors.textMuted} style={{ marginTop: 12 }} />
        )}
      </View>

      {expanded && type === 'stop' && (
        <View style={styles.expandedContent}>
          <View style={styles.divider} />
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>LOCATION</Text>
              <Text style={styles.detailValue}>
                {item.latitude?.toFixed(6)}, {item.longitude?.toFixed(6)}
              </Text>
            </View>
          </View>
          <View style={styles.hblList}>
            <Text style={styles.detailLabel}>PACKAGES</Text>
            <View style={styles.hblPills}>
              {item.scans?.map((s: any) => (
                <View key={s.id} style={styles.hblPill}>
                  <Text style={styles.hblPillText}>{s.hbl}</Text>
                </View>
              ))}
            </View>
          </View>
          {item.photos?.length > 0 && (
            <View style={styles.photoWrap}>
              <Text style={styles.detailLabel}>PHOTO PROOF ({item.photos.length})</Text>
              <FlatList
                horizontal
                data={item.photos}
                keyExtractor={(p, i) => i.toString()}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item: p }) => <Image source={{ uri: p }} style={styles.photoThumb} />}
                contentContainerStyle={{ gap: 10, marginTop: 8 }}
              />
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    row: {
      backgroundColor: C.card, borderRadius: Radius.sm,
      padding: Spacing.md, marginBottom: Spacing.sm,
      borderWidth: 1, borderColor: C.cardBorder,
    },
    rowExpanded: { borderColor: C.primary },
    rowMain: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
    rowDot: { width: 44, height: 44, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
    rowBody: { flex: 1, gap: 4 },
    rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rowTitle: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8, color: C.textPrimary },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    rowSubtitle: { fontSize: 12, fontWeight: '500', color: C.textSecondary },
    rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    rowMetaText: { fontSize: 12, flex: 1, color: C.textMuted },
    expandedContent: { marginTop: Spacing.md, gap: Spacing.md },
    divider: { height: 1, backgroundColor: C.cardBorder, marginVertical: 4 },
    detailsGrid: { flexDirection: 'row', gap: Spacing.md },
    detailItem: { flex: 1, gap: 4 },
    detailLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: C.textMuted },
    detailValue: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
    hblList: { gap: 6 },
    hblPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    hblPill: {
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
      backgroundColor: C.elevated, borderWidth: 1, borderColor: C.cardBorder,
    },
    hblPillText: { fontSize: 11, fontWeight: '600', color: C.textSecondary },
    photoWrap: { gap: 4 },
    photoThumb: { width: 100, height: 130, borderRadius: Radius.sm },
  });
}
