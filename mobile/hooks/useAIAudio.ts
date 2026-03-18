import { useEffect, useCallback } from 'react';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useFocusEffect } from 'expo-router';

export function useAIAudio() {
    const activatePlayer = useAudioPlayer(require('../assets/sounds/activate.wav'));
    const deactivatePlayer = useAudioPlayer(require('../assets/sounds/deactivate.wav'));
    const scanPlayer = useAudioPlayer(require('../assets/sounds/scan.wav'));
    const completePlayer = useAudioPlayer(require('../assets/sounds/complete.wav'));

    useEffect(() => {
        setAudioModeAsync({
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
        }).catch((err) => {
            console.warn('[Audio] Ses modu ayarlanamadı:', err);
        });
    }, []);

    // useFocusEffect: ekrana dönüldüğünde ses modunu yeniden uygula
    useFocusEffect(
        useCallback(() => {
            setAudioModeAsync({
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
            }).catch((err) => {
                console.warn('[Audio] Ses modu (focus) ayarlanamadı:', err);
            });
        }, [])
    );

    const playSoundPlayer = useCallback((player: ReturnType<typeof useAudioPlayer>) => {
        try {
            player.seekTo(0);
            player.play();
        } catch (err) {
            console.warn('[Audio] Çalma hatası:', err);
        }
    }, []);

    const playActivate = useCallback(() => {
        playSoundPlayer(activatePlayer);
    }, [playSoundPlayer, activatePlayer]);

    const playDeactivate = useCallback(() => {
        playSoundPlayer(deactivatePlayer);
    }, [playSoundPlayer, deactivatePlayer]);

    const playScan = useCallback(() => {
        playSoundPlayer(scanPlayer);
    }, [playSoundPlayer, scanPlayer]);

    const playComplete = useCallback(() => {
        playSoundPlayer(completePlayer);
    }, [playSoundPlayer, completePlayer]);

    const stopScan = useCallback(() => {
        try {
            scanPlayer.pause();
            scanPlayer.seekTo(0);
        } catch (err) {
            console.warn('[Audio] Stop hatası:', err);
        }
    }, [scanPlayer]);

    return { playActivate, playDeactivate, playScan, playComplete, stopScan };
}
