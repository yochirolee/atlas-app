import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../stores/app-store';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Shadows } from '../constants/theme';

export default function ProfileScreen() {
  const { user, agency } = useAppStore();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Profile</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Profile Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'Unknown User'}</Text>
          <Text style={styles.userRole}>{user?.role || 'Guest'} • {user?.email}</Text>
        </View>

        {/* Agency Information Card */}
        {agency && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Agency Information</Text>
            
            <View style={styles.card}>
              <View style={styles.agencyHeaderRow}>
                {agency.logo ? (
                  <Image source={{ uri: agency.logo }} style={styles.agencyLogo} resizeMode="contain" />
                ) : (
                  <View style={styles.iconWrap}>
                    <Ionicons name="business" size={24} color={Colors.primary} />
                  </View>
                )}
                <View style={styles.agencyHeaderText}>
                  <Text style={styles.cardTitle}>{agency.name}</Text>
                  <Text style={styles.cardSub}>{agency.agency_type}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={20} color={Colors.textMuted} />
                <Text style={styles.infoText}>{agency.address}</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={20} color={Colors.textMuted} />
                <Text style={styles.infoText}>{agency.contact}</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={20} color={Colors.textMuted} />
                <Text style={styles.infoText}>{agency.phone}</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={20} color={Colors.textMuted} />
                <Text style={styles.infoText}>{agency.email}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Account Settings dummy options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <TouchableOpacity style={styles.actionItem}>
            <Text style={styles.actionItemText}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem}>
            <Text style={styles.actionItemText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: Colors.elevated,
  },
  avatarInitial: {
    fontSize: 40,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    color: Colors.textPrimary,
  },
  userRole: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: Spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: Colors.textMuted,
  },
  card: {
    borderRadius: Radius.md,
    padding: 20,
    backgroundColor: Colors.card,
    ...Shadows.card,
  },
  agencyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  agencyLogo: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    marginRight: 16,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  agencyHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardSub: {
    fontSize: 13,
    marginTop: 2,
    textTransform: 'capitalize',
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    marginBottom: 16,
    backgroundColor: Colors.cardBorder,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    marginLeft: 12,
    flex: 1,
    color: Colors.textPrimary,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: Radius.sm,
    marginBottom: 8,
    backgroundColor: Colors.card,
    ...Shadows.subtle,
  },
  actionItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
});
