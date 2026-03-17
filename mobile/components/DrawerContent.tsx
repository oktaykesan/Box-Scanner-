import React from 'react';
import { View, Text, StyleSheet, Image, ImageBackground, TouchableOpacity } from 'react-native';
import ThemeToggle from './ThemeToggle';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, ScanLine, PlusSquare, PackageSearch, Settings, Menu } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '../constants/theme';

export default function DrawerContent(props: any) {
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();

    // Hardcoded connection status for Phase 4 UI
    const isConnected = true;

    const navItems = [
        { label: 'Ana Sayfa', path: '/', icon: Home },
        { label: 'Kutu Tara', path: '/scan', icon: ScanLine },
        { label: 'Yeni Kutu', path: '/camera', icon: PlusSquare },
        { label: 'Tüm Kutular', path: '/boxes', icon: PackageSearch },
        { label: 'Ayarlar', path: '/settings', icon: Settings },
    ];

    return (
        <ImageBackground
            source={require('../assets/lasersan-bg.png')}
            style={styles.container}
            imageStyle={styles.bgImageStyle}
            resizeMode="cover"
        >
            <View style={[styles.header, { paddingTop: insets.top + 48 }]}>
                <View style={styles.logoPlaceholder}>
                    <Image
                        source={require('../assets/lasersan-logo.png')}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                </View>
                <View style={styles.toggleWrapper}>
                    <ThemeToggle />
                </View>
            </View>

            <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContent} scrollEnabled={false}>
                <View style={styles.navContainer}>
                    {navItems.map((item, index) => {
                        const isActive = pathname === item.path;
                        const IconComponent = item.icon;

                        return (
                            <TouchableOpacity
                                key={index}
                                style={[styles.navItem, isActive && styles.navItemActive]}
                                onPress={() => {
                                    props.navigation.closeDrawer();
                                    router.navigate(item.path as any);
                                }}
                                activeOpacity={0.7}
                            >
                                <IconComponent
                                    color={isActive ? '#162444' : 'rgba(255,255,255,0.7)'}
                                    size={20}
                                    strokeWidth={2}
                                />
                                <Text style={[styles.navText, isActive && styles.navTextActive]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </DrawerContentScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
                <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: isConnected ? Colors.status.running : Colors.status.error }]} />
                    <Text style={styles.statusText}>
                        {isConnected ? 'Bağlantı Aktif' : 'Sunucu Bağlantısı Yok'}
                    </Text>
                </View>
                <Text style={styles.versionText}>BoxScan v1.0</Text>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.brand.navy,
    },
    bgImageStyle: {
        opacity: 0.14,
    },
    header: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.subtle,
        alignItems: 'flex-start',
    },
    logoPlaceholder: {
        width: 180,
        height: 44,
        justifyContent: 'center',
    },
    logoImage: {
        width: 180,
        height: 44,
    },
    toggleWrapper: {
        marginTop: 16,
    },
    scrollContent: {
        paddingTop: 16,
    },
    navContainer: {
        flex: 1,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 52,
        paddingHorizontal: 24,
        marginBottom: 4,
    },
    navItemActive: {
        backgroundColor: Colors.bg.surface,
        borderLeftWidth: 3,
        borderLeftColor: Colors.brand.red,
        paddingLeft: 21, // 24 - 3 offset
    },
    navText: {
        color: 'rgba(255,255,255,0.7)',
        fontFamily: Typography.fonts.h2,
        fontSize: Typography.sizes.body,
        marginLeft: 16,
        letterSpacing: 1,
    },
    navTextActive: {
        color: '#162444',  // dark navy on white active bg
    },
    footer: {
        paddingHorizontal: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        paddingTop: 16,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    statusText: {
        color: Colors.text.secondary,
        fontFamily: Typography.fonts.data,
        fontSize: 11,
        letterSpacing: 1,
    },
    versionText: {
        color: Colors.status.queue,
        fontFamily: Typography.fonts.data,
        fontSize: 11,
        letterSpacing: 1,
    },
});
