// DataRain — Matrix-style falling character rain component
// Usage: <DataRain opacity={0.85} active={processing} />

import React, { useEffect, useRef, useState, memo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const FONT_SIZE = 11;
const COLS = Math.floor(SCREEN_W / FONT_SIZE);
const ROWS = Math.ceil(SCREEN_H / FONT_SIZE) + 4;
const TRAIL_LENGTH = 14;
const FRAME_MS = 75; // ~13fps — smooth enough for matrix effect

// Character pool: hex digits + symbols + minimal katakana feel
const CHARS = '01234567890ABCDEF<>[]{}|/\\ΔΨΩ∑∏≠≈';

interface ColState {
    head: number;   // fractional row of the falling head
    chars: string[];
    speed: number;
}

function randomChar(): string {
    return CHARS[Math.floor(Math.random() * CHARS.length)];
}

function initCols(): ColState[] {
    return Array.from({ length: COLS }, () => ({
        head: -Math.floor(Math.random() * ROWS),
        chars: Array.from({ length: ROWS }, randomChar),
        speed: 0.4 + Math.random() * 1.4,
    }));
}

interface DataRainProps {
    /** 0–1 overall opacity of the whole layer */
    opacity?: number;
    /** Trail character color (navy) */
    trailColor?: string;
    /** Head character color (red accent) */
    headColor?: string;
    /** Mid-trail accent color */
    midColor?: string;
    /** Whether the animation is running */
    active?: boolean;
}

const DataRain = memo(function DataRain({
    opacity = 0.9,
    trailColor = '#162444',
    headColor = '#E8374A',
    midColor = '#4A6490',
    active = true,
}: DataRainProps) {
    const [cols, setCols] = useState<ColState[]>(initCols);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!active) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }

        intervalRef.current = setInterval(() => {
            setCols(prev =>
                prev.map(col => {
                    const newHead = col.head + col.speed;
                    const headRow = Math.floor(newHead);
                    const newChars = [...col.chars];

                    // Randomise char at the head position as it passes
                    if (headRow >= 0 && headRow < ROWS) {
                        newChars[headRow] = randomChar();
                    }

                    // Reset column when it scrolls off-screen
                    if (newHead > ROWS + TRAIL_LENGTH) {
                        return {
                            head: -Math.floor(Math.random() * 6),
                            chars: Array.from({ length: ROWS }, randomChar),
                            speed: 0.4 + Math.random() * 1.4,
                        };
                    }

                    return { ...col, head: newHead, chars: newChars };
                })
            );
        }, FRAME_MS);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [active]);

    return (
        <View
            style={[StyleSheet.absoluteFillObject, styles.root, { opacity }]}
            pointerEvents="none"
        >
            {cols.map((col, colIdx) => {
                const headRow = Math.floor(col.head);

                return (
                    <View
                        key={colIdx}
                        style={[styles.col, { left: colIdx * FONT_SIZE }]}
                    >
                        {col.chars.map((char, rowIdx) => {
                            const distance = headRow - rowIdx;

                            // Only render visible trail
                            if (distance < 0 || distance > TRAIL_LENGTH) return null;

                            const isHead = distance === 0;
                            const isMid = distance > 0 && distance <= 4;
                            const charOpacity = isHead
                                ? 1
                                : Math.max(0, 1 - distance / TRAIL_LENGTH);

                            const color = isHead ? headColor : isMid ? midColor : trailColor;

                            return (
                                <Text
                                    key={rowIdx}
                                    style={[
                                        styles.char,
                                        {
                                            color,
                                            opacity: charOpacity,
                                            top: rowIdx * FONT_SIZE,
                                            fontWeight: isHead ? '700' : '400',
                                        },
                                    ]}
                                >
                                    {char}
                                </Text>
                            );
                        })}
                    </View>
                );
            })}
        </View>
    );
});

export default DataRain;

const styles = StyleSheet.create({
    root: {
        overflow: 'hidden',
    },
    col: {
        position: 'absolute',
        top: 0,
        width: FONT_SIZE,
    },
    char: {
        position: 'absolute',
        fontSize: FONT_SIZE,
        lineHeight: FONT_SIZE,
        fontFamily: 'monospace',
        width: FONT_SIZE,
    },
});
