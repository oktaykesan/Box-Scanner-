// BoxScan — CameraScreen: Photo capture + Analyze (Lasersan Factory V5)

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { Camera, RefreshCw, Cpu, Settings, X, ChevronRight } from 'lucide-react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useDerivedValue,
    withTiming,
    withRepeat,
    withSequence,
    withDelay,
    interpolateColor,
    cancelAnimation,
    Easing,
    interpolate,
} from 'react-native-reanimated';
import { Colors, Spacing, Typography, BorderRadius, Shadow } from '../constants/theme';
import { Config } from '../constants/config';
import { analyzeImage, uploadImages } from '../services/api';
import { AIAnalysisToggle } from '../components/AIAnalysisToggle';
import { AlertBanner } from '../components/AlertBanner';
import { useAIAudio } from '../hooks/useAIAudio';
import { CrosshairOverlay } from '../components/CrosshairOverlay';
import DataRain from '../components/DataRain';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

export default function CameraScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [permission, requestPermission] = useCameraPermissions();
    const [photoUris, setPhotoUris] = useState<string[]>([]);
    const [isAIEnabled, setIsAIEnabled] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'warning' }>({
        visible: false, message: '', type: 'success'
    });

    const audio = useAIAudio();
    const cameraRef = useRef<CameraView>(null);
    const isFocused = useIsFocused();

    useFocusEffect(
        useCallback(() => {
            // Ekran odaklandığında (açıldığında) önceki verileri temizle
            setPhotoUris([]);
            setProcessing(false);
            setAlert({ visible: false, message: '', type: 'success' });
            
            // Eğer izin reddedildiyse ve sorulabilir durumdaysa otomatik tekrar sorulabilir, 
            // ama burada sadece state'i sıfırlamak yetecektir.
            return () => {
                // Ekrandan çıkıldığında da temizleyebiliriz
            };
        }, [])
    );

    // Camera Frame Animations
    const frameBorderColor = useSharedValue(0); // 0 = inactive, 1 = active
    const scanLineTop = useSharedValue(0); // 0–100 (percentage)
    const scanLineActive = useSharedValue(0); // 0 = inactive, 1 = active (for fade in/out)
    const cornerColorProgress = useSharedValue(0); // 0=inactive, 0.5=blue, 1=red

    // Capture: shutter curtain + ring
    const shutterOpacity = useSharedValue(0);
    const captureRingScale = useSharedValue(0.2);
    const captureRingOpacity = useSharedValue(0);

    // Processing overlay
    const processingFade = useSharedValue(0);

    // Processing ripple rings
    const ripple1Scale = useSharedValue(0);
    const ripple1Opacity = useSharedValue(0);
    const ripple2Scale = useSharedValue(0);
    const ripple2Opacity = useSharedValue(0);
    const ripple3Scale = useSharedValue(0);
    const ripple3Opacity = useSharedValue(0);

    // Lock-on animation
    const lockOnProgress = useSharedValue(0);

    // Derive opacity: active=1 → linear drop 0.8→0.3 based on position; active=0 → 0
    const scanLineOpacity = useDerivedValue(() => {
        if (scanLineActive.value < 0.01) return 0;
        return interpolate(scanLineTop.value, [0, 100], [0.8, 0.3]);
    });

    useEffect(() => {
        if (isAIEnabled) {
            frameBorderColor.value = withTiming(1, { duration: 300 });
            cornerColorProgress.value = withTiming(processing ? 1 : 0.5, { duration: 300 });
        } else {
            frameBorderColor.value = withTiming(0, { duration: 300 });
            cornerColorProgress.value = withTiming(0, { duration: 300 });
        }

        if (processing && isAIEnabled) {
            // Fade in processing overlay
            processingFade.value = withTiming(1, { duration: 300 });

            // Ripple rings (staggered expanding circles)
            const animateRipple = (scale: any, opacity: any, delay: number) => {
                scale.value = withDelay(delay, withRepeat(
                    withSequence(
                        withTiming(0, { duration: 0 }),
                        withTiming(1, { duration: 1800, easing: Easing.out(Easing.cubic) })
                    ),
                    -1, false
                ));
                opacity.value = withDelay(delay, withRepeat(
                    withSequence(
                        withTiming(0.7, { duration: 100 }),
                        withTiming(0, { duration: 1700, easing: Easing.out(Easing.quad) })
                    ),
                    -1, false
                ));
            };
            animateRipple(ripple1Scale, ripple1Opacity, 0);
            animateRipple(ripple2Scale, ripple2Opacity, 600);
            animateRipple(ripple3Scale, ripple3Opacity, 1200);
        } else {
            // Fade out processing overlay
            processingFade.value = withTiming(0, { duration: 200 });
            cancelAnimation(ripple1Scale); cancelAnimation(ripple1Opacity);
            cancelAnimation(ripple2Scale); cancelAnimation(ripple2Opacity);
            cancelAnimation(ripple3Scale); cancelAnimation(ripple3Opacity);
            ripple1Scale.value = 0; ripple1Opacity.value = 0;
            ripple2Scale.value = 0; ripple2Opacity.value = 0;
            ripple3Scale.value = 0; ripple3Opacity.value = 0;
        }

        return () => {
            cancelAnimation(frameBorderColor);
            cancelAnimation(scanLineTop);
            cancelAnimation(scanLineActive);
            cancelAnimation(cornerColorProgress);
            cancelAnimation(processingFade);
            cancelAnimation(ripple1Scale); cancelAnimation(ripple1Opacity);
            cancelAnimation(ripple2Scale); cancelAnimation(ripple2Opacity);
            cancelAnimation(ripple3Scale); cancelAnimation(ripple3Opacity);
            cancelAnimation(lockOnProgress);
        };
    }, [isAIEnabled, processing]);

    const cameraFrameStyle = useAnimatedStyle(() => {
        const borderColor = interpolateColor(
            frameBorderColor.value,
            [0, 1],
            [Colors.border.subtle, Colors.red.default]
        );
        return {
            borderColor,
            borderWidth: 2, // static — no layout recalc
            shadowColor: Colors.red.default,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: frameBorderColor.value * 0.25,
            shadowRadius: frameBorderColor.value * 24,
            elevation: frameBorderColor.value * 24,
        };
    });

    const scanLineStyle = useAnimatedStyle(() => ({
        top: `${scanLineTop.value}%`,
        opacity: scanLineOpacity.value,
    }));

