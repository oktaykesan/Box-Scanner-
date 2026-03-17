import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
    withDelay,
    Easing,
} from 'react-native-reanimated';
import Svg, { G, Rect, Circle, Line, Defs, RadialGradient, Stop } from 'react-native-svg';
import type { Particle } from './types';

// Component dimensions (fits in 280px drawer with 24px padding each side)
const CW = 140;
const CH = 44;
// SVG logical coords: viewBox "-110 -28 220 56" → center at (0,0)
const VW = 220;
const VH = 56;

const PARTICLE_COLORS = ['#ffcc44', '#ff8822', '#ffee88', '#ff3311', '#ffffff', '#ff6600'];

interface Props {
    goingToDark: boolean;
    onThemeChange: () => void;
    onComplete: () => void;
}

export default function RifleCanvas({ goingToDark, onThemeChange, onComplete }: Props) {
    const scale = useSharedValue(0);
    const rotateYDeg = useSharedValue(0);

    const [muzzleFlash, setMuzzleFlash] = useState(false);
    const [particles, setParticles] = useState<Particle[]>([]);
    const particlesRef = useRef<Particle[]>([]);
    const rafRef = useRef<number>(0);

    // Rotation direction: going dark = spin left (-365), going light = spin right (+365)
    const spinDir = goingToDark ? -1 : 1;
    // Muzzle is at x=80 in SVG coords (pointing right), y=-1
    // When goingToDark, the rifle faces left (scale -1 in SVG) → muzzle at x=-80
    const muzzleX = goingToDark ? -80 : 80;
    const muzzleY = -1;

    const spawnParticles = () => {
        // baseAngle: going dark → shoot left (Math.PI), going light → shoot right (0)
        const baseAngle = goingToDark ? Math.PI : 0;
        const ps: Particle[] = Array.from({ length: 22 }, (_, i) => {
            const spread = (Math.random() - 0.5) * (110 * Math.PI / 180); // ±55°
            const angle = baseAngle + spread;
            const speed = 2.2 + Math.random() * 4.8;
            return {
                id: i,
                x: muzzleX,
                y: muzzleY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
                opacity: 1,
                life: 0,
                maxLife: 28 + Math.floor(Math.random() * 16),
                size: 1.5 + Math.random() * 2,
            };
        });
        particlesRef.current = ps;
        setParticles([...ps]);

        const loop = () => {
            particlesRef.current = particlesRef.current
                .map(p => ({
                    ...p,
                    x: p.x + p.vx,
                    y: p.y + p.vy,
                    vy: p.vy + 0.18,
                    life: p.life + 1,
                    opacity: Math.max(0, 1 - p.life / p.maxLife),
                }))
                .filter(p => p.life < p.maxLife);

            setParticles([...particlesRef.current]);
            if (particlesRef.current.length > 0) {
                rafRef.current = requestAnimationFrame(loop);
            }
        };
        rafRef.current = requestAnimationFrame(loop);
    };

    useEffect(() => {
        scale.value = 0;
        rotateYDeg.value = 0;

        // Phase 1 enter (200ms) + Phase 3 exit (800ms after 1300ms)
        scale.value = withSequence(
            withTiming(1, { duration: 200 }),
            withDelay(1100, withTiming(0, { duration: 800, easing: Easing.out(Easing.quad) }))
        );

        // Phase 2: rotate 365° (starts at 200ms, 1100ms duration)
        rotateYDeg.value = withDelay(200, withTiming(spinDir * 365, {
            duration: 1100,
            easing: Easing.inOut(Easing.cubic),
        }));

        // Muzzle flash at 750ms (200 enter + 550ms = half-rotation)
        const t1 = setTimeout(() => {
            setMuzzleFlash(true);
            spawnParticles();
            setTimeout(() => setMuzzleFlash(false), 110);
        }, 750);

        // Theme change at 827ms
        const t2 = setTimeout(onThemeChange, 827);

        // Complete at 2100ms
        const t3 = setTimeout(onComplete, 2100);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            cancelAnimationFrame(rafRef.current);
        };
    }, []);

    const animStyle = useAnimatedStyle(() => ({
        transform: [
            { perspective: 600 },
            { scaleX: scale.value },
            { scaleY: scale.value },
            { rotateY: `${rotateYDeg.value}deg` },
        ],
    }));

    // Muzzle flash rays at 8 angles
    const flashRays = [0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
        const rad = deg * Math.PI / 180;
        return {
            x1: muzzleX + Math.cos(rad) * 5,
            y1: muzzleY + Math.sin(rad) * 5,
            x2: muzzleX + Math.cos(rad) * 18,
            y2: muzzleY + Math.sin(rad) * 18,
        };
    });

    return (
        <View style={{ width: CW, height: CH, alignItems: 'center', justifyContent: 'center' }}>
            {/* Rifle (3D rotated) */}
            <Animated.View style={[{ position: 'absolute', width: CW, height: CH }, animStyle]}>
                <Svg
                    width={CW}
                    height={CH}
                    viewBox={`${-VW / 2} ${-VH / 2} ${VW} ${VH}`}
                >
                    <G transform={`scale(${goingToDark ? -1 : 1}, 1)`}>
                        {/* Stock - tan */}
                        <Rect x={-78} y={-10} width={18} height={20} fill="#c4a882" rx={2} ry={2} />
                        {/* Buffer tube - gray cylinder */}
                        <Rect x={-58} y={-4} width={28} height={8} fill="#555" rx={4} ry={4} />
                        {/* Lower receiver */}
                        <Rect x={-42} y={-5} width={34} height={16} fill="#1c1c1c" rx={1} ry={1} />
                        {/* Upper receiver - steel */}
                        <Rect x={-35} y={-11} width={38} height={18} fill="#3a3a3a" rx={2} ry={2} />
                        {/* Carry handle */}
                        <Rect x={-30} y={-20} width={22} height={9} fill="#3a3a3a" rx={1} ry={1} />
                        {/* Gas tube - thin */}
                        <Rect x={-53} y={-9} width={55} height={3} fill="#1a1a1a" rx={1} ry={1} />
                        {/* Handguard - plastic */}
                        <Rect x={-5} y={-8} width={65} height={16} fill="#1c1c1c" rx={2} ry={2} />
                        {/* Barrel */}
                        <Rect x={-5} y={-2} width={85} height={5} fill="#2a2a2a" rx={1} ry={1} />
                        {/* Muzzle ring */}
                        <Rect x={76} y={-4} width={8} height={9} fill="#444" rx={2} ry={2} />
                        {/* Pistol grip - wood */}
                        <G transform={`translate(-30, 8) rotate(${(0.22 * 180 / Math.PI).toFixed(2)})`}>
                            <Rect x={-5} y={-9} width={10} height={19} fill="#3d2a17" rx={2} ry={2} />
                        </G>
                        {/* Magazine */}
                        <G transform={`translate(-18, 12) rotate(${(0.09 * 180 / Math.PI).toFixed(2)})`}>
                            <Rect x={-6} y={-14} width={12} height={28} fill="#2a2a2a" rx={2} ry={2} />
                        </G>
                    </G>
                </Svg>
            </Animated.View>

            {/* Muzzle flash + particles layer (not affected by 3D transform) */}
            <Svg
                style={{ position: 'absolute', width: CW, height: CH }}
                width={CW}
                height={CH}
                viewBox={`${-VW / 2} ${-VH / 2} ${VW} ${VH}`}
                pointerEvents="none"
            >
                {/* Muzzle flash */}
                {muzzleFlash && (
                    <G>
                        <Circle cx={muzzleX} cy={muzzleY} r={12} fill="#ffcc00" opacity={0.9} />
                        <Circle cx={muzzleX} cy={muzzleY} r={5} fill="#ffffff" />
                        {flashRays.map((ray, i) => (
                            <Line
                                key={i}
                                x1={ray.x1}
                                y1={ray.y1}
                                x2={ray.x2}
                                y2={ray.y2}
                                stroke="#ffdd44"
                                strokeWidth={2}
                            />
                        ))}
                    </G>
                )}
                {/* Particles */}
                {particles.map(p => (
                    <Circle
                        key={p.id}
                        cx={p.x}
                        cy={p.y}
                        r={p.size}
                        fill={p.color}
                        opacity={p.opacity}
                    />
                ))}
            </Svg>
        </View>
    );
}
