import React from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index"><NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} /><NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="exposure"><NativeTabs.Trigger.Icon sf={{ default: 'chart.xyaxis.line', selected: 'chart.xyaxis.line' }} /><NativeTabs.Trigger.Label>History</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="analysis"><NativeTabs.Trigger.Icon sf={{ default: 'viewfinder', selected: 'viewfinder' }} /><NativeTabs.Trigger.Label>Strip</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="shifts"><NativeTabs.Trigger.Icon sf={{ default: 'clipboard', selected: 'clipboard.fill' }} /><NativeTabs.Trigger.Label>Shifts</NativeTabs.Trigger.Label></NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : null,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => isIOS ? <SymbolView name="house" tintColor={color} size={22} /> : <Feather name="home" size={20} color={color} /> }} />
      <Tabs.Screen name="exposure" options={{ title: 'History', tabBarIcon: ({ color }) => isIOS ? <SymbolView name="chart.xyaxis.line" tintColor={color} size={22} /> : <Feather name="activity" size={20} color={color} /> }} />
      <Tabs.Screen name="analysis" options={{ title: 'Strip', tabBarIcon: ({ color }) => isIOS ? <SymbolView name="viewfinder" tintColor={color} size={22} /> : <Feather name="search" size={20} color={color} /> }} />
      <Tabs.Screen name="shifts" options={{ title: 'Shifts', tabBarIcon: ({ color }) => isIOS ? <SymbolView name="clipboard" tintColor={color} size={22} /> : <Feather name="clipboard" size={20} color={color} /> }} />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}
