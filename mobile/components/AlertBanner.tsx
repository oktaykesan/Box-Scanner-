import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withRepeat,
    withSequence,
    Easing
} from 'react-native-reanimated';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius, Shadow } from '../constants/theme';

interface AlertBannerProps {
    visible: boolean;
    message: string;
    type?: 'default' | 'success' | 'warning' | 'error';
    onDismiss?: () => void;
}

export function AlertBanner({ visible, message, type = 'default', onDismiss }: AlertBannerProps) {
    const translateY = useSharedValue(-80);
    const iconPulse = useSharedValue(1);

    useEffect(() => {
        if (visible) {
            translateY.value = withTiming(16, { duration: 450, easing: Easing.bezier(0.34, 1.4, 0.64, 1) });
            iconPulse.value = withRepeat(
                withSequence(
                    withTiming(1.1, { duration: 400 }),
                    withTiming(1, { duration: 400 })
                ),
                -1,
                true
            );

            const timer = setTimeout(() => {
                if (onDismiss) onDismiss();
            }, 4500);
            return () => clearTimeout(timer);
        } else {
            translateY.value = withTiming(-80, { duration: 350, easing: Easing.bezier(0.4, 0.0, 0.2, 1) });
        }
    }, [visible, onDismiss]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const iconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: iconPulse.value }],
    }));

    const typeConfig = {
        success: {
            bg: 'rgba(16,185,129,0.15)',
            border: '#10B981',
            iconColor: '#10B981',
            textColor: '#A7F3D0',
            iconBg: 'rgba(16,185,129,0.12)',
            shadowColor: 'rgba(16,185,129,0.10)',
        },
        warning: {
            bg: 'rgba(217,119,6,0.20)',
            border: '#D97706',
            iconColor: '#FCD34D',
            textColor: '#FCD34D',
            iconBg: 'rgba(217,119,6,0.18)',
            shadowColor: 'rgba(217,119,6,0.15)',
        },
        error: {
            bg: 'rgba(220,38,38,0.18)',
            border: '#DC2626',
            iconColor: '#DC2626',
            textColor: '#FCA5A5',
            iconBg: 'rgba(220,38,38,0.15)',
            shadowColor: 'rgba(220,38,38,0.20)',
        },
        default: {
            bg: 'rgba(37,99,235,0.12)',
            border: 'rgba(37,99,235,0.30)',
            iconColor: Colors.blue.bright,
            textColor: Colors.blue.bright,
            iconBg: 'rgba(37,99,235,0.12)',
            shadowColor: 'rgba(37,99,235,0.10)',
        },
    };

    const colors = typeConfig[type] ?? typeConfig.default;

    if (!visible && translateY.value === -80) return null;

    return (
        <TouchableOpacity activeOpacity={0.85} onPress={() => onDismiss?.()} style={styles.touchWrapper}>
            <Animated.View style={[
                styles.container,
                animatedStyle,
                {
                    borderColor: colors.border,
                    backgroundColor: colors.bg,
                    shadowColor: colors.shadowColor,
                }
            ]}>
                {/* Left accent bar — instant severity indicator */}
                <View style={[styles.accentBar, { backgroundColor: colors.border }]} />
                <Animated.View style={[styles.iconContainer, iconStyle, { backgroundColor: colors.iconBg }]}>
                    {type === 'success' ? (
                        <CheckCircle2 color={colors.iconColor} size={24} strokeWidth={2} />
                    ) : type === 'error' ? (
                        <AlertCircle color={colors.iconColor} size={24} strokeWidth={2} />
                    ) : (
                        <Info color={colors.iconColor} size={24} strokeWidth={2} />
                    )}
                </Animated.View>
                <Text style={[styles.message, { color: colors.textColor }]}>{message}</Text>
            </Animated.View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    touchWrapper: {
        position: 'absolute',
        top: 0,
        left: Spacing.space4,
        right: Spacing.space4,
        zIndex: 999,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: Spacing.space3,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        overflow: 'hidden',
        // Using explicit shadow definitions per request:
        // box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 20px [dynamic-shadowColor]
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1, // Full opacity locally, relies on dynamic shadowColor alpha
        shadowRadius: 32,
        elevation: 8,
    },
    accentBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: Spacing.space3,
        justifyContent: 'center',
        alignItems: 'center',
    },
    message: {
        flex: 1,
        color: Colors.text.primary,
        fontFamily: Typography.fonts.body,
        fontSize: Typography.sizes.body,
        letterSpacing: 0.5,
    },
});
