import React, { createContext, useContext, useState, useCallback } from 'react';

export interface AppTheme {
    bg: string;
    surface: string;
    text: string;
    text2: string;
    border: string;
    accent: string;
}

const LIGHT: AppTheme = {
    bg: '#f0f4f8',
    surface: '#ffffff',
    text: '#0a0e1a',
    text2: '#4a5568',
    border: '#d1d9e6',
    accent: '#1e3158',
};

const DARK: AppTheme = {
    bg: '#080e1f',
    surface: '#0d1b35',
    text: '#e8edf5',
    text2: '#94a3b8',
    border: '#1e3158',
    accent: '#3b82f6',
};

interface ThemeContextValue {
    isDark: boolean;
    theme: AppTheme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [isDark, setIsDark] = useState(false);

    const toggleTheme = useCallback(() => {
        setIsDark(prev => !prev);
    }, []);

    return (
        <ThemeContext.Provider value={{ isDark, theme: isDark ? DARK : LIGHT, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
    return ctx;
}
