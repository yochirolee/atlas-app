import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Shadows } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDailyClosing } from '../../hooks/useDailyClosing';

const { width } = Dimensions.get('window');

type Period = 'Week' | 'Month' | 'Year' | 'Custom';

const PERIOD_OPTIONS: Period[] = ['Week', 'Month', 'Year', 'Custom'];

// Dummy data for the bar chart
const BAR_DATA = [
  { label: 'Mon', value: 45 },
  { label: 'Tue', value: 88 },
  { label: 'Wed', value: 60 },
  { label: 'Thu', value: 38 },
  { label: 'Fri', value: 115 },
  { label: 'Sat', value: 134 },
  { label: 'Sun', value: 88 },
];

const MAX_VALUE = Math.max(...BAR_DATA.map(d => d.value));

export default function Finance() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>('Week');

  const { data: stats, isLoading } = useDailyClosing({
    period: period.toLowerCase() as any,
  });

  const formatCurrency = (val: number | undefined) => 
    (val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Statistics</Text>
        <TouchableOpacity style={styles.notifBtn}>
          <Ionicons name="calendar-outline" size={18} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        
        {/* Period Picker — Uber pill inversion */}
        <View style={styles.pillContainer}>
          {PERIOD_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.pill, 
                period === opt && styles.pillActive
              ]}
              onPress={() => setPeriod(opt)}
            >
              <Text style={[
                styles.pillText, 
                period === opt && styles.pillTextActive
              ]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chart Card */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Spending Trends</Text>
            <View style={styles.trendBadge}>
              <Ionicons name="arrow-up" size={12} color={Colors.red} />
              <Text style={styles.trendText}>20%</Text>
            </View>
          </View>

          {/* Bar Chart */}
          <View style={styles.chartArea}>
            {BAR_DATA.map((item, i) => {
              const heightPct = (item.value / MAX_VALUE) * 100;
              const isHighest = item.value === MAX_VALUE;
              return (
                <View key={item.label} style={styles.barCol}>
                  <Text style={styles.barLabel}>{item.label}</Text>
                  <View style={styles.barTrack}>
                    <View 
                      style={[
                        styles.barFill, 
                        { height: `${heightPct}%` },
                        isHighest && { opacity: 0.8 }
                      ]} 
                    />
                  </View>
                  <Text style={styles.barValue}>${item.value}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.insightBox}>
            <View style={styles.insightDot} />
            <Text style={styles.insightText}>
              You spent <Text style={{ fontWeight: '700', color: Colors.textPrimary }}>20% more</Text> this week compared to last week. Your top spending category is Shipping.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
          
          {isLoading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            [
              { label: 'Total Income', value: stats?.total_income || 0, icon: 'cash-outline', color: Colors.green },
              { label: 'Total Tax', value: stats?.total_tax || 0, icon: 'receipt-outline', color: Colors.purple },
              { label: 'Shipping Fees', value: stats?.total_shipping || 0, icon: 'airplane-outline', color: Colors.amber },
              { label: 'Other Fees', value: stats?.total_extra_fees || 0, icon: 'add-circle-outline', color: Colors.primary },
            ].map((item, i) => (
              <View key={item.label} style={styles.categoryItem}>
                <View style={styles.categoryLeft}>
                  <View style={styles.categoryIconWrap}>
                    <Ionicons name={item.icon as any} size={20} color={item.color} />
                  </View>
                  <View>
                    <Text style={styles.categoryTitle}>{item.label}</Text>
                    <Text style={styles.categorySub}>Current {period}</Text>
                  </View>
                </View>
                <View style={styles.categoryRight}>
                  <Text style={styles.categoryAmount}>
                    ${formatCurrency(item.value)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// Dummy mapping since we replaced PERIOD_DATA mapping
const PERIOD_DATA: Record<Period, any> = {
  Week: {},
  Month: {},
  Year: {},
  Custom: {}
};

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
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: Colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingBottom: 40,
  },

  /* Period Pills */
  pillContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    marginBottom: 24,
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
    backgroundColor: Colors.card,
    borderRadius: Radius.sm,
    padding: 24,
    marginBottom: 32,
    ...Shadows.card,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trendText: {
    color: Colors.red,
    fontSize: 13,
    fontWeight: '700',
  },
  chartArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 200,
    marginBottom: 24,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  barLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 8,
    fontWeight: '500',
  },
  barTrack: {
    width: 24,
    height: 140,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  barFill: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  barValue: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  insightBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    paddingTop: 16,
  },
  insightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  /* Category Section */
  section: {
    paddingHorizontal: Spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  categoryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    backgroundColor: Colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  categorySub: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  categoryRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  catTrendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  catTrendText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
});
