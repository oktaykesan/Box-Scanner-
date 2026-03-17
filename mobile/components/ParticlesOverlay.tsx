import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../constants/theme';

interface ParticlesOverlayProps {
    isActive: boolean;
}

interface Particle {
    id: number;
    angle: number; // 0 to 360 degrees
    distance: number; // max travel distance
    color: string;
    size: number;
    delay: number;
}

const BLUE_COLOR = Colors.blue.default;
const RED_COLOR = Colors.red.default;

export function ParticlesOverlay({ isActive }: ParticlesOverlayProps) {
    const [particles, setParticles] = useState<Particle[]>([]);
    const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
    const particleIdCounter = useRef(0);

    // Cleanup memory leaks
    useFocusEffect(
        React.useCallback(() => {
            return () => {
                timeoutRefs.current.forEach(clearTimeout);
                timeoutRefs.current = [];
            };
        }, [])
    );

    useEffect(() => {
        if (!isActive) {
            setParticles([]);
            // Clear all pending cleanup timers to prevent memory leak
            timeoutRefs.current.forEach(clearTimeout);
            timeoutRefs.current = [];
            return;
        }

        // We use a staggered approach so they feel continuous but not overly clumped
        const interval = setInterval(() => {
            // Spawn 1 particle per tick — interval itself provides natural stagger
            const id = particleIdCounter.current++;
            const isBlue = Math.random() > 0.3; // 70% blue, 30% red
            const newParticle: Particle = {
                id,
                angle: Math.random() * Math.PI * 2,
                distance: 80 + Math.random() * 60, // 80–140px radial distance
                color: isBlue ? BLUE_COLOR : RED_COLOR,
                size: 2 + Math.random() * 3,
                delay: 0, // no extra jitter — interval spacing is the stagger
            };

            setParticles(prev => [...prev, newParticle]);

            // Auto-remove after animation lifecycle
            const timer = setTimeout(() => {
                setParticles(prev => prev.filter(p => p.id !== newParticle.id));
            }, 1600);

            timeoutRefs.current.push(timer);
        }, 65); // 65ms ≈ ~15 particles/sec — smooth glide, not burst

        return () => {
            clearInterval(interval);
        };
    }, [isActive]);

    return (
        <View style={styles.container} pointerEvents="none">
            {particles.map((p) => (
                <ParticleView key={p.id} particle={p} />
            ))}
        </View>
    );
}

function ParticleView({ particle }: { particle: Particle }) {
    const progress = useSharedValue(0);

    useEffect(() => {
        // We delay the start slightly based on particle.delay, then animate to 1
        const timer = setTimeout(() => {
            progress.value = withTiming(1, { 
                duration: 1000 + Math.random() * 500, // 1s to 1.5s
                easing: Easing.out(Easing.cubic) 
            });
        }, particle.delay);
        
        return () => clearTimeout(timer);
    }, [particle.delay]);

    const animStyle = useAnimatedStyle(() => {
        // Calculate X and Y based on angle and current distance progress
        const currentDistance = progress.value * particle.distance;
        const translateX = Math.cos(particle.angle) * currentDistance;
        const translateY = Math.sin(particle.angle) * currentDistance;
        
        // Fade in quickly, hold, then fade out smoothly
        let opacity = 0;
        if (progress.value > 0) {
            opacity = progress.value < 0.2 
                ? progress.value * 5 // Fade in 0->1 over first 20%
                : 1 - ((progress.value - 0.2) / 0.8); // Fade out 1->0 over remaining 80%
        }

        return {
            opacity,
            transform: [
                { translateX },
                { translateY }
            ]
        };
    });

    return (
        <Animated.View
            style={[
                styles.particle,
                animStyle,
                {
                    backgroundColor: particle.color,
                    width: particle.size,
                    height: particle.size,
                    borderRadius: particle.size / 2,
                    shadowColor: particle.color,
                    shadowOpacity: 0.8,
                    shadowRadius: particle.size * 2,
                    elevation: 3,
                }
            ]}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 5,
    },
    particle: {
        position: 'absolute',
        // Start from exact center
    }
});
