import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ProcessStatus = 'idle' | 'analyzing' | 'done' | 'error';

export interface ScannedItem {
    name: string;
    quantity?: number;
    unit?: string;
    notes?: string;
}

export interface ScanResult {
    imageUrl: string;
    imageUrls: string[];
    items: ScannedItem[];
    provider: string;
    status: string;
    suggestedTitle: string;
    suggestedLocation: string;
    damageFlag: boolean;
    damageNotes: string;
    hazardFlag: boolean;
    hazardNotes: string;
    confidence: number;
    analysisNotes: string;
    summary: string;
}

interface ScanStore {
    processStatus: ProcessStatus;
    error: string | null;
    result: ScanResult | null;
    setProcessStatus: (status: ProcessStatus, error?: string | null) => void;
    setResult: (result: ScanResult) => void;
    clearStore: () => void;
}

export const useScanStore = create<ScanStore>()(
    persist(
        (set) => ({
            processStatus: 'idle',
            error: null,
            result: null,
            setProcessStatus: (status, error = null) => set({ processStatus: status, error }),
            setResult: (result) => set({ result, processStatus: 'done', error: null }),
            clearStore: () => set({ processStatus: 'idle', error: null, result: null }),
        }),
        {
            name: 'scan-store',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);