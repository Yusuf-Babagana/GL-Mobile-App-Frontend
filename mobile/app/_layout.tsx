// app/_layout.tsx
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ResponsiveFrame } from "@/components/ResponsiveFrame";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { WalletProvider } from "@/context/WalletContext";
import { OnboardingProvider } from "@/context/OnboardingContext";
import "@/lib/i18n";
import { loadSavedLanguage, default as i18n } from "@/lib/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Stack } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { LogBox, View } from "react-native";
import { I18nextProvider } from 'react-i18next';
import "../global.css";

if (typeof ErrorUtils !== 'undefined') {
  const originalHandler = ErrorUtils.getGlobalHandler && ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    console.debug('[Crash]', isFatal ? 'FATAL' : 'CAUGHT', error?.message || error);
    if (originalHandler) originalHandler(error, isFatal);
  });
}

SplashScreen.preventAutoHideAsync();

LogBox.ignoreLogs([
  "Expo Go",
  "The 'expo-notifications' libraries are not fully supported in Expo Go",
  "[Reanimated] Reading from `value` during component render",
  "[Reanimated] Writing to `value` during component render",
  "[Reanimated]",
]);

const queryClient = new QueryClient();

export default function RootLayout() {
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

  useEffect(() => {
    loadSavedLanguage().then((saved) => {
      if (saved && saved !== 'en') {
        i18n.changeLanguage(saved);
      }
      SplashScreen.hideAsync();
    });
  }, []);

  useEffect(() => {
    if (!isExpoGo) {
      try {
        const Notifications = require('expo-notifications');
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          }),
        });
      } catch (_) {}
    }
  }, [isExpoGo]);

  return (
    <AuthProvider>
      <WalletProvider>
        <OnboardingProvider>
          <CartProvider>
            <QueryClientProvider client={queryClient}>
              <I18nextProvider i18n={i18n}>
                <ResponsiveFrame>
                  <StatusBar style="dark" />
                  <ErrorBoundary>
                    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F8FAFC' }, animation: 'fade_from_bottom' }} />
                  </ErrorBoundary>
                </ResponsiveFrame>
              </I18nextProvider>
            </QueryClientProvider>
          </CartProvider>
        </OnboardingProvider>
      </WalletProvider>
    </AuthProvider>
  );
}
