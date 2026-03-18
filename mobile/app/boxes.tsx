// BoxScan — HomeScreen: Recent boxes + search + FAB (Lasersan Factory V5)

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    StyleSheet, ActivityIndicator, RefreshControl, Image,
    Platform, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Search, Package, Plus, QrCode, CheckCircle2, Clock, Inbox, X } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius, Shadow } from '../constants/theme';
import { Config } from '../constants/config';
import BoxCardThumbnail from '../components/BoxCardThumbnail';
import { getBoxes, type Box } from '../services/api';
import { useThemeColors } from '../constants/useThemeColors';

export default function BoxesScreen() {
    const router = useRouter();
    const tc = useThemeColors();

    const [boxes, setBoxes] = useState<Box[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [total, setTotal] = useState(0);
    const [loadError, setLoadError] = useState<string | null>(null);
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const searchRef = useRef(search);
    searchRef.current = search;

    const loadBoxes = useCallback(async (searchTerm?: string, isSearch = false) => {
        setLoadError(null);
        try {
            const data = await getBoxes({ search: searchTerm || undefined, limit: 50 });
            setBoxes(data.boxes);
            setTotal(data.total);
        } catch (err: any) {
            setLoadError('Sunucuya bağlanılamadı');
        } finally {
            setLoading(false);
            setRefreshing(false);
            if (isSearch) setSearching(false);
        }
    }, []);

    // Reload on screen focus
    useFocusEffect(
        useCallback(() => {
            loadBoxes(searchRef.current);
        }, [loadBoxes])
    );

    const onSearch = (text: string) => {
        setSearch(text);
        setSearching(true);
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            loadBoxes(text, true);
        }, 350);
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadBoxes(search);
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
    };

    const styles = useMemo(() => StyleSheet.create({
        container: { flex: 1, backgroundColor: tc.bgApp },

        searchContainer: {
            paddingHorizontal: Spacing.space4,
            paddingTop: Spacing.space2,
            paddingBottom: Spacing.space2,
        },
        searchBox: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: tc.searchBg,
            borderWidth: 1,
            borderColor: tc.borderSubtle,
            borderRadius: BorderRadius.default,
            paddingHorizontal: Spacing.space3,
        },
        searchIcon: {
            marginRight: Spacing.space2,
        },
        searchInput: {
            flex: 1,
            color: tc.textPrimary,
            fontFamily: Typography.fonts.body,
            fontSize: Typography.sizes.bodyDense,
            paddingVertical: Spacing.space3,
        },

        statsRow: {
            paddingHorizontal: Spacing.space4,
            paddingBottom: Spacing.space3,
        },
        statsText: {
            color: tc.textSecondary,
            fontFamily: Typography.fonts.data,
            fontSize: Typography.sizes.caption,
            letterSpacing: 1,
        },

        rowStyle: {
            gap: 12,
            paddingHorizontal: 16,
        },

        card: {
            flex: 1,
            backgroundColor: tc.cardBg,
            borderRadius: BorderRadius.default,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: tc.borderSubtle,
            borderTopWidth: 3,
            borderTopColor: Colors.brand.navy,
            position: 'relative',
            overflow: 'hidden',
        },
        cardContent: {
            padding: Spacing.space3,
            alignItems: 'center',
        },

        thumbnail: {
            width: '100%',
            aspectRatio: 4 / 3,
            borderRadius: 0,
            backgroundColor: tc.bgElevated,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: tc.borderSubtle,
            marginBottom: Spacing.space3,
            marginTop: Spacing.space2,
        },

        cardInfo: {
            width: '100%',
            alignItems: 'center',
        },
        cardTitle: {
            color: tc.textPrimary,
            fontFamily: Typography.fonts.h1,
            fontSize: 18,
            textTransform: 'uppercase',
            textAlign: 'center',
            marginBottom: 4,
        },
        cardData: {
            color: tc.textPrimary,
            fontFamily: Typography.fonts.data,
            fontSize: Typography.sizes.caption,
        },
        cardLocation: {
            color: tc.textSecondary,
            fontFamily: Typography.fonts.data,
            fontSize: 10,
            marginTop: 2,
        },

        alertBadgeRow: {
            position: 'absolute',
            top: 6,
            left: 6,
            flexDirection: 'column',
            gap: 2,
            zIndex: 10,
        },
        damageBadge: {
            backgroundColor: '#D97706',
            paddingHorizontal: 4,
            paddingVertical: 2,
            borderRadius: 2,
        },
        hazardBadge: {
            backgroundColor: '#A5242B',
            paddingHorizontal: 4,
            paddingVertical: 2,
            borderRadius: 2,
        },
        alertBadgeText: {
            fontFamily: Typography.fonts.data,
            fontSize: 9,
            color: '#FFF',
        },
        statusBadge: {
            position: 'absolute',
            top: 6,
            right: 6,
            width: 20,
            height: 20,
            borderRadius: BorderRadius.sm,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10,
        },

        loader: { marginTop: 80 },

        empty: {
            alignItems: 'center',
            marginTop: 80,
            paddingHorizontal: Spacing.space6,
        },
        emptyText: {
            color: tc.textSecondary,
            fontFamily: Typography.fonts.display,
            fontSize: Typography.sizes.h2,
        },
        emptyContainer: {
            alignItems: 'center',
            marginTop: 80,
            paddingHorizontal: Spacing.space6,
            gap: Spacing.space3,
        },
        emptyTitle: {
            color: tc.textSecondary,
            fontFamily: Typography.fonts.display,
            fontSize: Typography.sizes.h2,
            letterSpacing: 2,
            marginTop: Spacing.space2,
        },
        emptySubtext: {
            color: tc.textTertiary,
            fontFamily: Typography.fonts.body,
            fontSize: Typography.sizes.bodyDense,
            textAlign: 'center',
            lineHeight: 22,
        },

        fabContainer: {
            position: 'absolute',
            bottom: Spacing.space5,
            right: Spacing.space4,
            flexDirection: 'row',
            gap: Spacing.space3,
        },
        fab: {
            height: 56,
            flexDirection: 'row',
            paddingHorizontal: Spacing.space4,
            borderRadius: BorderRadius.default,
            justifyContent: 'center',
            alignItems: 'center',
            gap: Spacing.space2,
            ...Shadow.elevationBase,
        },
        fabPrimary: {
            backgroundColor: Colors.brand.red,
        },
        fabSecondary: {
            backgroundColor: tc.textPrimary,
        },
        fabTextPrimary: {
            color: tc.textPrimary,
            fontFamily: Typography.fonts.h2,
            fontSize: Typography.sizes.body,
            letterSpacing: 0.5,
        },
        fabTextSecondary: {
            color: Colors.brand.navy,
            fontFamily: Typography.fonts.h2,
            fontSize: Typography.sizes.body,
            letterSpacing: 0.5,
        },
    }), [tc]);

    const renderBox = useCallback(({ item }: { item: Box }) => {
        const hasDamage = !!item.damage_flag;
        const hasHazard = !!item.hazard_flag;
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/box/${item.id}`)}
                activeOpacity={0.7}
            >
                <View style={styles.cardContent}>
                    <View style={styles.alertBadgeRow}>
                        {hasDamage && <View style={styles.damageBadge}><Text style={styles.alertBadgeText}>⚠ HASAR</Text></View>}
                        {hasHazard && <View style={styles.hazardBadge}><Text style={styles.alertBadgeText}>⚡ TEHLİKE</Text></View>}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? Colors.status.running : Colors.status.queue }]}>
                        {item.status === 'active' ? (
                            <CheckCircle2 color={Colors.status.runningText} size={14} strokeWidth={2} />
                        ) : (
                            <Clock color={Colors.status.queueText} size={14} strokeWidth={2} />
                        )}
                    </View>

                    {/* Thumbnail */}
                    <View style={styles.thumbnail}>
                        <BoxCardThumbnail
                            primaryImageUrl={item.primary_image_url ?? (item.images?.[0] ? (item.images[0].image_url.startsWith('http') ? item.images[0].image_url : `${Config.API_BASE_URL}${item.images[0].image_url}`) : null)}
                            boxId={item.id}
                        />
                    </View>

                    {/* Info */}
                    <View style={styles.cardInfo}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                            {item.title || `KT.#${item.id.slice(0, 5).toUpperCase()}`}
                        </Text>
                        <Text style={styles.cardData}>
                            {item.item_count} PRÇ
                        </Text>
                        <Text style={styles.cardLocation} numberOfLines={1}>
                            {item.location ? `L: ${item.location.toUpperCase()}` : 'L: —'}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    }, [router, styles]);

    return (
        <SafeAreaView style={styles.container} edges={['right', 'bottom', 'left']}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                    <Search color={tc.textSecondary} size={20} strokeWidth={2} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Kutu ID veya içerik ara..."
                        placeholderTextColor={tc.textSecondary}
                        value={search}
                        onChangeText={onSearch}
                    />
                    {searching && <ActivityIndicator size="small" color={Colors.brand.red} style={{ marginLeft: Spacing.space2 }} />}
                    {search.length > 0 && (
                        <TouchableOpacity
                            onPress={() => { setSearch(''); loadBoxes(''); }}
                            style={{ padding: 4 }}
                            accessibilityLabel="Aramayı Temizle"
                            accessibilityRole="button"
                        >
                            <X color={tc.textSecondary} size={16} strokeWidth={2} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
                <Text style={styles.statsText}>
                    EN.TOP: {total} BİRİM
                </Text>
            </View>

            {/* Box List */}
            {loading ? (
                <ActivityIndicator size="large" color={Colors.brand.red} style={styles.loader} />
            ) : (
                <FlatList
                    data={boxes}
                    renderItem={renderBox}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    columnWrapperStyle={styles.rowStyle}
                    contentContainerStyle={{
                        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 16,
                        paddingBottom: 80
                    }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={Colors.brand.red}
                        />
                    }
                    ListEmptyComponent={
                        loadError ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyTitle}>{loadError}</Text>
                                <TouchableOpacity onPress={() => loadBoxes(searchRef.current)} style={{ marginTop: Spacing.space4 }}>
                                    <Text style={{ color: Colors.brand.red, fontFamily: Typography.fonts.h2, fontSize: Typography.sizes.body }}>Yeniden Dene</Text>
                                </TouchableOpacity>
                            </View>
                        ) : search ? (
                            <View style={styles.emptyContainer}>
                                <Search color={tc.textTertiary} size={48} strokeWidth={1} />
                                <Text style={styles.emptyTitle}>SONUÇ BULUNAMADI</Text>
                                <Text style={styles.emptySubtext}>
                                    "{search}" için eşleşme yok.{'\n'}Farklı bir terim deneyin.
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Package color={tc.textTertiary} size={64} strokeWidth={1} />
                                <Text style={styles.emptyTitle}>DEPO BOŞ</Text>
                                <Text style={styles.emptySubtext}>
                                    İlk kutuyu eklemek için kamera butonuna basın.
                                </Text>
                            </View>
                        )
                    }
                />
            )}

            {/* FABs */}
            <View style={styles.fabContainer}>
                <TouchableOpacity
                    style={[styles.fab, styles.fabSecondary]}
                    onPress={() => router.push('/scan')}
                    activeOpacity={0.8}
                    accessibilityLabel="QR Kod Tara"
                    accessibilityRole="button"
                >
                    <QrCode color={Colors.brand.navy} size={24} strokeWidth={2} />
                    <Text style={styles.fabTextSecondary}>TARA</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.fab, styles.fabPrimary]}
                    onPress={() => router.push('/camera')}
                    activeOpacity={0.8}
                    accessibilityLabel="Yeni Kutu Ekle"
                    accessibilityRole="button"
                >
                    <Plus color={tc.textPrimary} size={24} strokeWidth={2} />
                    <Text style={styles.fabTextPrimary}>YENİ KUTU</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
