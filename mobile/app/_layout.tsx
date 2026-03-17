// BoxScan — Root Layout (Drawer Navigation + Lasersan Factory Theme)

import { useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Menu } from 'lucide-react-native';
import { Typography } from '../constants/theme';
import DrawerContent from '../components/DrawerContent';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import {
  useFonts,
  BarlowCondensed_500Medium,
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
} from '@expo-google-fonts/barlow-condensed';
import { DMMono_400Regular } from '@expo-google-fonts/dm-mono';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';

SplashScreen.preventAutoHideAsync();

function MenuButton({ navigation, color }: { navigation: any; color: string }) {
  return (
    <TouchableOpacity
      onPress={() => navigation.toggleDrawer()}
      style={{ paddingHorizontal: 16, height: '100%', justifyContent: 'center' }}
    >
      <Menu color={color} size={24} strokeWidth={2} />
    </TouchableOpacity>
  );
}

// Inner layout: reads theme from context so header/scene colors are reactive
function ThemedDrawer() {
  const { isDark, theme } = useTheme();

  const headerBg    = isDark ? theme.surface : '#FFFFFF';
  const headerBorder = isDark ? theme.border  : '#F1F5F9';
  const headerText   = isDark ? theme.text    : '#080E1F';
  const sceneBg      = isDark ? theme.bg      : '#FFFFFF';

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Drawer
        drawerContent={(props) => <DrawerContent {...props} />}
        screenOptions={({ navigation }) => ({
          drawerPosition: 'left',
          drawerType: 'front',
          drawerStyle: {
            width: 280,
            backgroundColor: '#162444', // navy stays regardless
          },
          overlayColor: 'rgba(0,0,0,0.7)',
          swipeEdgeWidth: 100,
          headerStyle: {
            backgroundColor: headerBg,
            borderBottomWidth: 1,
            borderBottomColor: headerBorder,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: headerText,
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: Typography.fonts.h1,
            fontSize: 18,
            letterSpacing: 1,
            color: headerText,
          },
          sceneStyle: {
            backgroundColor: sceneBg,
          },
          headerLeft: () => <MenuButton navigation={navigation} color={headerText} />,
        })}
      >
        <Drawer.Screen name="index"    options={{ title: 'ANA SAYFA' }} />
        <Drawer.Screen
          name="camera"
          options={{
            title: 'YENİ KUTU',
            headerTransparent: true,
            headerStyle: { backgroundColor: 'transparent', elevation: 0, borderBottomWidth: 0 },
          }}
        />
        <Drawer.Screen
          name="scan"
          options={{
            title: 'QR TARA',
            headerTransparent: true,
            headerStyle: { backgroundColor: 'transparent', elevation: 0, borderBottomWidth: 0 },
          }}
        />
        <Drawer.Screen name="review"   options={{ title: 'İÇERİK ONAYI' }} />
        <Drawer.Screen name="label"    options={{ title: 'QR ETİKET' }} />
        <Drawer.Screen name="box/[id]" options={{ title: 'KUTU DETAY' }} />
        <Drawer.Screen name="+not-found" options={{ title: 'SAYFA BULUNAMADI' }} />
        <Drawer.Screen name="boxes"   options={{ title: 'TÜM KUTULAR',   drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="settings" options={{ title: 'AYARLAR',       drawerItemStyle: { display: 'none' } }} />
      </Drawer>
    </>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    BarlowCondensed_500Medium,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    DMMono_400Regular,
    Inter_400Regular,
    Inter_500Medium,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <ThemeProvider>
      <ThemedDrawer />
    </ThemeProvider>
  );
}