const scanLogoOutlineStyle = useAnimatedStyle(() => {
        const alpha = Math.round(frameBorderColor.value * 204); // 0–204 (0x00–0xCC)
        const hex = alpha.toString(16).padStart(2, '0');
        return {
            textShadowColor: `#3B82F6${hex}`,
            textShadowRadius: 8 + frameBorderColor.value * 8,
        };
    });

    const cornerAnimStyle = useAnimatedStyle(() => {
        const borderColor = interpolateColor(
            cornerColorProgress.value,
            [0, 0.5, 1],
            ['rgba(255,255,255,0.25)', Colors.blue.default, Colors.red.default]
        );
        const size = interpolate(cornerColorProgress.value, [0, 0.5, 1], [16, 22, 22]);
        return { borderColor, width: size, height: size };
    });

    const lockOnStyle = useAnimatedStyle(() => {
        if (lockOnProgress.value === 0) return {};
        const scale = interpolate(lockOnProgress.value, [0, 0.4, 0.7, 1], [1, 0.91, 1.04, 1.0]);
        const glowOpacity = interpolate(lockOnProgress.value, [0, 0.3, 0.6, 1], [0, 1, 0.5, 0]);
        return {
            transform: [{ scale }],
            borderColor: `rgba(59,130,246,${glowOpacity})`,
            shadowColor: Colors.blue.light,
            shadowOpacity: glowOpacity * 0.8,
            shadowRadius: 12,
        };
    });

    // Shutter curtain (dark, like a real camera)
    const shutterStyle = useAnimatedStyle(() => ({
        opacity: shutterOpacity.value,
    }));

    // Expanding ring from center
    const captureRingStyle = useAnimatedStyle(() => ({
        opacity: captureRingOpacity.value,
        transform: [{ scale: captureRingScale.value }],
    }));

    // Processing overlay fade
    const processingOverlayStyle = useAnimatedStyle(() => ({
        opacity: processingFade.value,
        pointerEvents: processingFade.value > 0.05 ? 'none' : 'none',
    }));

    // Processing ripple rings
    const ripple1Style = useAnimatedStyle(() => ({
        transform: [{ scale: ripple1Scale.value }],
        opacity: ripple1Opacity.value,
    }));
    const ripple2Style = useAnimatedStyle(() => ({
        transform: [{ scale: ripple2Scale.value }],
        opacity: ripple2Opacity.value,
    }));
    const ripple3Style = useAnimatedStyle(() => ({
        transform: [{ scale: ripple3Scale.value }],
        opacity: ripple3Opacity.value,
    }));

    if (!permission) {
        return <View style={styles.container} />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Camera color={Colors.text.secondary} size={84} strokeWidth={1} style={{ marginBottom: Spacing.space5 }} />
                <Text style={styles.permissionTitle}>KAMERA İZNİ GEREKLİ</Text>
                <Text style={styles.permissionText}>
                    Modülün çalışması için donanım erişimine izin vermelisiniz.
                </Text>
                <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                    <Text style={styles.permissionBtnText}>YETKİ VER</Text>
                </TouchableOpacity>
                {permission.canAskAgain === false && (
                    <TouchableOpacity
                        style={[styles.permissionBtn, styles.settingsBtn]}
                        onPress={() => Linking.openSettings()}
                    >
                        <Settings color={Colors.text.primary} size={20} strokeWidth={2} style={{ marginRight: Spacing.space2 }} />
                        <Text style={styles.permissionBtnText}>AYARLARI AÇ</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    const takePicture = async () => {
        if (!cameraRef.current) return;
        if (photoUris.length >= 3) {
            setAlert({ visible: true, message: 'En fazla 3 fotoğraf çekebilirsiniz.', type: 'warning' });
            return;
        }
        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.85,
                base64: false,
            });
            if (photo) {
                setPhotoUris((prev) => [...prev, photo.uri]);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                // Shutter curtain
                shutterOpacity.value = withSequence(
                    withTiming(0.55, { duration: 60, easing: Easing.out(Easing.cubic) }),
                    withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) })
                );
                // Expanding ring
                captureRingScale.value = withSequence(
                    withTiming(0.2, { duration: 0 }),
                    withTiming(1.4, { duration: 500, easing: Easing.out(Easing.cubic) })
                );
                captureRingOpacity.value = withSequence(
                    withTiming(0.9, { duration: 40 }),
                    withTiming(0, { duration: 460, easing: Easing.in(Easing.quad) })
                );
            }
        } catch (err) {
            setAlert({ visible: true, message: 'Kamera donanım hatası. Tekrar deneyin.', type: 'error' });
        }
    };

    const handleRemovePhoto = (index: number) => {
        setPhotoUris((prev) => prev.filter((_, i) => i !== index));
    };

    const handleProceed = async () => {
        if (photoUris.length === 0) return;
        setProcessing(true);
        if (isAIEnabled) audio.playScan();
        try {
            if (isAIEnabled) {
                console.log('[Camera] Analiz başlıyor...');
                const result = await analyzeImage(photoUris);
                audio.playComplete();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                // Lock-on animation before navigating
                lockOnProgress.value = withSequence(
                    withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }),
                    withTiming(0, { duration: 0 })
                );
                await new Promise(resolve => setTimeout(resolve, 320));
                router.push({
                    pathname: '/review',
                    params: {
                        imageUrl: result.imageUrl,
                        imageUrls: JSON.stringify(result.imageUrls || [result.imageUrl]),
                        items: JSON.stringify(result.items),
                        provider: result.analysisMeta.provider,
                        status: result.analysisMeta.status,
                        suggestedTitle: result.suggested_title ?? '',
                        suggestedLocation: result.suggested_location ?? '',
                        damageFlag: String(result.damage_flag ?? false),
                        damageNotes: result.damage_notes ?? '',
                        hazardFlag: String(result.hazard_flag ?? false),
                        hazardNotes: result.hazard_notes ?? '',
                        confidence: result.confidence ?? '',
                        analysisNotes: result.analysisNotes ?? '',
                        summary: result.summary ?? '',
                    },
                });
            } else {
                console.log('[Camera] Yalnızca fotoğraf yükleniyor (Yapay Zeka Kapalı)...');
                const urls = await uploadImages(photoUris);
                audio.playComplete();
                setAlert({ visible: true, message: 'Fotoğraflar yüklendi!', type: 'success' });

                setTimeout(() => {
                    router.push({
                        pathname: '/review',
                        params: {
                            imageUrl: urls[0] || '',
                            imageUrls: JSON.stringify(urls),
                            items: JSON.stringify([]),
                            provider: 'none',
                            status: 'manual',
                            suggestedTitle: '',
                            suggestedLocation: '',
                            damageFlag: 'false',
                            damageNotes: '',
                            hazardFlag: 'false',
                            hazardNotes: '',
                            confidence: '',
                            analysisNotes: '',
                            summary: '',
                        },
                    });
                }, 1000);
            }
        } catch (err: any) {
            console.log('[Camera] İşlem hatası:', err.message);
            const msg = err.message?.includes('timeout')
                ? 'Sunucu yanıt vermedi. Bağlantınızı kontrol edin.'
                : err.message?.includes('413')
                ? 'Fotoğraflar çok büyük. Daha az fotoğraf deneyin.'
                : err.message || 'Sunucuya bağlanılamadı.';
            setAlert({ visible: true, message: msg, type: 'error' });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setProcessing(false);
            audio.stopScan();
        }
    };

    const clearAll = () => {
        setPhotoUris([]);
        setProcessing(false);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <AlertBanner
                visible={alert.visible}
                message={alert.message}
                type={alert.type}
                onDismiss={() => setAlert({ ...alert, visible: false })}
            />

            <Animated.View style={[styles.cameraContainer, cameraFrameStyle]}>
                {isFocused && (
                    <CameraView
                        ref={cameraRef}
                        style={{ flex: 1 }}
                        facing="back"
                    />
                )}

                {/* ── Ruler Tick Marks (Tactical HUD) ── */}
                <RulerOverlay />

                {/* ── Shutter Curtain (dark, camera-like) ── */}
                <Animated.View
                    style={[StyleSheet.absoluteFillObject, styles.shutterCurtain, shutterStyle]}
                    pointerEvents="none"
                />

                {/* ── Capture Ring (expands from center on photo) ── */}
                <Animated.View
                    style={[styles.captureRing, captureRingStyle]}
                    pointerEvents="none"
                />

                {/* ── 4 Corner Frames (animated color) ── */}
                <Animated.View style={[styles.corner, styles.cornerTL, cornerAnimStyle, lockOnStyle]} />
                <Animated.View style={[styles.corner, styles.cornerTR, cornerAnimStyle, lockOnStyle]} />
                <Animated.View style={[styles.corner, styles.cornerBL, cornerAnimStyle, lockOnStyle]} />
                <Animated.View style={[styles.corner, styles.cornerBR, cornerAnimStyle, lockOnStyle]} />

                {/* ── Header Logo 'SCAN' ── */}
                <View style={styles.headerLogoContainer}>
                    <Animated.Text style={[styles.headerLogoOutline, scanLogoOutlineStyle]}>SCAN</Animated.Text>
                    <Text style={styles.headerLogoFill}>SCAN</Text>
                </View>

                {/* ── Crosshair (only when NOT processing — idle targeting) ── */}
                <CrosshairOverlay isVisible={isAIEnabled && !processing} isAnalyzing={false} />

                {/* ── PROCESSING OVERLAY ── */}
                <Animated.View
                    style={[StyleSheet.absoluteFillObject, styles.processingOverlay, processingOverlayStyle]}
                    pointerEvents="none"
                >
                    {/* Dimmed background */}
                    <View style={styles.processingDim} />

                    {/* DataRain matrix background */}
                    <DataRain opacity={0.85} active={processing} />

                    {/* Ripple rings + label */}
                    <View style={styles.rippleContainer}>
                        <Animated.View style={[styles.rippleRing, ripple1Style]} />
                        <Animated.View style={[styles.rippleRing, ripple2Style]} />
                        <Animated.View style={[styles.rippleRing, ripple3Style]} />
                        <Text style={styles.processingLabel}>ANALİZ EDİYOR</Text>
                    </View>
                </Animated.View>

                {/* ── Photo Thumbnails ── */}
                {photoUris.length > 0 && !processing && (
                    <View style={styles.thumbnailOverlay}>
                        {photoUris.map((uri, index) => (
                            <View key={index} style={styles.thumbnailContainer}>
                                <Image source={{ uri }} style={styles.thumbnailImage} />
                                <TouchableOpacity
                                    style={styles.thumbnailRemoveBtn}
                                    onPress={() => handleRemovePhoto(index)}
                                >
                                    <X color="#fff" size={12} strokeWidth={3} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                {/* ── Photo step indicator dots ── */}
                <View style={styles.photoStepIndicator}>
                    {[0, 1, 2].map((i) => (
                        <View
                            key={i}
                            style={[
                                styles.photoStepDot,
                                i < photoUris.length && styles.photoStepDotFilled,
                            ]}
                        />
                    ))}
                </View>
            </Animated.View>

            <View style={[styles.controlsBottom, { paddingBottom: Math.max(16, insets.bottom) }]}>
                {/* AI Toggle Bar from Component */}
                <View style={styles.aiToggleWrapper}>
                    <AIAnalysisToggle
                        isEnabled={isAIEnabled}
                        isAnalyzing={processing && isAIEnabled}
                        onToggle={(val) => {
                            console.log('[Toggle] değişti:', val);
                            if (val) {
                                audio.playActivate();
                            } else {
                                audio.playDeactivate();
                                audio.stopScan();
                            }
                            setIsAIEnabled(val);
                        }}
                    />
                </View>

                {photoUris.length === 0 ? (
                    <View style={styles.actionRowWrapper}>
                        <Text style={styles.controlsText}>
                            Kutunun ve içindekilerin fotoğrafını çekin
                        </Text>
                        <TouchableOpacity style={styles.captureBtn} onPress={takePicture} activeOpacity={0.8}>
                            <LinearGradient
                                colors={[Colors.blue.light, Colors.blue.default]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={[StyleSheet.absoluteFillObject, { borderRadius: 36 }]}
                            />
                            <Camera color="#fff" size={28} strokeWidth={2} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.captureBtnSmall, photoUris.length >= 3 && { opacity: 0.5 }]}
                            onPress={takePicture}
                            disabled={photoUris.length >= 3}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[Colors.blue.light, Colors.blue.default]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={[StyleSheet.absoluteFillObject, { borderRadius: BorderRadius.default }]}
                            />
                            <Camera color="#fff" size={20} strokeWidth={2} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.retakeBtn} onPress={clearAll}>
                            <RefreshCw color={Colors.text.primary} size={20} strokeWidth={2} style={{ marginRight: Spacing.space2 }} />
                            <Text style={styles.retakeBtnText}>TEMİZLE</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.analyzeBtn, processing && styles.analyzingBtn]}
                            onPress={handleProceed}
                            disabled={processing}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={processing
                                    ? ['rgba(37,99,235,0.4)', 'rgba(11,45,66,0.8)']
                                    : [Colors.blue.default, Colors.brand.navy]
                                }
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFillObject}
                            />
                            {processing ? (
                                <Text style={styles.analyzeBtnText}>TARANYOR</Text>
                            ) : (
                                <>
                                    {isAIEnabled ? (
                                        <Cpu color="#fff" size={20} strokeWidth={2} style={{ marginRight: Spacing.space2 }} />
                                    ) : (
                                        <ChevronRight color="#fff" size={20} strokeWidth={2} style={{ marginRight: Spacing.space2 }} />
                                    )}
                                    <Text style={styles.analyzeBtnText}>
                                        {isAIEnabled ? 'ANALİZ ET' : 'YÜKLE'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    cameraWrapper: { flex: 1 },

    permissionContainer: {
        flex: 1,
        backgroundColor: Colors.bg.app,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.space6,
    },
    permissionTitle: {
        color: Colors.text.primary,
        fontFamily: Typography.fonts.h1,
        fontSize: Typography.sizes.h1,
        marginBottom: Spacing.space2,
        textAlign: 'center',
    },
    permissionText: {
        color: Colors.text.secondary,
        fontFamily: Typography.fonts.body,
        fontSize: Typography.sizes.body,
        textAlign: 'center',
        marginBottom: Spacing.space5,
    },
    permissionBtn: {
        flexDirection: 'row',
        backgroundColor: Colors.red.default,
        paddingVertical: Spacing.space4,
        paddingHorizontal: Spacing.space6,
        borderRadius: BorderRadius.default,
        marginBottom: Spacing.space3,
        minWidth: 200,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadow.elevationBase,
    },
    settingsBtn: {
        backgroundColor: Colors.bg.surface,
        borderWidth: 1,
        borderColor: Colors.border.subtle,
    },
    permissionBtnText: {
        color: Colors.text.primary,
        fontFamily: Typography.fonts.h2,
        fontSize: Typography.sizes.body,
        letterSpacing: 1,
    },

    cameraContainer: {
        flex: 1,
        backgroundColor: '#000',
        borderRadius: BorderRadius.sm,
        overflow: 'hidden',
        margin: Spacing.space2,
    },
    corner: {
        position: 'absolute',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    cornerTL: { top: 16, left: 16, borderRightWidth: 0, borderBottomWidth: 0 },
    cornerTR: { top: 16, right: 16, borderLeftWidth: 0, borderBottomWidth: 0 },
    cornerBL: { bottom: 16, left: 16, borderRightWidth: 0, borderTopWidth: 0 },
    cornerBR: { bottom: 16, right: 16, borderLeftWidth: 0, borderTopWidth: 0 },
    headerLogoContainer: {
        position: 'absolute',
        top: 32,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerLogoOutline: {
        position: 'absolute',
        fontFamily: Typography.fonts.h1,
        fontSize: 32,
        letterSpacing: 4,
        color: 'transparent',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    },
    headerLogoFill: {
        fontFamily: Typography.fonts.h1,
        fontSize: 32,
        letterSpacing: 4,
        color: Colors.blue.light,
    },
    scanLineWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 32, // increased from 24 to give more glow room
        justifyContent: 'center',
        // remove shadow props — they are clipped by overflow:hidden parent
    },
    scanLineGlow: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    scanLineSolid: {
        height: 2,
        width: '100%',
    },
    progressBarContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    controlsBottom: {
        backgroundColor: Colors.bg.app,
        borderTopWidth: 1,
        borderTopColor: Colors.border.subtle,
        paddingHorizontal: Spacing.space4,
        paddingTop: Spacing.space3,
        alignItems: 'center',
    },
    aiToggleWrapper: {
        width: '100%',
        marginBottom: Spacing.space2,
    },
    actionRowWrapper: {
        width: '100%',
        alignItems: 'center',
        paddingBottom: Spacing.space4,
    },
    controlsText: {
        fontFamily: Typography.fonts.data,
        fontSize: 11,
        color: Colors.text.secondary,
        textAlign: 'center',
        letterSpacing: 1,
        marginBottom: Spacing.space4,
        marginTop: Spacing.space2,
    },
    captureBtn: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.20)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    captureBtnSmall: {
        width: 64,
        height: 64,
        borderRadius: BorderRadius.default,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    thumbnailOverlay: {
        position: 'absolute',
        bottom: Spacing.space4,
        left: Spacing.space4,
        right: Spacing.space4,
        flexDirection: 'row',
        gap: Spacing.space3,
    },
    thumbnailContainer: {
        width: 64,
        height: 64,
        borderRadius: BorderRadius.sm,
        borderWidth: 2,
        borderColor: Colors.status.running,
        position: 'relative',
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
        borderRadius: BorderRadius.sm - 2,
    },
    thumbnailRemoveBtn: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.status.error,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#000',
    },
    actionRow: {
        flexDirection: 'row',
        gap: Spacing.space4,
        width: '100%',
    },
    retakeBtn: {
        flex: 1,
        flexDirection: 'row',
        height: 64,
        backgroundColor: Colors.bg.surface,
        borderRadius: BorderRadius.default,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border.subtle,
    },
    retakeBtnText: {
        color: Colors.text.primary,
        fontFamily: Typography.fonts.h2,
        fontSize: Typography.sizes.body,
    },
    analyzeBtn: {
        flex: 1,
        flexDirection: 'row',
        height: 64,
        borderRadius: BorderRadius.default,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.blue.dim,
        overflow: 'hidden',
        position: 'relative',
        ...Shadow.elevationBase,
    },
    analyzingBtn: { opacity: 0.7 },
    analyzeBtnText: {
        color: '#fff',
        fontFamily: Typography.fonts.h2,
        fontSize: Typography.sizes.body,
        letterSpacing: 0.5,
    },

    // Shutter curtain
    shutterCurtain: {
        backgroundColor: '#000',
        zIndex: 25,
    },

    // Capture ring
    captureRing: {
        position: 'absolute',
        alignSelf: 'center',
        top: '50%',
        marginTop: -80,
        width: 160,
        height: 160,
        borderRadius: 80,
        borderWidth: 2,
        borderColor: Colors.blue.light,
        zIndex: 26,
    },

    // Processing overlay
    processingOverlay: {
        zIndex: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    processingDim: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
    },

    // Ripple container + rings
    rippleContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    rippleRing: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 1.5,
        borderColor: Colors.red.default,
    },
    processingLabel: {
        color: '#FFFFFF',
        fontFamily: Typography.fonts.h2,
        fontSize: Typography.sizes.body,
        letterSpacing: 3,
        marginTop: 120,
        textShadowColor: Colors.red.default,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    },

    // Photo step indicator
    photoStepIndicator: {
        position: 'absolute',
        bottom: Spacing.space3,
        alignSelf: 'center',
        flexDirection: 'row',
        gap: 6,
        zIndex: 5,
    },
    photoStepDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    photoStepDotFilled: {
        backgroundColor: Colors.blue.light,
    },
});

function RulerOverlay() {
    const TICK_COLOR = 'rgba(255,255,255,0.15)';
    const TICK_ACCENT = 'rgba(59,130,246,0.30)';
    const COUNT = 36;
    const ticks: React.ReactElement[] = [];

    for (let i = 1; i < COUNT; i++) {
        const pct = (i / COUNT) * 100;
        const isAccent = i % 3 === 0;
        const color = isAccent ? TICK_ACCENT : TICK_COLOR;
        const shortLen = '1.5%';
        const longLen = '3%';
        const len = isAccent ? longLen : shortLen;

        // Top edge
        ticks.push(<Line key={`t${i}`} x1={`${pct}%`} y1="0%" x2={`${pct}%`} y2={len} stroke={color} strokeWidth="1" />);
        // Bottom edge
        ticks.push(<Line key={`b${i}`} x1={`${pct}%`} y1="100%" x2={`${pct}%`} y2={isAccent ? '97%' : '98.5%'} stroke={color} strokeWidth="1" />);
        // Left edge
        ticks.push(<Line key={`l${i}`} x1="0%" y1={`${pct}%`} x2={len} y2={`${pct}%`} stroke={color} strokeWidth="1" />);
        // Right edge
        ticks.push(<Line key={`r${i}`} x1="100%" y1={`${pct}%`} x2={isAccent ? '97%' : '98.5%'} y2={`${pct}%`} stroke={color} strokeWidth="1" />);
    }

    return (
        <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
            {ticks}
        </Svg>
    );
}