import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export function useThemeColors() {
    const { isDark } = useTheme();

    return useMemo(() => ({
        bgApp:         isDark ? '#080e1f'                   : '#FFFFFF',
        bgSurface:     isDark ? '#0d1b35'                   : '#F7F8FA',
        bgElevated:    isDark ? '#111c2e'                   : '#FFFFFF',
        textPrimary:   isDark ? '#e8edf5'                   : '#080E1F',
        textSecondary: isDark ? '#94a3b8'                   : '#4A5568',
        textTertiary:  isDark ? '#4a6490'                   : '#9AA5B4',
        textInverse:   isDark ? '#080E1F'                   : '#FFFFFF',
        borderSubtle:  isDark ? '#1e3158'                   : '#F1F5F9',
        borderDefault: isDark ? '#1e3158'                   : '#E2E8F0',
        // semi-transparent card/search surfaces
        cardBg:        isDark ? 'rgba(13,27,53,0.92)'       : 'rgba(247,248,250,0.78)',
        searchBg:      isDark ? 'rgba(13,27,53,0.92)'       : 'rgba(247,248,250,0.82)',
        inputBg:       isDark ? '#0a1628'                   : '#111827',
        inputBorder:   isDark ? '#1e3158'                   : '#374151',
        inputText:     '#FFFFFF',   // always white — dark input bg in both modes
        sectionHeader: isDark ? '#4a6490'                   : '#4B5563',
        divider:       isDark ? '#1e3158'                   : '#1F2937',
        // brand (unchanged in both modes)
        brandRed:      '#E8374A',
        brandNavy:     '#162444',
        statusRunning: '#16A34A',
        statusError:   '#DC2626',
        statusQueue:   'rgba(217,119,6,0.10)',
        isDark,
    }), [isDark]);
}
