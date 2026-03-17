import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Moon, Sun } from 'lucide-react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
    withRepeat,
    cancelAnimation,
    Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import RifleCanvas from './RifleCanvas';

export default function ThemeToggle() {
    const { isDark, toggleTheme } = useTheme();
    const [animating, setAnimating] = React.useState(false);
    const [goingToDark, setGoingToDark] = React.useState(false);
    const busyRef = useRef(false);
    const isFirstMount = useRef(true);

    const moonGlow = useSharedValue(0);
    const sunGlow  = useSharedValue(0);

    const smoothPulse = (sv: Animated.SharedValue<number>) => {
        sv.value = withRepeat(
            withSequence(
                withTiming(0.85, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.35, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            false
        );
    };

    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            if (isDark) smoothPulse(moonGlow);
            else        smoothPulse(sunGlow);
            return;
        }

        if (isDark) {
            cancelAnimation(sunGlow);
            sunGlow.value = withTiming(0, { duration: 600 });

            cancelAnimation(moonGlow);
            moonGlow.value = withSequence(
                withTiming(1.0,  { duration: 120, easing: Easing.out(Easing.quad) }),
                withTiming(0.55, { duration: 1600, easing: Easing.out(Easing.cubic) }),
                withRepeat(
                    withSequence(
                        withTiming(0.85, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
                        withTiming(0.35, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
                    ),
                    -1, false
                )
            );
        } else {
            cancelAnimation(moonGlow);
            moonGlow.value = withTiming(0, { duration: 600 });

            cancelAnimation(sunGlow);
            sunGlow.value = withSequence(
                withTiming(1.0,  { duration: 120, easing: Easing.out(Easing.quad) }),
                withTiming(0.55, { duration: 1600, easing: Easing.out(Easing.cubic) }),
                withRepeat(
                    withSequence(
                        withTiming(0.85, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
                        withTiming(0.35, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
                    ),
                    -1, false
                )
            );
        }
    }, [isDark]);

    const moonGlowStyle = useAnimatedStyle(() => ({ opacity: moonGlow.value }));
    const sunGlowStyle  = useAnimatedStyle(() => ({ opacity: sunGlow.value  }));

    const handlePress = (targetDark: boolean) => {
        if (busyRef.current) return;
        if (targetDark === isDark) return;
        busyRef.current = true;
        setGoingToDark(targetDark);
        setAnimating(true);
    };

    const handleComplete = () => {
        setAnimating(false);
        busyRef.current = false;
    };

    return (
        <View style={styles.bar}>

            {/* ── Moon — press to go DARK ── */}
            <TouchableOpacity
                style={[styles.iconBtn, isDark && styles.iconBtnActive]}
                onPress={() => handlePress(true)}
                activeOpacity={0.7}
                disabled={animating}
            >
                <Animated.View style={[styles.glowBg, { backgroundColor: '#c8d8ff' }, moonGlowStyle]} />
                <Moon
                    color="#e8edf5"
                    size={20}
                    strokeWidth={1.8}
                    style={{ opacity: isDark ? 1 : 0.55 }}
                />
            </TouchableOpacity>

            {/* ── Center rifle canvas ── */}
            <View style={styles.canvasArea}>
                {animating ? (
                    <RifleCanvas
                        key={String(goingToDark)}
                        goingToDark={goingToDark}
                        onThemeChange={toggleTheme}
                        onComplete={handleComplete}
                    />
                ) : (
                    <View style={[
                        styles.centerDot,
                        { backgroundColor: isDark ? '#3b82f6' : 'rgba(255,255,255,0.45)' }
                    ]} />
                )}
            </View>

            {/* ── Sun — press to go LIGHT ── */}
            <TouchableOpacity
                style={[styles.iconBtn, !isDark && styles.iconBtnActive]}
                onPress={() => handlePress(false)}
                activeOpacity={0.7}
                disabled={animating}
            >
                <Animated.View style={[styles.glowBg, { backgroundColor: '#fbbf24' }, sunGlowStyle]} />
                <Sun
                    color="#e8edf5"
                    size={20}
                    strokeWidth={1.8}
                    style={{ opacity: isDark ? 0.55 : 1 }}
                />
            </TouchableOpacity>

        </View>
    );
}

const styles = StyleSheet.create({
    bar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 60,
        paddingVertical: 4,
        paddingHorizontal: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
    },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    iconBtnActive: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    glowBg: {
        position: 'absolute',
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    canvasArea: {
        width: 140,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    centerDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
});
