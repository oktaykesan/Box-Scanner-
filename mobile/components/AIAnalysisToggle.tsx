import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { ScanLine } from 'lucide-react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withRepeat,
    withSequence,
    interpolateColor,
    interpolate,
    Extrapolation,
    cancelAnimation
} from 'react-native-reanimated';
import { Colors, Spacing, Typography, BorderRadius, Shadow, Motion } from '../constants/theme';
import { useFocusEffect } from 'expo-router';

interface AIAnalysisToggleProps {
    isEnabled: boolean;
    isAnalyzing: boolean;
    onToggle: (enabled: boolean) => void;
}

export function AIAnalysisToggle({ isEnabled, isAnalyzing, onToggle }: AIAnalysisToggleProps) {
    // Reanimated Shared Values
    const toggleProgress = useSharedValue(isEnabled ? 1 : 0);
    const rippleRadius = useSharedValue(0);
    const rippleOpacity = useSharedValue(0);
    const blinkOpacity = useSharedValue(0);
    const spinValue = useSharedValue(0);

    // Entrance scale + container height
    const scaleValue = useSharedValue(0.82);
    const maxH = useSharedValue(isEnabled ? 120 : 60);

    useFocusEffect(
        React.useCallback(() => {
            // Entrance: spring to full scale
            scaleValue.value = withSpring(1, Motion.spring.snappy);
            return () => {
                cancelAnimation(toggleProgress);
                cancelAnimation(rippleRadius);
                cancelAnimation(rippleOpacity);
                cancelAnimation(blinkOpacity);
                cancelAnimation(spinValue);
                cancelAnimation(scaleValue);
                cancelAnimation(maxH);
            };
        }, [])
    );

    useEffect(() => {
        if (isEnabled) {
            toggleProgress.value = withSpring(1, Motion.spring.toggle);
            maxH.value = withTiming(120, { duration: 300 });

            // Smooth spin with easing — perspective added in style for 3D feel
            spinValue.value = withRepeat(
                withSequence(
                    withTiming(0,   { duration: 900 }),
                    withTiming(180, { duration: 700 }),
                    withTiming(180, { duration: 900 }),
                    withTiming(360, { duration: 700 })
                ),
                -1,
                false
            );
        } else {
            toggleProgress.value = withTiming(0, { duration: Motion.fast });
            maxH.value = withTiming(60, { duration: 300 });
            cancelAnimation(spinValue);
            spinValue.value = withSpring(0, Motion.spring.snappy);
        }
    }, [isEnabled]);

    const handlePress = () => {
        if (isAnalyzing) return;
        
        // Trigger ripple
        rippleRadius.value = 0;
        rippleOpacity.value = 0.7;
        rippleRadius.value = withTiming(280, { duration: 900 });
        rippleOpacity.value = withTiming(0, { duration: 900 });

        onToggle(!isEnabled);
    };

    const containerStyle = useAnimatedStyle(() => {
        const bg = interpolateColor(
            toggleProgress.value,
            [0, 1],
            [Colors.bg.surface, Colors.bg.elevated]
        );
        const borderColor = interpolateColor(
            toggleProgress.value,
            [0, 1],
            [Colors.border.subtle, Colors.blue.mid]
        );
        return {
            backgroundColor: bg,
            borderColor,
            maxHeight: maxH.value,
            transform: [{ scale: scaleValue.value }],
        };
    });

    const accentBarStyle = useAnimatedStyle(() => {
        const opacity = interpolate(toggleProgress.value, [0, 1], [0, 1], Extrapolation.CLAMP);
        return {
            opacity,
            backgroundColor: Colors.blue.light,
            shadowColor: Colors.blue.default,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: opacity,
            shadowRadius: 8,
            elevation: opacity * 8,
        };
    });

    const trackStyle = useAnimatedStyle(() => {
        const bg = interpolateColor(toggleProgress.value, [0, 1], ['#0D0D0D', Colors.blue.dim]);
        const borderColor = interpolateColor(toggleProgress.value, [0, 1], [Colors.border.subtle, Colors.blue.mid]);
        return {
            backgroundColor: bg,
            borderColor,
        };
    });

    const thumbStyle = useAnimatedStyle(() => {
        const translateX = interpolate(toggleProgress.value, [0, 1], [0, 20], Extrapolation.CLAMP);
        const bgColor = interpolateColor(toggleProgress.value, [0, 1], [Colors.text.tertiary, Colors.blue.light]);
        const shadowOp = interpolate(toggleProgress.value, [0, 1], [0, 1], Extrapolation.CLAMP);
        
        return {
            transform: [{ translateX }],
            backgroundColor: bgColor,
            shadowColor: 'rgba(59,130,246,0.6)',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: shadowOp,
            shadowRadius: interpolate(toggleProgress.value, [0, 1], [0, 8], Extrapolation.CLAMP),
            elevation: interpolate(toggleProgress.value, [0, 1], [0, 8], Extrapolation.CLAMP),
        };
    });

    const rippleStyle = useAnimatedStyle(() => {
        return {
            width: rippleRadius.value,
            height: rippleRadius.value,
            borderRadius: rippleRadius.value / 2,
            opacity: rippleOpacity.value,
            position: 'absolute',
            alignSelf: 'center',
            borderWidth: 1,
            borderColor: Colors.blue.dim,
            backgroundColor: Colors.blue.glow,
            transform: [{ translateX: -rippleRadius.value / 2 }, { translateY: -rippleRadius.value / 2 }],
        };
    });

    const iconWrapperStyle = useAnimatedStyle(() => {
        const opacity = interpolate(toggleProgress.value, [0, 1], [0, 1], Extrapolation.CLAMP);
        return {
            opacity,
            transform: [
                { perspective: 800 },
                { rotateY: `${spinValue.value}deg` },
            ],
        };
    });



    const dotStyle = useAnimatedStyle(() => ({
        opacity: blinkOpacity.value,
    }));

    return (
        <Animated.View style={[styles.container, containerStyle]}>
            <Animated.View style={[styles.accentBar, accentBarStyle]} />
            <View style={styles.leftContent}>
                <Text style={styles.title}>YAPAY ZEKA (AI) ANALİZİ</Text>
                {isEnabled && !isAnalyzing && (
                    <Animated.View style={[styles.iconWrapper, iconWrapperStyle]}>
                        <ScanLine color={Colors.blue.light} size={18} strokeWidth={1.5} />
                    </Animated.View>
                )}
            </View>

            <Pressable onPress={handlePress} disabled={isAnalyzing} style={styles.pressableArea}>
                <View style={styles.rippleContainer}>
                    <Animated.View style={rippleStyle} />
                </View>
                <Animated.View style={[styles.track, trackStyle]}>
                    <Animated.View style={[styles.thumb, thumbStyle]} />
                </Animated.View>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.space3,
        paddingHorizontal: Spacing.space4,
        marginBottom: Spacing.space2,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        // overflow removed: scale animation was being clipped
    },
    leftContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontFamily: Typography.fonts.h2,
        fontSize: Typography.sizes.caption,
        color: Colors.text.primary,
        letterSpacing: 1,
    },
    iconWrapper: {
        width: 32,
        height: 32,
        borderRadius: 6,
        marginLeft: Spacing.space3,
        borderWidth: 1,
        borderColor: Colors.blue.mid,
        backgroundColor: Colors.blue.dim,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pressableArea: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.space2,
    },
    rippleContainer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    track: {
        width: 44,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        paddingHorizontal: 2,
        borderWidth: 1,
    },
    thumb: {
        width: 18,
        height: 18,
        borderRadius: 9,
    },
    accentBar: {
        position: 'absolute',
        left: 0,
        height: '100%',
        width: 2,
    }
});
