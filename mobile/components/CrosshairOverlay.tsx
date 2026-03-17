import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    withSequence,
    withDelay,
    cancelAnimation,
    Easing,
    type SharedValue,
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../constants/theme';

interface CrosshairOverlayProps {
    isVisible: boolean;
    isAnalyzing: boolean;
}

export function CrosshairOverlay({ isVisible, isAnalyzing }: CrosshairOverlayProps) {
    const crosshairOpacity = useSharedValue(0);
    const bracketScale = useSharedValue(1.3);
    const idleBreathe = useSharedValue(1);

    // For radar-like staggered effect in the center
    const pulse1 = useSharedValue(0.2);
    const pulse2 = useSharedValue(0.2);
    const pulse3 = useSharedValue(0.2);
    const pulse4 = useSharedValue(0.2);

    useFocusEffect(
        React.useCallback(() => {
            return () => {
                cancelAnimation(crosshairOpacity);
                cancelAnimation(bracketScale);
                cancelAnimation(idleBreathe);
                cancelAnimation(pulse1);
                cancelAnimation(pulse2);
                cancelAnimation(pulse3);
                cancelAnimation(pulse4);
                // Reset to initial state for next focus
                crosshairOpacity.value = 0;
                bracketScale.value = 1.3;
                idleBreathe.value = 1;
                pulse1.value = 0.2;
                pulse2.value = 0.2;
                pulse3.value = 0.2;
                pulse4.value = 0.2;
            };
        }, [])
    );

    useEffect(() => {
        if (isVisible) {
            crosshairOpacity.value = withTiming(1, { duration: 300 });

            if (isAnalyzing) {
                cancelAnimation(idleBreathe);
                idleBreathe.value = 1;

                // Brackets close in to "lock on"
                bracketScale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });

                // Staggered radar pulses
                const startPulse = (sv: SharedValue<number>, delay: number) => {
                    sv.value = withDelay(
                        delay,
                        withRepeat(
                            withSequence(
                                withTiming(1, { duration: 400 }),
                                withTiming(0.2, { duration: 800 })
                            ),
                            -1,
                            false
                        )
                    );
                };

                startPulse(pulse1, 0);
                startPulse(pulse2, 300);
                startPulse(pulse3, 600);
                startPulse(pulse4, 900);

            } else {
                // Reset to idle state
                bracketScale.value = withTiming(1.3, { duration: 400, easing: Easing.inOut(Easing.ease) });
                cancelAnimation(pulse1);
                cancelAnimation(pulse2);
                cancelAnimation(pulse3);
                cancelAnimation(pulse4);
                pulse1.value = 0.2;
                pulse2.value = 0.2;
                pulse3.value = 0.2;
                pulse4.value = 0.2;

                // Idle breathe on the bracket container opacity
                idleBreathe.value = withRepeat(
                    withSequence(
                        withTiming(0.55, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
                        withTiming(1.0, { duration: 1800, easing: Easing.inOut(Easing.ease) })
                    ),
                    -1,
                    false
                );
            }
        } else {
            crosshairOpacity.value = withTiming(0, { duration: 200 });
            cancelAnimation(idleBreathe);
            cancelAnimation(bracketScale);
            cancelAnimation(pulse1);
            cancelAnimation(pulse2);
            cancelAnimation(pulse3);
            cancelAnimation(pulse4);
        }
    }, [isVisible, isAnalyzing]);

    const containerStyle = useAnimatedStyle(() => ({
        opacity: crosshairOpacity.value,
        // no transform here — scale is applied to brackets only
    }));

    const bracketScaleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: bracketScale.value }],
        opacity: idleBreathe.value,
    }));

    const pulse1Style = useAnimatedStyle(() => ({
        opacity: pulse1.value,
        transform: [{ scale: 0.8 + (pulse1.value * 0.4) }],
    }));
    const pulse2Style = useAnimatedStyle(() => ({
        opacity: pulse2.value,
        transform: [{ scale: 0.8 + (pulse2.value * 0.4) }],
    }));
    const pulse3Style = useAnimatedStyle(() => ({
        opacity: pulse3.value,
        transform: [{ scale: 0.8 + (pulse3.value * 0.4) }],
    }));
    const pulse4Style = useAnimatedStyle(() => ({
        opacity: pulse4.value,
        transform: [{ scale: 0.8 + (pulse4.value * 0.4) }],
    }));

    return (
        <View style={styles.wrapper} pointerEvents="none">
            <Animated.View style={[styles.container, containerStyle]}>

                {/* Brackets only — scale animates here */}
                <Animated.View style={[styles.bracketContainer, bracketScaleStyle]}>
                    <View style={[styles.bracket, styles.bracketTL]} />
                    <View style={[styles.bracket, styles.bracketTR]} />
                    <View style={[styles.bracket, styles.bracketBL]} />
                    <View style={[styles.bracket, styles.bracketBR]} />
                </Animated.View>

                {/* Radar — fixed size, not affected by bracket scale */}
                <View style={styles.radarContainer}>
                    <Animated.View style={[styles.dash, styles.dashTop, pulse1Style]} />
                    <Animated.View style={[styles.dash, styles.dashRight, pulse2Style]} />
                    <Animated.View style={[styles.dash, styles.dashBottom, pulse3Style]} />
                    <Animated.View style={[styles.dash, styles.dashLeft, pulse4Style]} />
                </View>

            </Animated.View>
        </View>
    );
}

const BRACKET_SIZE = 30;
const BRACKET_THICKNESS = 3;
const BRACKET_COLOR = 'rgba(59,130,246,0.9)';
const BOX = 240;

const styles = StyleSheet.create({
    wrapper: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    container: {
        width: BOX,
        height: BOX,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bracketContainer: {
        position: 'absolute',
        width: BOX,
        height: BOX,
    },
    bracket: {
        position: 'absolute',
        width: BRACKET_SIZE,
        height: BRACKET_SIZE,
        borderColor: BRACKET_COLOR,
    },
    bracketTL: {
        top: 0,
        left: 0,
        borderTopWidth: BRACKET_THICKNESS,
        borderLeftWidth: BRACKET_THICKNESS,
    },
    bracketTR: {
        top: 0,
        right: 0,
        borderTopWidth: BRACKET_THICKNESS,
        borderRightWidth: BRACKET_THICKNESS,
    },
    bracketBL: {
        bottom: 0,
        left: 0,
        borderBottomWidth: BRACKET_THICKNESS,
        borderLeftWidth: BRACKET_THICKNESS,
    },
    bracketBR: {
        bottom: 0,
        right: 0,
        borderBottomWidth: BRACKET_THICKNESS,
        borderRightWidth: BRACKET_THICKNESS,
    },
    radarContainer: {
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dash: {
        position: 'absolute',
        backgroundColor: Colors.red.default,
        borderRadius: 2,
    },
    dashTop:    { width: 4, height: 12, top: 0 },
    dashBottom: { width: 4, height: 12, bottom: 0 },
    dashLeft:   { width: 12, height: 4, left: 0 },
    dashRight:  { width: 12, height: 4, right: 0 },
});
