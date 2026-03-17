import { useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { useFocusEffect } from 'expo-router';

export function useAIAudio() {
    const activateSound = useRef<Audio.Sound | null>(null);
    const deactivateSound = useRef<Audio.Sound | null>(null);
    const scanSound = useRef<Audio.Sound | null>(null);
    const completeSound = useRef<Audio.Sound | null>(null);

    const loadSounds = useCallback(async () => {
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });

            await Promise.allSettled([
                activateSound.current?.unloadAsync(),
                deactivateSound.current?.unloadAsync(),
                scanSound.current?.unloadAsync(),
                completeSound.current?.unloadAsync(),
            ]);

            const [a, d, s, c] = await Promise.all([
                Audio.Sound.createAsync(require('../assets/sounds/activate.wav')),
                Audio.Sound.createAsync(require('../assets/sounds/deactivate.wav')),
                Audio.Sound.createAsync(require('../assets/sounds/scan.wav')),
                Audio.Sound.createAsync(require('../assets/sounds/complete.wav')),
            ]);

            activateSound.current = a.sound;
            deactivateSound.current = d.sound;
            scanSound.current = s.sound;
            completeSound.current = c.sound;
        } catch (error) {
            console.warn('[Audio] Ses sistemi başlatılamadı:', error);
        }
    }, []); // ref'ler dependency gerektirmez

    useEffect(() => {
        loadSounds();
        return () => {
            activateSound.current?.unloadAsync().catch(() => { });
            deactivateSound.current?.unloadAsync().catch(() => { });
            scanSound.current?.unloadAsync().catch(() => { });
            completeSound.current?.unloadAsync().catch(() => { });
        };
    }, [loadSounds]);

    useFocusEffect(
        useCallback(() => {
            const check = async () => {
                const status = await activateSound.current?.getStatusAsync().catch(() => null);
                if (!status || !status.isLoaded) await loadSounds();
            };
            check();
        }, [loadSounds])
    );

    // Tek yerde tanımla, ref üzerinden çalışır — bağımlılık yok
    const playSound = useCallback(async (
        soundRef: React.MutableRefObject<Audio.Sound | null>
    ) => {
        try {
            if (!soundRef.current) return;
            const status = await soundRef.current.getStatusAsync();
            if (!status.isLoaded) return;
            if (status.isPlaying) await soundRef.current.stopAsync();
            await soundRef.current.setPositionAsync(0);
            await soundRef.current.playAsync();
        } catch (err) {
            console.warn('[Audio] Çalma hatası:', err);
        }
    }, []);

    const playActivate = useCallback(() => playSound(activateSound), [playSound]);
    const playDeactivate = useCallback(() => playSound(deactivateSound), [playSound]);
    const playScan = useCallback(() => playSound(scanSound), [playSound]);
    const playComplete = useCallback(() => playSound(completeSound), [playSound]);

    const stopScan = useCallback(async () => {
        try {
            if (!scanSound.current) return;
            const status = await scanSound.current.getStatusAsync();
            if (status.isLoaded && status.isPlaying) {
                await scanSound.current.stopAsync();
            }
        } catch (err) {
            console.warn('[Audio] Stop hatası:', err);
        }
    }, []);

    return { playActivate, playDeactivate, playScan, playComplete, stopScan };
}