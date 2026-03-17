import { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';
import { Config } from '../constants/config';
import { useThemeColors } from '../constants/useThemeColors';

const GEMINI_KEY_STORE = 'boxscan_gemini_api_key';

export default function SettingsScreen() {
    const tc = useThemeColors();

    const [apiUrl, setApiUrl] = useState(Config.API_BASE_URL);
    const [testing, setTesting] = useState(false);
    const [connectionResult, setConnectionResult] = useState<'success' | 'error' | null>(null);

    // Gemini settings
    const [useGemini, setUseGemini] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [keySavedToast, setKeySavedToast] = useState(false);

    useEffect(() => {
        SecureStore.getItemAsync(GEMINI_KEY_STORE).then((stored) => {
            if (stored) {
                setApiKey(stored);
                setUseGemini(true);
            }
        });
    }, []);

    const testConnection = async () => {
        setTesting(true);
        setConnectionResult(null);
        try {
            const res = await fetch(`${apiUrl}/api/health`, { method: 'GET' });
            if (res.ok) {
                setConnectionResult('success');
            } else {
                throw new Error('Not OK');
            }
        } catch {
            setConnectionResult('error');
        } finally {
            setTesting(false);
        }
    };

    const handleSaveKey = async () => {
        if (apiKey.trim()) {
            await SecureStore.setItemAsync(GEMINI_KEY_STORE, apiKey.trim());
            setKeySavedToast(true);
            setTimeout(() => setKeySavedToast(false), 2500);
        }
    };

    const styles = useMemo(() => StyleSheet.create({
        bgImage: { flex: 1, backgroundColor: tc.bgApp },
        bgImageStyle: { opacity: 0.18 },
        container: { flex: 1, backgroundColor: 'transparent' },
        content: { padding: Spacing.space4 },

        section: {
            marginBottom: Spacing.space5,
            borderTopWidth: 1,
            borderTopColor: tc.divider,
            paddingTop: Spacing.space5,
        },
        sectionHeader: {
            fontFamily: Typography.fonts.data,
            fontSize: 11,
            color: tc.sectionHeader,
            textTransform: 'uppercase',
            marginBottom: Spacing.space2,
            letterSpacing: 1,
        },
        connectionSuccess: {
            color: Colors.status.running,
            fontFamily: Typography.fonts.data,
            fontSize: 12,
            marginTop: Spacing.space2,
        },
        connectionError: {
            color: Colors.status.error,
            fontFamily: Typography.fonts.data,
            fontSize: 12,
            marginTop: Spacing.space2,
        },
        savedToast: {
            color: Colors.status.running,
            fontFamily: Typography.fonts.data,
            fontSize: 12,
            marginTop: Spacing.space2,
        },
        card: {
            backgroundColor: tc.cardBg,
            borderRadius: BorderRadius.default,
            borderWidth: 1,
            borderColor: tc.borderSubtle,
            padding: Spacing.space4,
        },
        label: {
            color: tc.textPrimary,
            fontFamily: Typography.fonts.data,
            fontSize: Typography.sizes.caption,
            marginBottom: Spacing.space2,
        },
        input: {
            backgroundColor: '#111827',
            color: '#FFFFFF',
            fontFamily: Typography.fonts.body,
            fontSize: Typography.sizes.bodyDense,
            padding: Spacing.space3,
            borderRadius: BorderRadius.default,
            borderWidth: 1,
            borderColor: '#374151',
            marginBottom: Spacing.space3,
        },
        row: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },

        testBtn: {
            backgroundColor: tc.brandNavy,
            borderWidth: 1,
            borderColor: '#374151',
            height: 48,
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: BorderRadius.default,
        },
        testBtnText: {
            color: tc.textInverse,
            fontFamily: Typography.fonts.h2,
            fontSize: Typography.sizes.bodyDense,
            letterSpacing: 1,
        },

        saveBtn: {
            backgroundColor: '#A5242B',
            height: 48,
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: BorderRadius.default,
        },
        saveBtnText: {
            color: tc.textPrimary,
            fontFamily: Typography.fonts.h2,
            fontSize: 16,
            letterSpacing: 1,
        },

        infoRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: Spacing.space2,
            borderBottomWidth: 1,
            borderBottomColor: tc.divider,
        },
        infoLabel: {
            color: tc.textSecondary,
            fontFamily: Typography.fonts.body,
            fontSize: Typography.sizes.bodyDense,
        },
        infoValue: {
            color: tc.textPrimary,
            fontFamily: Typography.fonts.data,
            fontSize: Typography.sizes.caption,
        },
    }), [tc]);

    return (
        <ImageBackground
            source={require('../assets/lasersan-bg.png')}
            style={styles.bgImage}
            imageStyle={styles.bgImageStyle}
            resizeMode="cover"
        >
        <SafeAreaView style={styles.container} edges={['right', 'bottom', 'left']}>
            <ScrollView contentContainerStyle={styles.content}>

                {/* BAĞLANTI AYARLARI */}
                <View style={[styles.section, { borderTopWidth: 0, paddingTop: 0 }]}>
                    <Text style={styles.sectionHeader}>BAĞLANTI AYARLARI</Text>
                    <View style={styles.card}>
                        <Text style={styles.label}>API BASE URL</Text>
                        <TextInput
                            style={styles.input}
                            value={apiUrl}
                            onChangeText={setApiUrl}
                            autoCapitalize="none"
                            keyboardType="url"
                            placeholder="http://192.168.1.x:3000"
                            placeholderTextColor={tc.textSecondary}
                        />
                        <TouchableOpacity style={styles.testBtn} onPress={testConnection} disabled={testing}>
                            <Text style={styles.testBtnText}>{testing ? 'TEST EDİLİYOR...' : 'BAĞLANTIYI TEST ET'}</Text>
                        </TouchableOpacity>
                        {connectionResult === 'success' && (
                            <Text style={styles.connectionSuccess}>Bağlantı başarılı</Text>
                        )}
                        {connectionResult === 'error' && (
                            <Text style={styles.connectionError}>Bağlantı hatası</Text>
                        )}
                    </View>
                </View>

                {/* GEMİNİ AYARLARI */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>GEMİNİ AYARLARI</Text>
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <Text style={styles.label}>AI MODU: {useGemini ? 'GEMİNİ API' : 'MOCK (TEST)'}</Text>
                            <Switch
                                value={useGemini}
                                onValueChange={setUseGemini}
                                trackColor={{ false: tc.borderSubtle, true: Colors.brand.red }}
                                thumbColor={tc.textPrimary}
                            />
                        </View>

                        {useGemini && (
                            <View style={{ marginTop: Spacing.space4 }}>
                                <Text style={styles.label}>GEMİNİ API KEY</Text>
                                <TextInput
                                    style={styles.input}
                                    value={apiKey}
                                    onChangeText={setApiKey}
                                    secureTextEntry
                                    placeholder="AIzaSy..."
                                    placeholderTextColor={tc.textSecondary}
                                />
                                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveKey}>
                                    <Text style={styles.saveBtnText}>API KEY KAYDET</Text>
                                </TouchableOpacity>
                                {keySavedToast && (
                                    <Text style={styles.savedToast}>✓ Kaydedildi</Text>
                                )}
                            </View>
                        )}
                    </View>
                </View>

                {/* UYGULAMA BİLGİSİ */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>UYGULAMA BİLGİSİ</Text>
                    <View style={styles.card}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Versiyon</Text>
                            <Text style={styles.infoValue}>BoxScan v1.0</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Tasarım</Text>
                            <Text style={styles.infoValue}>Lasersan Factory V5</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Veritabanı</Text>
                            <Text style={styles.infoValue}>SQLite</Text>
                        </View>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
        </ImageBackground>
    );
}
