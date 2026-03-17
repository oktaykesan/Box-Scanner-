// BoxScan — Item Normalization Service

import type { DetectedItem } from '../shared/types.js';

export interface NormalizedItem extends DetectedItem {
    normalized_name: string;
}

/**
 * Normalize a single item name for consistent storage and search.
 */
export function normalizeName(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')       // collapse whitespace
        .replace(/[^\p{L}\p{N}\s\-]/gu, '') // keep letters, numbers, spaces, hyphens
        .trim();
}

/**
 * Normalize and deduplicate a list of detected items.
 * - Trims whitespace
 * - Default quantity = 1 if missing/0
 * - Default category = "uncategorized" if empty
 * - Merges duplicates with same normalized_name + category (sums quantities)
 */
export function normalizeItems(items: DetectedItem[]): NormalizedItem[] {
    const merged = new Map<string, NormalizedItem>();

    for (const item of items) {
        const name = item.name?.trim() || 'Unknown Item';
        const normalized_name = normalizeName(name);
        const category = item.category?.trim() || 'uncategorized';
        const quantity = (item.quantity && item.quantity > 0) ? item.quantity : 1;

        const key = `${normalized_name}::${category.toLowerCase()}`;

        const existing = merged.get(key);
        if (existing) {
            // Merge: sum quantities, keep the longer original name
            existing.quantity += quantity;
            if (name.length > existing.name.length) {
                existing.name = name;
            }
        } else {
            merged.set(key, {
                name,
                normalized_name,
                quantity,
                category,
            });
        }
    }

    return Array.from(merged.values());
}
