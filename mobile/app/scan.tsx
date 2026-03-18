// BoxScan — ScanScreen: QR scan with error states (Lasersan Factory V5)

import { useState, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Linking from 'expo-linking';
import { Camera, Settings, AlertTriangle, AlertCircle, SearchX, RefreshCcw, Home } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius, Shadow } from '../constants/theme';
import { scanBox } from '../services/api';

type ScanState = 'scanning' | 'loading' | 'error' | 'not_found' | 'invalid_qr';

interface BoxQRPayload { id: string; t: string; }

export default function ScanScreen() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanState, setScanState] = useState<ScanState>('scanning');
    const [errorMsg, setErrorMsg] = useState('');
    const [scanned, setScanned] = useState(false);

    useFocusEffect(
        useCallback(() => {
            setScanned(false);
            setScanState('scanning');
            setErrorMsg('');
        }, [])
    );

    // Permission handling
    if (!permission) return <View style={styles.container} />;

    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Camera color={Colors.text.secondary} size={84} strokeWidth={1} style={{ marginBottom: Spacing.space5 }} />
                <Text style={styles.permTitle}>KAMERA İZNİ GEREKLİ</Text>
                <Text style={styles.permText}>QR kod tarayıcı modülü için donanım erişimine izin vermelisiniz.</Text>
                <TouchableOpacity
                    style={styles.permBtn}
                    onPress={requestPermission}
                    accessibilityLabel="Kamera iznine izin ver"
                    accessibilityRole="button"
                >
                    <Text style={styles.permBtnText}>YETKİ VER</Text>
                </TouchableOpacity>
                {permission.canAskAgain === false && (
                    <TouchableOpacity
                        style={[styles.permBtn, styles.settingsBtn]}
                        onPress={() => Linking.openSettings()}
                        accessibilityLabel="Uygulama ayarlarını aç"
                        accessibilityRole="button"
                    >
                        <Settings color={Colors.text.primary} size={20} strokeWidth={2} style={{ marginRight: Spacing.space2 }} />
                        <Text style={styles.permBtnText}>AYARLARI AÇ</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        if (scanned) return;
        setScanned(true);
        setScanState('loading');

        try {
            // Parse QR payload
            let payload: BoxQRPayload;
            try {
                payload = JSON.parse(data) as BoxQRPayload;
            } catch {
                setScanState('invalid_qr');
                setErrorMsg('Bu format BoxScan standardına uygun değil');
                return;
            }

            // Validate payload
            if (!payload.id || payload.t !== 'box') {
                setScanState('invalid_qr');
                setErrorMsg('Geçersiz QR payload yapısı tespit edildi');
                return;
            }

            // Call scan API
            const box = await scanBox(payload.id);

            // Navigate to box detail (Success assumed 0ms visual flash before routing if necessary in future iterations, direct route covers spec)
            router.replace(`/box/${box.id}`);
        } catch (err: any) {
            if (err.message?.includes('not found') || err.message?.includes('404')) {
                setScanState('not_found');
                setErrorMsg('Veritabanında bu kimliğe ait kutu bulunamadı');
            } else {
                setScanState('error');
                setErrorMsg(err.message || 'Bağlantı veya sunucu hatası');
            }
        }
    };

    const retry = () => {
        setScanned(false);
        setScanState('scanning');
        setErrorMsg('');
    };

    // Error/Loading state overlay
    if (scanState !== 'scanning') {
        const isError = scanState === 'invalid_qr' || scanState === 'error';
        const isNotFound = scanState === 'not_found';
        // loading → Colors.bg.app, not_found → Colors.bg.surface (subtle distinction), error → Colors.status.error
        const modalBg = isError ? Colors.status.error : isNotFound ? Colors.bg.surface : Colors.bg.app;

        return (
            <View style={[styles.stateContainer, { backgroundColor: modalBg }]}>
                {scanState === 'loading' ? (
                    <>
                        <ActivityIndicator size="large" color={Colors.brand.red} />
                        <Text style={styles.stateTextLoading}>SİSTEM SORGULANIYOR...</Text>
                    </>
                ) : (
                    <>
                        <View style={{ marginBottom: Spacing.space4 }}>
                            {scanState === 'invalid_qr' ? <AlertTriangle color={Colors.status.errorText} size={84} strokeWidth={2} /> :
                                scanState === 'not_found' ? <SearchX color={Colors.brand.red} size={84} strokeWidth={2} /> :
                                    <AlertCircle color={Colors.status.errorText} size={84} strokeWidth={2} />}
                        </View>
                        <Text style={[styles.stateTitle, { color: isError ? Colors.status.errorText : Colors.text.primary }]}>
                            {scanState === 'invalid_qr' ? 'GEÇERSİZ FORMAT' :
                                scanState === 'not_found' ? 'KAYIT BULUNAMADI' : 'SİSTEM HATASI'}
                        </Text>
                        <Text style={[styles.stateMsg, { color: isError ? Colors.status.errorText : Colors.text.secondary }]}>
                            {errorMsg}
                        </Text>
                        <TouchableOpacity
                            style={[styles.retryBtn, isError && styles.retryBtnErrorBg]}
                            onPress={retry}
                            accessibilityLabel="Yeniden tara"
                            accessibilityRole="button"
                        >
                            <RefreshCcw color={isError ? Colors.status.error : Colors.text.primary} size={20} strokeWidth={2} style={{ marginRight: Spacing.space2 }} />
                            <Text style={[styles.retryBtnText, isError && { color: Colors.status.error }]}>YENİDEN TARA</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.homeBtn, isError && styles.homeBtnErrorOutline]}
                            onPress={() => router.replace('/')}
                            accessibilityLabel="Ana sayfaya dön"
                            accessibilityRole="button"
                        >
                            <Home color={isError ? Colors.status.errorText : Colors.text.primary} size={20} strokeWidth={2} style={{ marginRight: Spacing.space2 }} />
                            <Text style={[styles.homeBtnText, isError && { color: Colors.status.errorText }]}>ANA SAYFAYA DÖN</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'right', 'bottom', 'left']}>
            <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                accessibilityLabel="QR kod tarayıcı kamerası"
            />
            <View
                style={styles.scanOverlay}
                pointerEvents="none"
                accessibilityLabel="QR kod hedefleme çerçevesi"
                accessibilityRole="image"
            >
                <View style={styles.scanFrame}>
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />
                </View>
                <Text style={styles.scanHint}>QR KODU MERKEZLEYİN</Text>
            </View>
        </SafeAreaView>
    );
}

