import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGroupExpansion } from '../useGroupExpansion';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString();
        },
        clear: () => {
            store = {};
        }
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

describe('useGroupExpansion', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it('should initialize with provided groups', () => {
        const { result } = renderHook(() => useGroupExpansion(['group1', 'group2']));
        expect(result.current.expandedGroups.has('group1')).toBe(true);
        expect(result.current.expandedGroups.has('group2')).toBe(true);
        expect(result.current.expandedGroups.has('group3')).toBe(false);
    });

    it('should toggle group expansion', () => {
        const { result } = renderHook(() => useGroupExpansion(['group1']));

        act(() => {
            result.current.toggleGroup('group1');
        });
        expect(result.current.isExpanded('group1')).toBe(false);

        act(() => {
            result.current.toggleGroup('group1');
        });
        expect(result.current.isExpanded('group1')).toBe(true);
    });

    it('should expand all groups', () => {
        const { result } = renderHook(() => useGroupExpansion([]));

        act(() => {
            result.current.expandAll(['group1', 'group2', 'group3']);
        });

        expect(result.current.expandedGroups.size).toBe(3);
        expect(result.current.isExpanded('group1')).toBe(true);
    });

    it('should collapse all groups', () => {
        const { result } = renderHook(() => useGroupExpansion(['group1', 'group2']));

        act(() => {
            result.current.collapseAll();
        });

        expect(result.current.expandedGroups.size).toBe(0);
    });

    it('should persist to localStorage', () => {
        const { result } = renderHook(() => useGroupExpansion(['group1']));

        act(() => {
            result.current.toggleGroup('group2');
        });

        const stored = JSON.parse(window.localStorage.getItem('sidebar_expanded_groups') || '[]');
        expect(stored).toContain('group1');
        expect(stored).toContain('group2');
    });

    it('should load from localStorage if available', () => {
        window.localStorage.setItem('sidebar_expanded_groups', JSON.stringify(['stored_group']));

        const { result } = renderHook(() => useGroupExpansion(['default_group']));

        expect(result.current.isExpanded('stored_group')).toBe(true);
        expect(result.current.isExpanded('default_group')).toBe(false);
    });
});
