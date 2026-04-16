// BoxScan — BoxDetailScreen: Full box info + edit/delete (Lasersan Factory V5)

import { useState, useCallback, useMemo, ReactNode } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, Image, Modal, Dimensions,
    StatusBar, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
    SearchX, MapPin, StickyNote, Calendar, Clock, ScanLine,
    Package, Star, Trash2, Tag, ChevronRight, X, ChevronLeft,
} from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius, Shadow } from '../../constants/theme';
import { Config } from '../../constants/config';
import { getBox, deleteBox, getQR, type Box } from '../../services/api';
import { useThemeColors } from '../../constants/useThemeColors';

export default function BoxDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const boxId = id as string;
    const tc = useThemeColors();

    const [box, setBox] = useState<Box | null>(null);
    const [loading, setLoading] = useState(true);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [lightboxVisible, setLightboxVisible] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    const openLightbox = (index: number) => {
        setLightboxIndex(index);
        setLightboxVisible(true);
    };

    useFocusEffect(
        useCallback(() => {
            loadBox();
        }, [boxId])
    );

    const loadBox = async () => {
        try {
            const data = await getBox(boxId);
            setBox(data);

            // Load QR
            const qr = await getQR(boxId);
            setQrDataUrl(qr.qrCodeDataUrl);
        } catch (err: any) {
            Alert.alert('Erişim Hatası', 'Veritabanı kayıtlarına ulaşılamadı.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'ARŞİV KALICI SİLME',
            'Sistemden bu kutu tanımını ve tüm alt envanterini silmek istediğinize emin misiniz?',
            [
                { text: 'İPTAL', style: 'cancel' },
                {
                    text: 'KALICI OLARAK SİL',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteBox(boxId);
                            router.replace('/');
                        } catch (err: any) {
                            Alert.alert('İşlem Hatası', 'Silme isteği reddedildi.');
                        }
                    },
                },
            ]
        );
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleString('tr-TR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).replace(/ /g, '.').toUpperCase();
    };

    const styles = useMemo(() => StyleSheet.create({
        container: { flex: 1, backgroundColor: tc.bgApp },
        content: { padding: Spacing.space4, paddingBottom: Spacing.space8 },

        loadingContainer: {
            flex: 1, backgroundColor: tc.bgApp,
            justifyContent: 'center', alignItems: 'center',
        },
        loadingText: { color: tc.textSecondary, fontFamily: Typography.fonts.data, fontSize: Typography.sizes.caption, marginTop: Spacing.space4, letterSpacing: 1 },
        errorText: { color: tc.textPrimary, fontFamily: Typography.fonts.display, fontSize: Typography.sizes.h1, letterSpacing: 1 },

        // Header
        headerCard: {
            backgroundColor: tc.bgSurface, borderRadius: BorderRadius.default,
            padding: Spacing.space4, marginBottom: Spacing.space4,
            borderWidth: 1, borderColor: tc.borderSubtle,
            borderLeftWidth: 4, borderLeftColor: Colors.brand.navy,
        },
        headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        title: { color: tc.textPrimary, fontFamily: Typography.fonts.h1, fontSize: Typography.sizes.h1, flex: 1, letterSpacing: 0.5 },
        statusBadge: {
            paddingHorizontal: Spacing.space3, paddingVertical: Spacing.space1,
            borderRadius: BorderRadius.sm, borderWidth: 1,
        },
        statusText: { fontFamily: Typography.fonts.data, fontSize: Typography.sizes.caption, letterSpacing: 1 },
        boxIdText: { color: tc.textSecondary, fontFamily: Typography.fonts.data, fontSize: Typography.sizes.caption, marginTop: Spacing.space2, letterSpacing: 1 },

        // QR
        qrSection: {
            backgroundColor: '#FFFFFF', borderRadius: BorderRadius.default,
            padding: Spacing.space4, alignItems: 'center', marginBottom: Spacing.space5,
            borderWidth: 1, borderColor: tc.borderSubtle,
        },
        qrImage: { width: 150, height: 150 },

        // Info grid
        sectionHeader: { marginBottom: Spacing.space2 },
        sectionHeaderSpacing: { marginTop: Spacing.space5, marginBottom: Spacing.space2 },
        sectionTitle: {
            color: tc.textSecondary, fontFamily: Typography.fonts.data, fontSize: Typography.sizes.caption,
            letterSpacing: 2,
        },
        infoGrid: {
            backgroundColor: tc.bgSurface, borderRadius: BorderRadius.default,
            paddingHorizontal: Spacing.space4, paddingVertical: Spacing.space2, marginBottom: Spacing.space4,
            borderWidth: 1, borderColor: tc.borderSubtle,
        },
        infoItem: {
            flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.space3,
            borderBottomWidth: 1, borderBottomColor: tc.borderSubtle,
        },
        infoIconBox: {
            width: 32,
        },
        infoLabel: { color: tc.textSecondary, fontFamily: Typography.fonts.data, fontSize: 10, letterSpacing: 1 },
        infoValue: { color: tc.textPrimary, fontFamily: Typography.fonts.body, fontSize: Typography.sizes.bodyDense, marginTop: 2 },

        // Items section
        sectionGroup: { marginBottom: Spacing.space4 },
        itemRow: {
            backgroundColor: tc.bgSurface, borderRadius: BorderRadius.default,
            padding: Spacing.space3, marginBottom: Spacing.space2,
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            borderWidth: 1, borderColor: tc.borderSubtle,
        },
        itemIconContainer: { marginRight: Spacing.space3 },
        itemInfo: { flex: 1 },
        itemName: { color: tc.textPrimary, fontFamily: Typography.fonts.h2, fontSize: Typography.sizes.bodyDense, letterSpacing: 0.5 },
        itemCategory: { color: tc.textSecondary, fontFamily: Typography.fonts.data, fontSize: Typography.sizes.caption, marginTop: 2, letterSpacing: 1 },
        quantityBadge: {
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: tc.bgElevated, paddingHorizontal: Spacing.space3,
            paddingVertical: Spacing.space2, borderRadius: BorderRadius.sm,
            borderWidth: 1, borderColor: tc.borderSubtle, minWidth: 64,
        },
        quantityLabel: { color: tc.textSecondary, fontFamily: Typography.fonts.data, fontSize: 9, letterSpacing: 1, marginBottom: 2 },
        quantityText: { color: Colors.brand.red, fontFamily: Typography.fonts.data, fontSize: Typography.sizes.data, fontWeight: '700' },

        // Photos
        photoCard: {
            width: 140, height: 140, borderRadius: BorderRadius.default,
            overflow: 'hidden', backgroundColor: tc.bgSurface,
            borderWidth: 1, borderColor: tc.borderSubtle,
        },
        photo: { width: '100%', height: '100%' },
        primaryBadge: {
            position: 'absolute', top: Spacing.space2, right: Spacing.space2,
            backgroundColor: Colors.brand.navy, borderRadius: 9999,
            width: 24, height: 24, justifyContent: 'center', alignItems: 'center',
            ...Shadow.elevationBase,
        },
        zoomHint: {
            position: 'absolute', bottom: Spacing.space2, right: Spacing.space2,
            backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 8,
            paddingHorizontal: 5, paddingVertical: 2,
        },
        zoomHintText: { fontSize: 11 },

        // Actions
        actions: { gap: Spacing.space3, marginTop: Spacing.space6 },
        labelBtn: {
            flexDirection: 'row', height: 64, backgroundColor: Colors.brand.navy, borderRadius: BorderRadius.default,
            justifyContent: 'center', alignItems: 'center', position: 'relative',
            ...Shadow.elevationBase,
        },
        labelBtnText: { color: tc.textPrimary, fontFamily: Typography.fonts.h2, fontSize: Typography.sizes.body, letterSpacing: 1 },

        deleteBtn: {
            flexDirection: 'row', height: 64, backgroundColor: 'transparent', borderRadius: BorderRadius.default,
            justifyContent: 'center', alignItems: 'center',
            borderWidth: 1, borderColor: Colors.status.error,
        },
        deleteBtnText: { color: Colors.status.error, fontFamily: Typography.fonts.h2, fontSize: Typography.sizes.body, letterSpacing: 1 },
    }), [tc]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.brand.red} />
                <Text style={styles.loadingText}>BİLGİLER ALINIYOR...</Text>
            </View>
        );
    }

    if (!box) {
        return (
            <View style={styles.loadingContainer}>
                <SearchX color={Colors.status.error} size={64} strokeWidth={2} style={{ marginBottom: Spacing.space4 }} />
                <Text style={styles.errorText}>KAYIT BULUNAMADI</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['right', 'bottom', 'left']}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Header Card */}
                <View style={styles.headerCard}>
                    <View style={styles.headerRow}>
                        <Text style={styles.title}>{box.title?.toUpperCase() || `GNEL.KT.#${box.id.slice(0, 6).toUpperCase()}`}</Text>
                        <View style={[styles.statusBadge,
                        { backgroundColor: box.status === 'active' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(156, 163, 175, 0.1)' },
                        { borderColor: box.status === 'active' ? Colors.status.running : tc.textSecondary }
                        ]}>
                            <Text style={[styles.statusText,
                            { color: box.status === 'active' ? Colors.status.running : tc.textSecondary }
                            ]}>
                                {box.status === 'active' ? 'AKTİF' : 'ARŞİV'}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.boxIdText}>SYS.ID: {box.id}</Text>
                </View>

                {/* QR Code */}
                {qrDataUrl && (
                    <View style={styles.qrSection}>
                        <Image source={{ uri: qrDataUrl }} style={styles.qrImage} resizeMode="contain" />
                    </View>
                )}

                {/* Info Grid */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>SİSTEM BİLGİLERİ</Text>
                </View>
                <View style={styles.infoGrid}>
                    <InfoItem icon={<MapPin color={tc.textSecondary} size={18} strokeWidth={2} />} label="LOKASYON / RAF" value={box.location?.toUpperCase() || '—'} colors={tc} styles={styles} />
                    <InfoItem icon={<StickyNote color={tc.textSecondary} size={18} strokeWidth={2} />} label="EK NOTLAR" value={box.notes || '—'} colors={tc} styles={styles} />
                    <InfoItem icon={<Calendar color={tc.textSecondary} size={18} strokeWidth={2} />} label="OLUŞTURULMA ZM" value={formatDate(box.created_at)} colors={tc} styles={styles} />
                    <InfoItem icon={<Clock color={tc.textSecondary} size={18} strokeWidth={2} />} label="SON GÜNCELLEME" value={formatDate(box.updated_at)} colors={tc} styles={styles} />
                    <InfoItem icon={<ScanLine color={tc.textSecondary} size={18} strokeWidth={2} />} label="SON TARAMA TARIHI" value={formatDate(box.last_scanned_at)} colors={tc} styles={styles} />
                </View>

                {/* Items */}
                <View style={styles.sectionHeaderSpacing}>
                    <Text style={styles.sectionTitle}>ENVANTER İÇERİĞİ ({box.item_count} PARÇA)</Text>
                </View>
                <View style={styles.sectionGroup}>
                    {box.items.map((item: any, index: number) => (
                        <View key={item.id || index} style={styles.itemRow}>
                            <View style={styles.itemIconContainer}>
                                <Package color={tc.textSecondary} size={20} strokeWidth={1.5} />
                            </View>
                            <View style={styles.itemInfo}>
                                <Text style={styles.itemName}>{item.name.toUpperCase()}</Text>
                                <Text style={styles.itemCategory}>{item.category.toUpperCase()}</Text>
                            </View>
                            <View style={styles.quantityBadge}>
                                <Text style={styles.quantityLabel}>MKT</Text>
                                <Text style={styles.quantityText}>{item.quantity}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Photos */}
                {box.images.length > 0 && (
                    <View style={styles.sectionGroup}>
                        <View style={styles.sectionHeaderSpacing}>
                            <Text style={styles.sectionTitle}>FİZİKSEL DURUM FOTO ({box.images.length})</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.space3 }}>
                            {box.images.map((img: any, index: number) => (
                                <TouchableOpacity
                                    key={img.id || index}
                                    style={styles.photoCard}
                                    onPress={() => openLightbox(index)}
                                    activeOpacity={0.85}
                                >
                                    <Image
                                        source={{
                                            uri: img.image_url.startsWith('http')
                                                ? img.image_url
                                                : `${Config.API_BASE_URL}${img.image_url}`,
                                        }}
                                        style={styles.photo}
                                        resizeMode="cover"
                                    />
                                    {img.is_primary && (
                                        <View style={styles.primaryBadge}>
                                            <Star color={tc.bgApp} size={12} fill={tc.bgApp} />
                                        </View>
                                    )}
                                    {/* Zoom hint overlay */}
                                    <View style={styles.zoomHint}>
                                        <Text style={styles.zoomHintText}>🔍</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Lightbox Modal */}
                {box.images.length > 0 && (
                    <PhotoLightbox
                        visible={lightboxVisible}
                        images={box.images.map((img: any) =>
                            img.image_url.startsWith('http')
                                ? img.image_url
                                : `${Config.API_BASE_URL}${img.image_url}`
                        )}
                        initialIndex={lightboxIndex}
                        onClose={() => setLightboxVisible(false)}
                    />
                )}

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.labelBtn}
                        onPress={() => router.push({ pathname: '/label', params: { boxId: box.id, boxTitle: box.title || '' } })}
                    >
                        <Tag color={tc.textPrimary} size={20} strokeWidth={2} style={{ marginRight: Spacing.space2 }} />
                        <Text style={styles.labelBtnText}>ETİKETİ GÖRÜNTÜLE</Text>
                        <ChevronRight color={tc.textPrimary} size={20} strokeWidth={2} style={{ position: 'absolute', right: Spacing.space4 }} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                        <Trash2 color={Colors.status.error} size={20} strokeWidth={2} style={{ marginRight: Spacing.space2 }} />
                        <Text style={styles.deleteBtnText}>SİSTEMDEN SİL</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function InfoItem({ icon, label, value, colors, styles }: { icon: ReactNode; label: string; value: string; colors: ReturnType<typeof useThemeColors>; styles: any }) {
    return (
        <View style={styles.infoItem}>
            <View style={styles.infoIconBox}>
                {icon}
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
            </View>
        </View>
    );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

function PhotoLightbox({
    visible,
    images,
    initialIndex,
    onClose,
}: {
    visible: boolean;
    images: string[];
    initialIndex: number;
    onClose: () => void;
}) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    // Sync index when opened with a different image
    useMemo(() => { setCurrentIndex(initialIndex); }, [initialIndex]);

    const prev = () => setCurrentIndex((i) => Math.max(0, i - 1));
    const next = () => setCurrentIndex((i) => Math.min(images.length - 1, i + 1));

    return (
        <Modal
            visible={visible}
            transparent={false}
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <StatusBar hidden />
            {/* Full-screen black container */}
            <View style={{ flex: 1, backgroundColor: '#000' }}>

                {/* Zoom-capable ScrollView fills entire screen */}
                <ScrollView
                    style={{ position: 'absolute', top: 0, left: 0, width: SCREEN_W, height: SCREEN_H }}
                    contentContainerStyle={{ width: SCREEN_W, height: SCREEN_H, justifyContent: 'center', alignItems: 'center' }}
                    maximumZoomScale={4}
                    minimumZoomScale={1}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    centerContent
                    bouncesZoom
                >
                    <Image
                        source={{ uri: images[currentIndex] }}
                        style={{ width: SCREEN_W, height: SCREEN_H }}
                        resizeMode="contain"
                    />
                </ScrollView>

                {/* ── Overlays (absolute, above ScrollView) ── */}

                {/* Close button */}
                <TouchableOpacity
                    onPress={onClose}
                    hitSlop={{ top: 16, left: 16, bottom: 16, right: 16 }}
                    style={{
                        position: 'absolute',
                        top: Platform.OS === 'ios' ? 56 : 36,
                        right: 20,
                        zIndex: 30,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        borderRadius: 24,
                        padding: 8,
                    }}
                >
                    <X color="#fff" size={26} strokeWidth={2.5} />
                </TouchableOpacity>

                {/* Counter badge */}
                {images.length > 1 && (
                    <View style={{
                        position: 'absolute',
                        top: Platform.OS === 'ios' ? 60 : 40,
                        left: 0,
                        right: 0,
                        alignItems: 'center',
                        zIndex: 30,
                        pointerEvents: 'none',
                    }}>
                        <View style={{ backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 }}>
                            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', letterSpacing: 1 }}>
                                {currentIndex + 1} / {images.length}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Prev button */}
                {images.length > 1 && currentIndex > 0 && (
                    <TouchableOpacity
                        onPress={prev}
                        style={{
                            position: 'absolute',
                            left: 16,
                            top: SCREEN_H / 2 - 24,
                            zIndex: 30,
                            backgroundColor: 'rgba(0,0,0,0.55)',
                            borderRadius: 28,
                            padding: 10,
                        }}
                    >
                        <ChevronLeft color="#fff" size={28} strokeWidth={2} />
                    </TouchableOpacity>
                )}

                {/* Next button */}
                {images.length > 1 && currentIndex < images.length - 1 && (
                    <TouchableOpacity
                        onPress={next}
                        style={{
                            position: 'absolute',
                            right: 16,
                            top: SCREEN_H / 2 - 24,
                            zIndex: 30,
                            backgroundColor: 'rgba(0,0,0,0.55)',
                            borderRadius: 28,
                            padding: 10,
                        }}
                    >
                        <ChevronRight color="#fff" size={28} strokeWidth={2} />
                    </TouchableOpacity>
                )}
            </View>
        </Modal>
    );
}
