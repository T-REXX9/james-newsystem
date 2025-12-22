import { useState, useEffect, useCallback } from 'react';
import { sidebarAnalytics } from '../utils/sidebarAnalytics';

const STORAGE_KEY = 'sidebar_expanded';
const FAVORITES_KEY = 'sidebar_favorites';

interface SidebarState {
  isExpanded: boolean;
  favorites: string[];
  searchQuery: string;
}

export const useSidebarState = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [searchQuery, setSearchQuery] = useState('');

  // Persist expansion state
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(isExpanded));
    } catch (error) {
      console.error('Failed to save sidebar state:', error);
    }
  }, [isExpanded]);

  // Persist favorites
  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.error('Failed to save favorites:', error);
    }
  }, [favorites]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => {
      const newState = !prev;
      sidebarAnalytics.trackEvent(newState ? 'expand' : 'collapse');
      return newState;
    });
  }, []);

  const addFavorite = useCallback((itemId: string) => {
    setFavorites(prev => {
      if (prev.includes(itemId) || prev.length >= 5) {
        return prev;
      }
      sidebarAnalytics.trackEvent('favorite_add', itemId);
      return [...prev, itemId];
    });
  }, []);

  const removeFavorite = useCallback((itemId: string) => {
    setFavorites(prev => {
      sidebarAnalytics.trackEvent('favorite_remove', itemId);
      return prev.filter(id => id !== itemId);
    });
  }, []);

  const toggleFavorite = useCallback((itemId: string) => {
    if (favorites.includes(itemId)) {
      removeFavorite(itemId);
    } else {
      addFavorite(itemId);
    }
  }, [favorites, addFavorite, removeFavorite]);

  const isFavorite = useCallback((itemId: string) => {
    return favorites.includes(itemId);
  }, [favorites]);

  const reorderFavorites = useCallback((newOrder: string[]) => {
    setFavorites(newOrder);
  }, []);

  const updateSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
    if (query) {
      sidebarAnalytics.trackEvent('search', undefined, query);
    }
  }, []);

  return {
    isExpanded,
    favorites,
    searchQuery,
    toggleExpanded,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    reorderFavorites,
    updateSearchQuery,
    setIsExpanded,
  };
};

