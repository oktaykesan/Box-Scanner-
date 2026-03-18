// BoxScan — LabelScreen: QR code preview + print (Lasersan Factory V5)

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

import { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Print from 'expo-print';
import { CheckCircle, Printer, Check } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius, Shadow } from '../constants/theme';
import { getQR } from '../services/api';
import { useScanStore } from '../store/useScanStore';

export default function LabelScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const boxId = params.boxId as string;
    const boxTitle = params.boxTitle as string || 'Untitled Box';

    const clearStore = useScanStore((s) => s.clearStore);

    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [printing, setPrinting] = useState(false);

    useEffect(() => {
        loadQR();
    }, []);

    const loadQR = async () => {
        try {
            const result = await getQR(boxId);
            setQrDataUrl(result.qrCodeDataUrl);
        } catch (err: any) {
            // QR load error silently handled — loading state covers UI
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = async () => {
        if (!qrDataUrl) return;
        setPrinting(true);
        try {
            const html = `
        <html>
          <head>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Courier New', Courier, monospace; }
              .label { text-align: center; padding: 20px; border: 4px solid #000; border-radius: 8px; max-width: 300px; }
              .qr { width: 220px; height: 220px; margin: 0 auto 16px; }
              .title { font-size: 24px; font-weight: 900; margin-bottom: 8px; text-transform: uppercase; font-family: Impact, sans-serif; letter-spacing: 1px; }
              .id { font-size: 14px; color: #000; word-break: break-all; font-weight: bold; }
              .brand { font-size: 14px; color: #000; margin-top: 16px; font-weight: bold; border-top: 2px solid #000; padding-top: 8px; }
            </style>
          </head>
          <body>
            <div class="label">
              <img class="qr" src="${qrDataUrl}" />
              <div class="title">${escapeHtml(boxTitle)}</div>
              <div class="id">ID: ${escapeHtml(boxId)}</div>
              <div class="brand">LASERSAN // BOXSCAN</div>
            </div>
          </body>
        </html>
      `;
            await Print.printAsync({ html });
        } catch (err: any) {
            // Print error silently handled — user can retry
        } finally {
            setPrinting(false);
        }
    };

    const goHome = () => {
        clearStore();
        router.replace('/');
    };

    return (
        <SafeAreaView style={styles.container} edges={['right', 'bottom', 'left']}>
            <View style={styles.content}>
                {/* Success header */}
                <View style={styles.successHeader}>
                    <CheckCircle color={Colors.status.running} size={64} strokeWidth={2} style={{ marginBottom: Spacing.space3 }} />
                    <Text style={styles.successTitle}>SİSTEME KAYDEDİLDİ</Text>
                    <Text style={styles.successSubtext}>QR operatif etiket yazdırmaya hazır</Text>
                </View>

                {/* QR Preview Card */}
                <View style={styles.qrCard}>
                    {loading ? (
                        <ActivityIndicator size="large" color={Colors.brand.red} />
                    ) : qrDataUrl ? (
                        <>
                            <Image
                                source={{ uri: qrDataUrl }}
                                style={styles.qrImage}
                                resizeMode="contain"
                            />
                            <Text style={styles.qrTitle}>{boxTitle.toUpperCase()}</Text>
                            <Text style={styles.qrId}>{boxId.slice(0, 8).toUpperCase()}...</Text>
                            <View style={styles.qrFooter}>
                                <Text style={styles.qrFooterText}>LASERSAN INC.</Text>
                            </View>
                        </>
                    ) : (
                        <Text style={styles.errorText}>QR VERİSİ ALINAMADI</Text>
                    )}
                </View>
            </View>

            {/* Action buttons */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.printBtn}
                    onPress={handlePrint}
                    disabled={printing || !qrDataUrl}
                    activeOpacity={0.8}
                >
                    {printing ? (
                        <ActivityIndicator color={Colors.text.primary} />
                    ) : (
                        <>
                            <Printer color={Colors.text.primary} size={24} strokeWidth={2} style={{ marginRight: Spacing.space2 }} />
                            <Text style={styles.printBtnText}>ETİKET YAZDIR</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.doneBtn} onPress={goHome} activeOpacity={0.8}>
                    <Check color={Colors.text.primary} size={24} strokeWidth={2} style={{ marginRight: Spacing.space2 }} />
                    <Text style={styles.doneBtnText}>İŞLEMİ TAMAMLA</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg.app },
    content: { flex: 1, padding: Spacing.space6, justifyContent: 'center', alignItems: 'center' },

    successHeader: { alignItems: 'center', marginBottom: Spacing.space6 },
    successTitle: {
        color: Colors.text.primary,
        fontFamily: Typography.fonts.h1,
        fontSize: Typography.sizes.h1,
        letterSpacing: 1,
    },
    successSubtext: {
        color: Colors.text.secondary,
        fontFamily: Typography.fonts.data,
        fontSize: Typography.sizes.caption,
        marginTop: Spacing.space2,
        letterSpacing: 1,
    },

    qrCard: {
        backgroundColor: '#FFFFFF', // pure white for standard QR readability
        borderRadius: BorderRadius.default,
        padding: Spacing.space6,
        alignItems: 'center',
        width: '90%',
        minHeight: 300,
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: Colors.border.subtle,
        ...Shadow.elevationBase,
    },
    qrImage: {
        width: 220,
        height: 220,
        marginBottom: Spacing.space4,
    },
    qrTitle: {
        color: '#000000',
        fontFamily: Typography.fonts.display,
        fontSize: Typography.sizes.h2,
        letterSpacing: 1,
        textAlign: 'center',
    },
    qrId: {
        color: '#333333',
        fontFamily: Typography.fonts.data,
        fontSize: Typography.sizes.data,
        marginTop: Spacing.space1,
        letterSpacing: 2,
    },
    qrFooter: {
        marginTop: Spacing.space4,
        paddingTop: Spacing.space2,
        borderTopWidth: 2,
        borderTopColor: '#000000',
        width: '100%',
        alignItems: 'center',
    },
    qrFooterText: {
        color: '#000000',
        fontFamily: Typography.fonts.data,
        fontSize: 10,
        letterSpacing: 2,
        fontWeight: 'bold',
    },
    errorText: {
        color: Colors.status.error,
        fontFamily: Typography.fonts.h2,
        fontSize: Typography.sizes.body,
    },

    footer: {
        padding: Spacing.space5,
        gap: Spacing.space3,
    },
    printBtn: {
        flexDirection: 'row',
        height: 64, // hardware button min height
        backgroundColor: Colors.brand.navy,
        borderRadius: BorderRadius.default,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border.subtle,
        ...Shadow.elevationBase,
    },
    printBtnText: {
        color: Colors.text.primary,
        fontFamily: Typography.fonts.h2,
        fontSize: Typography.sizes.body,
        letterSpacing: 1,
    },
    doneBtn: {
        flexDirection: 'row',
        height: 64, // hardware button min height
        backgroundColor: Colors.bg.surface,
        borderRadius: BorderRadius.default,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border.subtle,
    },
    doneBtnText: {
        color: Colors.text.primary,
        fontFamily: Typography.fonts.h2,
        fontSize: Typography.sizes.body,
        letterSpacing: 1,
    },
});
