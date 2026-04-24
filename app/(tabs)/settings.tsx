import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadows } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { Alert, Linking } from 'react-native';
import { useLogOut, useDeleteAccount } from '../../hooks/useAuth';
import { useAppStore } from '../../stores/app-store';

export default function SettingsScreen() {
  const logoutMutation = useLogOut();
  const deleteAccountMutation = useDeleteAccount();
  const { user } = useAppStore();
  const router = useRouter();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://ctenvios.com/privacy').catch(() => {
      Alert.alert('Error', 'Could not open privacy policy link.');
    });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you absolutely sure? This action is permanent and cannot be undone. All your data will be cleared.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Permanently', 
          style: 'destructive',
          onPress: () => deleteAccountMutation.mutate()
        }
      ]
    );
  };

  const navigateToProfile = () => {
    router.push('/profile');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* User Summary Header */}
        <TouchableOpacity style={styles.userSummary} onPress={navigateToProfile}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <View style={styles.userSummaryText}>
            <Text style={styles.userName}>{user?.name || 'User Profile'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'View your details'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

       

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <TouchableOpacity style={styles.cardItem }>
            <View style={styles.cardIconWrap}>
              <Ionicons name="notifications" size={20} color={Colors.textPrimary} />
            </View>
            <Text style={styles.cardItemText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Privacy</Text>
          
          <TouchableOpacity style={styles.cardItem} onPress={handlePrivacyPolicy}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="shield-checkmark" size={20} color={Colors.textPrimary} />
            </View>
            <Text style={styles.cardItemText}>Privacy Policy</Text>
            <Ionicons name="open-outline" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.cardItem}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="help-circle" size={20} color={Colors.textPrimary} />
            </View>
            <Text style={styles.cardItemText}>Help Center</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

       
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity 
            style={[styles.cardItem, styles.logoutItem]} 
            onPress={handleLogout}
            disabled={logoutMutation.isPending}
          >
            <View style={[styles.cardIconWrap, styles.logoutIconWrap]}>
              <Ionicons name="log-out" size={20} color={Colors.red} />
            </View>
            <Text style={[styles.cardItemText, styles.logoutText]}>
              {logoutMutation.isPending ? 'Logging out...' : 'Log Out'}
            </Text>
          </TouchableOpacity>
        </View>

        

         <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>

          <TouchableOpacity 
            style={[styles.cardItem]} 
            onPress={handleDeleteAccount}
            disabled={deleteAccountMutation.isPending}
          >
            <View style={[styles.cardIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.05)' }]}>
              <Ionicons name="trash-outline" size={20} color={Colors.red} />
            </View>
            <Text style={[styles.cardItemText, { color: Colors.red }]}>
              {deleteAccountMutation.isPending ? 'Deleting...' : 'Delete Account'}
            </Text>
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
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: Colors.textPrimary,
  },
  userSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    ...Shadows.card,
    marginTop: 8,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  userSummaryText: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 2,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: Spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: Radius.sm,
    backgroundColor: Colors.card,
    marginBottom: 8,
    ...Shadows.subtle,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.elevated,
  },
  cardItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
    color: Colors.textPrimary,
  },
  logoutItem: {
    marginTop: 12,
  },
  logoutIconWrap: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  logoutText: {
    color: Colors.red,
  },
});
