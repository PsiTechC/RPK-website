import React from 'react';
import { Platform, View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '../lib/store';
import { Header } from '../components/Header';
import { Chatbot } from '../components/Chatbot';
import { ToastProvider } from '../components/Toast';
import { colors } from '../lib/theme';

// Hide scrollbars across the web app (scrolling still works) for a cleaner look.
if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('rpk-hide-scrollbar')) {
  const style = document.createElement('style');
  style.id = 'rpk-hide-scrollbar';
  style.textContent =
    '*{scrollbar-width:none;-ms-overflow-style:none}*::-webkit-scrollbar{display:none;width:0;height:0}';
  document.head.appendChild(style);
}

// Admin routes get their own full-screen dashboard chrome, so the public
// header / chatbot are hidden there.
function Shell() {
  const pathname = usePathname();
  const isAdmin = (pathname || '').startsWith('/admin');
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {!isAdmin && <Header />}
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'fade',
          }}
        />
      </View>
      {!isAdmin && <Chatbot />}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <ToastProvider>
          <Shell />
          <StatusBar style="dark" />
        </ToastProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
