import { Geist_400Regular, Geist_500Medium, useFonts } from '@expo-google-fonts/geist';
import { QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LiveUpdatesProvider } from '@/data/LiveUpdates';
import { createQueryClient } from '@/data/queryClient';
import { SelectionProvider } from '@/selection/SelectionContext';

// The splash screen stays up until Geist is ready, so text never changes font on screen.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  const [fontsLoaded] = useFonts({ Geist_400Regular, Geist_500Medium });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <SelectionProvider>
          <LiveUpdatesProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </LiveUpdatesProvider>
        </SelectionProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
