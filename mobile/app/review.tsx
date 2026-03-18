// BoxScan — ReviewScreen: Edit & confirm AI results (Lasersan Factory V5)

import { useState, useCallback, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import {
    View, Text, TouchableOpacity, TextInput, StyleSheet,
    ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus, X, Save, Bot, CheckCircle, AlertTriangle, AlertOctagon, ChevronLeft } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius, Shadow } from '../constants/theme';
import { Config } from '../constants/config';
import { createBox } from '../services/api';
import { useScanStore } from '../store/useScanStore';

interface ItemEntry {
    name: string;
    quantity: string;
    category: string;
}

export default function ReviewScreen() {
    const router = useRouter();

    // Store'dan selector pattern ile oku
    const result = useScanStore((s) => s.result);
    const processStatus = useScanStore((s) => s.processStatus);
    const clearStore = useScanStore((s) => s.clearStore);

    const [items, setItems] = useState<ItemEntry[]>([]);
    const [title, setTitle] = useState('');
    const [location, setLocation] = useState('');
    const [saving, setSaving] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    // Edge case: store boş ama ekrana düşüldüyse (deep link, hot reload vb.)
    // saving kontrolü: handleSave sırasında clearStore() çağrısı bu guard'ı yanlış tetiklemesin
    useEffect(() => {
        if (processStatus === 'idle' && !result && !saving) {
            router.replace('/');
        }
    }, [processStatus, result, saving]);

    // Store'dan state'i doldur
    useFocusEffect(
        useCallback(() => {
            if (!result) return;

            setItems(result.items.map((i) => ({
                name: i.name || '',
                quantity: String(i.quantity ?? 1),
                category: i.category || i.notes || 'uncategorized',
            })));
            setTitle(result.suggestedTitle);
            setLocation(result.suggestedLocation);
            setSaving(false);
        }, [result])
    );

    // Hasar/tehlike tespitinde haptic
    useEffect(() => {
        if (!result) return;
        if (result.hazardFlag || result.damageFlag) {
            const timer = setTimeout(() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [result?.hazardFlag, result?.damageFlag]);

    const updateItem = (index: number, field: keyof ItemEntry, value: string) => {
        const updated = [...items];
        updated[index] = { ...updated[index], [field]: value };
        setItems(updated);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const addItem = () => {
        setItems([...items, { name: '', quantity: '1', category: 'uncategorized' }]);
    };

    const handleSave = async () => {
        if (!result) return;

        const validItems = items.filter((i) => i.name.trim());
        if (validItems.length === 0) {
            Alert.alert('Eksik Veri', 'Sisteme kaydetmek için en az bir öğe girmelisiniz.');
            return;
        }

        setSaving(true);
        try {
            const box = await createBox({
                title: title.trim() || undefined,
                location: location.trim() || undefined,
                items: validItems.map((i) => ({
                    name: i.name.trim(),
                    quantity: parseInt(i.quantity) || 1,
                    category: i.category.trim() || 'uncategorized',
                })),
                imageUrls: result.imageUrls.length > 0
                    ? result.imageUrls
                    : result.imageUrl ? [result.imageUrl] : [],
                damage_flag: result.damageFlag,
                damage_notes: result.damageFlag ? result.damageNotes : null,
                hazard_flag: result.hazardFlag,
                hazard_notes: result.hazardFlag ? result.hazardNotes : null,
                summary: result.summary || undefined,
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace({
                pathname: '/label',
                params: { boxId: box.id, boxTitle: box.title || '' },
            });
        } catch (err: any) {
            Alert.alert('Sistem Hatası', err.message || 'Veritabanı kayıt işlemi gerçekleştirilemedi.');
        } finally {
            setSaving(false);
        }
    };

    // Geri dönüş — değişiklik kontrolü
    const handleBack = () => {
        if (!result) { router.back(); return; }

        const originalItems = result.items.map((i) => ({
            name: i.name || '',
            quantity: String(i.quantity ?? 1),
            category: i.category || i.notes || 'uncategorized',
        }));

        const hasChanges =
            title !== result.suggestedTitle ||
            location !== result.suggestedLocation ||
            JSON.stringify(items) !== JSON.stringify(originalItems);

        if (hasChanges) {
            Alert.alert(
                'Değişiklikler Kaybolacak',
                'Yaptığınız değişiklikler kaybolacak. Devam edilsin mi?',
                [
                    { text: 'İPTAL', style: 'cancel' },
                    { text: 'DEVAM ET', style: 'destructive', onPress: () => router.back() },
                ]
            );
        } else {
            router.back();
        }
    };

    // Store henüz hazır değilse bekle
    if (!result) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator color={Colors.blue.default} style={{ flex: 1 }} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['right', 'bottom', 'left']}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.reviewHeader}>
                    <TouchableOpacity style={styles.reviewBackBtn} onPress={handleBack}>
                        <ChevronLeft color={Colors.text.primary} size={22} strokeWidth={2} />
                        <Text style={styles.reviewBackText}>YENİDEN ÇEK</Text>
                    </TouchableOpacity>
                    <Text style={styles.reviewHeaderTitle}>ANALİZ SONUCU</Text>
                    <View style={{ width: 80 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>

                    {result.hazardFlag && (
                        <View style={styles.hazardBanner}>
                            <AlertOctagon color="#FCA5A5" size={16} strokeWidth={2} style={{ marginRight: Spacing.space2 }} />
                            <Text style={styles.hazardBannerText}>⚡ Tehlikeli Madde: {result.hazardNotes || '—'}</Text>
                        </View>
                    )}

                    {result.damageFlag && (
                        <View style={styles.damageBanner}>
                            <AlertTriangle color="#FCD34D" size={16} strokeWidth={2} style={{ marginRight: Spacing.space2 }} />
                            <Text style={styles.damageBannerText}>⚠ Hasar Tespit Edildi: {result.damageNotes || '—'}</Text>
                        </View>
                    )}

                    <View style={styles.aiInfoCard}>
                        <View style={styles.aiInfoHeader}>
                            <Bot color={Colors.red.default} size={14} strokeWidth={2} />
                            <Text style={styles.aiInfoProvider}>AI ANALİZ: {result.provider.toUpperCase()}</Text>
                            {result.status === 'success'
                                ? <CheckCircle color={Colors.status.success} size={14} strokeWidth={2} />
                                : <AlertTriangle color={Colors.status.warning} size={14} strokeWidth={2} />
                            }
                        </View>
                        {result.confidence > 0 && (
                            <Text style={styles.aiInfoConfidence}>
                                Güven: %{Math.round(result.confidence * 100)}
                            </Text>
                        )}
                        {result.analysisNotes ? (
                            <Text style={styles.aiInfoNotes}>{result.analysisNotes}</Text>
                        ) : null}
                        <Text style={styles.aiInfoHint}>Verileri kaydetmeden önce doğrulayın.</Text>
                    </View>

                    {result.imageUrls.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.label}>YÜKLENEN FOTOĞRAFLAR ({result.imageUrls.length})</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.space3, marginTop: Spacing.space2 }}>
                                {result.imageUrls.map((url, index) => (
                                    <View key={index} style={styles.photoPreviewCard}>
                                        <Image
                                            source={{ uri: url.startsWith('http') ? url : `${Config.API_BASE_URL}${url}` }}
                                            style={styles.photoPreviewImage}
                                            resizeMode="cover"
                                        />
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    <View style={styles.section}>
                        <Text style={styles.label}>KUTU SEVİYESİ BAŞLIK</Text>
                        <TextInput
                            style={[styles.input, { borderColor: focusedField === 'title' ? Colors.blue.default : Colors.border.subtle }]}
                            placeholder="ÖRN: ELEKTRONİK MODÜLLER"
                            placeholderTextColor={Colors.text.secondary}
                            value={title}
                            onChangeText={setTitle}
                            onFocus={() => setFocusedField('title')}
                            onBlur={() => setFocusedField(null)}
                        />
                        {result.suggestedTitle && title !== result.suggestedTitle && (
                            <TouchableOpacity style={styles.aiSuggestBtn} onPress={() => setTitle(result.suggestedTitle)}>
                                <Text style={styles.aiSuggestBtnText} numberOfLines={1}>
                                    ✦ AI ÖNERİSİ: "{result.suggestedTitle}"
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>LOKASYON / RAF KODU</Text>
                        <TextInput
                            style={[styles.input, { borderColor: focusedField === 'location' ? Colors.blue.default : Colors.border.subtle }]}
                            placeholder="ÖRN: B-BLOK RAF 14"
                            placeholderTextColor={Colors.text.secondary}
                            value={location}
                            onChangeText={setLocation}
                            onFocus={() => setFocusedField('location')}
                            onBlur={() => setFocusedField(null)}
                        />
                        {result.suggestedLocation && location !== result.suggestedLocation && (
                            <TouchableOpacity style={styles.aiSuggestBtn} onPress={() => setLocation(result.suggestedLocation)}>
                                <Text style={styles.aiSuggestBtnText} numberOfLines={1}>
                                    ✦ AI ÖNERİSİ: "{result.suggestedLocation}"
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {result.summary ? (
                        <View style={styles.summaryBox}>
                            <Text style={styles.summaryText}>{result.summary}</Text>
                        </View>
                    ) : null}

                    <View style={[styles.section, { paddingBottom: 60 }]}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.label}>ENVANTER İÇERİĞİ ({items.length})</Text>
                            <TouchableOpacity onPress={addItem} style={styles.addBtn}>
                                <Plus color={Colors.blue.bright} size={16} strokeWidth={2} style={{ marginRight: Spacing.space1 }} />
                                <Text style={styles.addBtnText}>SATIR EKLE</Text>
                            </TouchableOpacity>
                        </View>

                        {items.map((item, index) => (
                            <View key={index} style={styles.itemCard}>
                                <View style={styles.itemRow}>
                                    <TextInput
                                        style={[styles.itemInput, { flex: 2 }]}
                                        placeholder="PARÇA TANIMI"
                                        placeholderTextColor={Colors.text.secondary}
                                        value={item.name}
                                        onChangeText={(v) => updateItem(index, 'name', v)}
                                    />
                                    <TextInput
                                        style={[styles.itemInput, styles.quantityInput]}
                                        placeholder="MKT"
                                        placeholderTextColor={Colors.text.secondary}
                                        value={item.quantity}
                                        onChangeText={(v) => updateItem(index, 'quantity', v)}
                                        keyboardType="number-pad"
                                    />
                                    <TouchableOpacity onPress={() => removeItem(index)} style={styles.removeBtn}>
                                        <X color={Colors.red.default} size={20} strokeWidth={2} />
                                    </TouchableOpacity>
                                </View>
                                <TextInput
                                    style={[styles.itemInput, styles.categoryInput]}
                                    placeholder="KATEGORİ KODU"
                                    placeholderTextColor={Colors.text.secondary}
                                    value={item.category}
                                    onChangeText={(v) => updateItem(index, 'category', v)}
                                />
                            </View>
                        ))}
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.saveBtn, saving && styles.savingBtn]}
                        onPress={handleSave}
                        disabled={saving}
                        activeOpacity={0.8}
                    >
                        {saving ? (
                            <ActivityIndicator color={Colors.text.primary} />
                        ) : (
                            <>
                                <Save color={Colors.text.primary} size={24} strokeWidth={2} style={{ marginRight: Spacing.space2 }} />
                                <Text style={styles.saveBtnText}>SİSTEME KAYDET</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg.app },
    scrollContent: { padding: Spacing.space4, paddingBottom: 90 },

    reviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.space4,
        paddingVertical: Spacing.space3,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.subtle,
    },
    reviewBackBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: Spacing.space2,
        paddingRight: Spacing.space2,
        minWidth: 80,
    },
    reviewBackText: {
        color: Colors.text.secondary,
        fontFamily: Typography.fonts.data,
        fontSize: Typography.sizes.caption,
        letterSpacing: 1,
    },
    reviewHeaderTitle: {
        color: Colors.text.primary,
        fontFamily: Typography.fonts.h2,
        fontSize: Typography.sizes.body,
        letterSpacing: 2,
    },

    aiInfoCard: {
        backgroundColor: Colors.bg.surface,
        borderWidth: 1,
        borderColor: Colors.border.default,
        borderLeftWidth: 4,
        borderLeftColor: Colors.red.default,
        borderRadius: BorderRadius.default,
        padding: Spacing.space3,
        marginBottom: Spacing.space4,
        gap: Spacing.space2,
    },
    aiInfoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.space2,
    },
    aiInfoProvider: {
        flex: 1,
        color: Colors.text.primary,
        fontFamily: Typography.fonts.data,
        fontSize: Typography.sizes.caption,
        letterSpacing: 1,
    },
    aiInfoConfidence: {
        color: Colors.text.secondary,
        fontFamily: Typography.fonts.data,
        fontSize: Typography.sizes.caption,
        letterSpacing: 0.5,
    },
    aiInfoNotes: {
        color: Colors.text.secondary,
        fontFamily: Typography.fonts.body,
        fontSize: 13,
        lineHeight: 18,
    },
    aiInfoHint: {
        color: Colors.text.tertiary,
        fontFamily: Typography.fonts.data,
        fontSize: Typography.sizes.caption,
        marginTop: Spacing.space1,
    },

    section: { marginBottom: Spacing.space5 },

    damageBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(217,119,6,0.18)',
        borderWidth: 1,
        borderColor: Colors.status.warning,
        borderLeftWidth: 4,
        borderLeftColor: Colors.status.warning,
        padding: Spacing.space3,
        borderRadius: BorderRadius.default,
        marginBottom: Spacing.space4,
    },
    damageBannerText: {
        fontFamily: Typography.fonts.body,
        fontSize: 13,
        color: '#FCD34D',
        flex: 1,
    },
    hazardBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(220,38,38,0.20)',
        borderWidth: 1,
        borderColor: Colors.red.default,
        borderLeftWidth: 4,
        borderLeftColor: Colors.red.default,
        padding: Spacing.space3,
        borderRadius: BorderRadius.default,
        marginBottom: Spacing.space4,
    },
    hazardBannerText: {
        fontFamily: Typography.fonts.body,
        fontSize: 13,
        color: '#FCA5A5',
        flex: 1,
    },
    aiHint: {
        fontFamily: Typography.fonts.data,
        fontSize: 10,
        color: '#4B5563',
        marginTop: Spacing.space1,
    },
    aiSuggestBtn: {
        marginTop: 6,
        paddingHorizontal: Spacing.space3,
        paddingVertical: 6,
        backgroundColor: Colors.blue.dim,
        borderWidth: 1,
        borderColor: Colors.blue.mid,
        borderRadius: BorderRadius.default,
    },
    aiSuggestBtnText: {
        color: Colors.blue.bright,
        fontFamily: Typography.fonts.data,
        fontSize: Typography.sizes.caption,
        letterSpacing: 0.5,
    },
    summaryBox: {
        backgroundColor: Colors.bg.elevated,
        borderLeftWidth: 3,
        borderLeftColor: Colors.blue.default,
        padding: Spacing.space3,
        marginBottom: Spacing.space4,
    },
    summaryText: {
        fontFamily: Typography.fonts.body,
        fontSize: 13,
        fontStyle: 'italic',
        color: '#9CA3AF',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.space2,
    },
    label: {
        color: Colors.text.secondary,
        fontFamily: Typography.fonts.data,
        fontSize: Typography.sizes.caption,
        letterSpacing: 1,
    },
    input: {
        backgroundColor: Colors.bg.surface,
        color: Colors.text.primary,
        fontFamily: Typography.fonts.body,
        fontSize: Typography.sizes.bodyDense,
        padding: Spacing.space3,
        borderRadius: BorderRadius.default,
        borderWidth: 1,
        borderColor: Colors.border.subtle,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.blue.dim,
        paddingVertical: Spacing.space1,
        paddingHorizontal: Spacing.space3,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.blue.mid,
    },
    addBtnText: {
        color: Colors.blue.bright,
        fontFamily: Typography.fonts.h2,
        fontSize: Typography.sizes.bodyDense,
        letterSpacing: 1,
    },
    itemCard: {
        backgroundColor: Colors.bg.surface,
        borderRadius: BorderRadius.default,
        padding: Spacing.space3,
        marginBottom: Spacing.space3,
        borderWidth: 1,
        borderColor: Colors.border.subtle,
        borderLeftWidth: 3,
        borderLeftColor: Colors.blue.default,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.space2,
    },
    itemInput: {
        backgroundColor: Colors.bg.app,
        color: Colors.text.primary,
        fontFamily: Typography.fonts.data,
        fontSize: Typography.sizes.data,
        padding: Spacing.space2,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.border.subtle,
    },
    quantityInput: {
        width: 64,
        textAlign: 'center',
    },
    categoryInput: {
        marginTop: Spacing.space2,
    },
    removeBtn: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.sm,
        backgroundColor: Colors.red.dim,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.red.mid,
    },
    footer: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        padding: Spacing.space4,
        backgroundColor: Colors.bg.app,
        borderTopWidth: 1,
        borderTopColor: Colors.border.subtle,
    },
    saveBtn: {
        flexDirection: 'row',
        height: 64,
        backgroundColor: Colors.blue.default,
        borderRadius: BorderRadius.default,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadow.elevationBase,
    },
    savingBtn: { opacity: 0.7 },
    saveBtnText: {
        color: Colors.text.primary,
        fontFamily: Typography.fonts.h2,
        fontSize: Typography.sizes.body,
        letterSpacing: 1,
    },
    photoPreviewCard: {
        width: 100, height: 100,
        borderRadius: BorderRadius.default,
        borderWidth: 1, borderColor: Colors.border.subtle,
        overflow: 'hidden',
    },
    photoPreviewImage: {
        width: '100%', height: '100%', backgroundColor: Colors.bg.surface,
    },
});