const CORNER_SIZE = 32;
const CORNER_WIDTH = 4;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg.app },

    // Permission
    permissionContainer: {
        flex: 1, backgroundColor: Colors.bg.app,
        justifyContent: 'center', alignItems: 'center', padding: Spacing.space6,
    },
    permTitle: { color: Colors.text.primary, fontFamily: Typography.fonts.h1, fontSize: Typography.sizes.h1, marginBottom: Spacing.space2, textAlign: 'center' },
    permText: { color: Colors.text.secondary, fontFamily: Typography.fonts.body, fontSize: Typography.sizes.body, textAlign: 'center', marginBottom: Spacing.space5 },
    permBtn: {
        flexDirection: 'row',
        backgroundColor: Colors.brand.red, paddingVertical: Spacing.space4,
        paddingHorizontal: Spacing.space6, borderRadius: BorderRadius.default, marginBottom: Spacing.space3,
        minWidth: 200, justifyContent: 'center', alignItems: 'center', ...Shadow.elevationBase
    },
    settingsBtn: { backgroundColor: Colors.bg.surface, borderWidth: 1, borderColor: Colors.border.subtle },
    permBtnText: { color: Colors.text.primary, fontFamily: Typography.fonts.h2, fontSize: Typography.sizes.body, letterSpacing: 1 },

    // Camera
    camera: { flex: 1 },
    scanOverlay: {
        ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    scanFrame: {
        width: 250, height: 250, position: 'relative',
    },
    corner: {
        position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE,
        borderColor: Colors.brand.red, // Laser red targeting
    },
    topLeft: { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
    topRight: { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },
    bottomLeft: { bottom: 0, left: 0, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
    bottomRight: { bottom: 0, right: 0, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },

    scanHint: {
        color: '#FFFFFF', fontFamily: Typography.fonts.data, fontSize: Typography.sizes.caption,
        marginTop: Spacing.space5, textAlign: 'center', letterSpacing: 2,
        backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: Spacing.space3, paddingVertical: Spacing.space1, borderRadius: BorderRadius.sm,
    },

    // State screens
    stateContainer: {
        flex: 1, backgroundColor: Colors.bg.app,
        justifyContent: 'center', alignItems: 'center', padding: Spacing.space6,
    },
    stateTitle: { color: Colors.text.primary, fontFamily: Typography.fonts.display, fontSize: Typography.sizes.h1, marginBottom: Spacing.space2, textAlign: 'center' },
    stateTextLoading: { color: Colors.text.primary, fontFamily: Typography.fonts.data, fontSize: Typography.sizes.data, marginTop: Spacing.space4, letterSpacing: 1 },
    stateMsg: { color: Colors.text.secondary, fontFamily: Typography.fonts.body, fontSize: Typography.sizes.bodyDense, textAlign: 'center', marginBottom: Spacing.space6 },

    retryBtn: {
        flexDirection: 'row', backgroundColor: Colors.brand.red, height: 64, // hardware button minimum touch
        paddingHorizontal: Spacing.space6, borderRadius: BorderRadius.default,
        justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.space3,
        width: '100%',
    },
    retryBtnErrorBg: {
        backgroundColor: Colors.text.primary, // white background for retry when surface is red
    },
    retryBtnText: { color: Colors.text.primary, fontFamily: Typography.fonts.h2, fontSize: Typography.sizes.body, letterSpacing: 1 },

    homeBtn: {
        flexDirection: 'row', height: 64, paddingHorizontal: Spacing.space6, borderRadius: BorderRadius.default,
        justifyContent: 'center', alignItems: 'center', width: '100%',
        backgroundColor: Colors.bg.surface, borderWidth: 1, borderColor: Colors.border.subtle,
    },
    homeBtnErrorOutline: {
        backgroundColor: 'transparent',
        borderColor: Colors.text.primary,
    },
    homeBtnText: { color: Colors.text.primary, fontFamily: Typography.fonts.h2, fontSize: Typography.sizes.body, letterSpacing: 1 },
});
