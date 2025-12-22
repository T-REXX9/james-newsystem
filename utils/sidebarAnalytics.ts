// Sidebar analytics and telemetry utilities

interface SidebarEvent {
  type: 'expand' | 'collapse' | 'item_click' | 'search' | 'favorite_add' | 'favorite_remove';
  itemId?: string;
  timestamp: number;
  searchQuery?: string;
}

interface ModuleUsage {
  moduleId: string;
  clickCount: number;
  lastAccessed: number;
  totalTimeSpent: number;
}

const STORAGE_KEY = 'sidebar_analytics';
const USAGE_KEY = 'module_usage';

class SidebarAnalytics {
  private events: SidebarEvent[] = [];
  private moduleUsage: Map<string, ModuleUsage> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(USAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.moduleUsage = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Failed to load sidebar analytics:', error);
    }
  }

  private saveToStorage() {
    try {
      const data = Object.fromEntries(this.moduleUsage);
      localStorage.setItem(USAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save sidebar analytics:', error);
    }
  }

  trackEvent(type: SidebarEvent['type'], itemId?: string, searchQuery?: string) {
    const event: SidebarEvent = {
      type,
      itemId,
      timestamp: Date.now(),
      searchQuery,
    };
    this.events.push(event);

    // Keep only last 100 events in memory
    if (this.events.length > 100) {
      this.events = this.events.slice(-100);
    }
  }

  trackModuleClick(moduleId: string) {
    const usage = this.moduleUsage.get(moduleId) || {
      moduleId,
      clickCount: 0,
      lastAccessed: 0,
      totalTimeSpent: 0,
    };

    usage.clickCount++;
    usage.lastAccessed = Date.now();
    this.moduleUsage.set(moduleId, usage);
    this.saveToStorage();
    this.trackEvent('item_click', moduleId);
  }

  trackModuleTimeSpent(moduleId: string, timeMs: number) {
    const usage = this.moduleUsage.get(moduleId);
    if (usage) {
      usage.totalTimeSpent += timeMs;
      this.moduleUsage.set(moduleId, usage);
      this.saveToStorage();
    }
  }

  getMostUsedModules(limit: number = 5): string[] {
    return Array.from(this.moduleUsage.values())
      .sort((a, b) => b.clickCount - a.clickCount)
      .slice(0, limit)
      .map(usage => usage.moduleId);
  }

  getRecentlyUsedModules(limit: number = 5): string[] {
    return Array.from(this.moduleUsage.values())
      .sort((a, b) => b.lastAccessed - a.lastAccessed)
      .slice(0, limit)
      .map(usage => usage.moduleId);
  }

  getSuggestedFavorites(): string[] {
    // Suggest modules with high click count and recent usage
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    return Array.from(this.moduleUsage.values())
      .filter(usage => usage.lastAccessed > weekAgo && usage.clickCount >= 3)
      .sort((a, b) => b.clickCount - a.clickCount)
      .slice(0, 5)
      .map(usage => usage.moduleId);
  }

  getModuleStats(moduleId: string): ModuleUsage | null {
    return this.moduleUsage.get(moduleId) || null;
  }

  clearAnalytics() {
    this.events = [];
    this.moduleUsage.clear();
    localStorage.removeItem(USAGE_KEY);
  }
}

export const sidebarAnalytics = new SidebarAnalytics();

