import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'sidebar_expanded_groups';

export const useGroupExpansion = (initialGroups: string[] = []) => {
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
        // Try to load from local storage
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    return new Set(JSON.parse(stored));
                }
            } catch (error) {
                console.error('Error reading sidebar state:', error);
            }
        }
        // Default to all expanded if no storage
        return new Set(initialGroups);
    });

    // Persist to local storage whenever state changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(expandedGroups)));
        }
    }, [expandedGroups]);

    const toggleGroup = useCallback((group: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(group)) {
                next.delete(group);
            } else {
                next.add(group);
            }
            return next;
        });
    }, []);

    const expandAll = useCallback((groups: string[]) => {
        setExpandedGroups(new Set(groups));
    }, []);

    const collapseAll = useCallback(() => {
        setExpandedGroups(new Set());
    }, []);

    const isExpanded = useCallback((group: string) => {
        return expandedGroups.has(group);
    }, [expandedGroups]);

    return {
        expandedGroups,
        toggleGroup,
        expandAll,
        collapseAll,
        isExpanded
    };
};
