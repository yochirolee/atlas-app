import { Slot, useRouter, useSegments, useRootNavigationState } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/query-client';
import { useAppStore } from '../stores/app-store';

import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources or wait for navigation
SplashScreen.preventAutoHideAsync();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session } = useAppStore();
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    // Wait until navigation is ready before redirecting
    if (!rootNavigationState?.key) return;

    const inAuthGroup = segments[0] === 'login';

    const timer = setTimeout(() => {
      if (!session && !inAuthGroup) {
        router.replace('/login');
      } else if (session && inAuthGroup) {
        router.replace('/');
      }
      
      // Hide the splash screen once navigation is ready and redirected
      SplashScreen.hideAsync();
    }, 1);

    return () => clearTimeout(timer);
  }, [session, segments, rootNavigationState?.key]);

  // STABILIZATION: Return null until the root navigation state is ready.
  // This prevents child segments (like '(tabs)') from mounting premature routers.
  if (!rootNavigationState?.key) return null;

  return <>{children}</>;
}

import { registerBackgroundSync } from '../services/delivery-sync';
import { initDeliveryListeners } from '../services/delivery-listeners';
import { StatusBar } from 'react-native';

export default function RootLayout() {
  useEffect(() => {
    registerBackgroundSync();
    const cleanup = initDeliveryListeners();
    return () => cleanup?.();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard>
        <StatusBar barStyle="dark-content" />
        <Slot />
      </AuthGuard>
    </QueryClientProvider>
  );
}
