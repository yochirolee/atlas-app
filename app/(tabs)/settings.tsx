import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Linking } from 'react-native';
import { useLogOut, useDeleteAccount } from '../../hooks/useAuth';
import { useAppStore } from '../../stores/app-store';
import { useTheme } from '../../hooks/useTheme';
import { Spacing, Radius } from '../../constants/theme';

export default function SettingsScreen() {
  const logoutMutation = useLogOut();
  const deleteAccountMutation = useDeleteAccount();
  const { user, isDarkMode, toggleTheme } = useAppStore();
  const router = useRouter();
  const { Colors } = useTheme();

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
          onPress: () => deleteAccountMutation.mutate(),
        },
      ]
    );
  };

  const styles = makeStyles(Colors);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* User Summary */}
        <TouchableOpacity style={styles.userSummary} onPress={() => router.push('/profile' as any)}>
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

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          {/* Theme Toggle */}
          <View style={styles.cardItem}>
            <View style={[styles.cardIconWrap, { backgroundColor: isDarkMode ? Colors.elevated : Colors.chipBg }]}>
              <Ionicons
                name={isDarkMode ? 'moon' : 'sunny'}
                size={20}
                color={isDarkMode ? Colors.purple : Colors.amber}
              />
            </View>
            <View style={styles.themeTextWrap}>
              <Text style={styles.cardItemText}>Theme</Text>
              <Text style={styles.themeSubText}>{isDarkMode ? 'Dark' : 'Light'}</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: Colors.cardBorder, true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <TouchableOpacity style={styles.cardItem}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="notifications" size={20} color={Colors.textPrimary} />
            </View>
            <Text style={styles.cardItemText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Support & Privacy */}
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

        {/* Account */}
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

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <TouchableOpacity
            style={styles.cardItem}
            onPress={handleDeleteAccount}
            disabled={deleteAccountMutation.isPending}
          >
            <View style={[styles.cardIconWrap, { backgroundColor: Colors.redDim }]}>
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

function makeStyles(Colors: any) {
  return StyleSheet.create({
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
      borderWidth: 1,
      borderColor: Colors.cardBorder,
      marginTop: 8,
    },
    avatarCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: Colors.cyanDim,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      fontSize: 24,
      fontWeight: '700',
      color: Colors.primary,
    },
    userSummaryText: {
      flex: 1,
      marginLeft: 16,
    },
    userName: {
      fontSize: 17,
      fontWeight: '700',
      color: Colors.textPrimary,
    },
    userEmail: {
      fontSize: 13,
      color: Colors.textMuted,
      marginTop: 2,
    },
    section: {
      marginTop: 24,
      paddingHorizontal: Spacing.md,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      color: Colors.textMuted,
      marginLeft: 4,
    },
    cardItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: Radius.sm,
      backgroundColor: Colors.card,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: Colors.cardBorder,
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
      fontSize: 15,
      fontWeight: '500',
      marginLeft: 12,
      color: Colors.textPrimary,
    },
    themeTextWrap: {
      flex: 1,
      marginLeft: 12,
    },
    themeSubText: {
      fontSize: 12,
      color: Colors.textMuted,
      marginTop: 1,
    },
    logoutItem: {
      marginTop: 0,
    },
    logoutIconWrap: {
      backgroundColor: Colors.redDim,
    },
    logoutText: {
      color: Colors.red,
    },
  });
}
