
import { describe, it, expect } from 'vitest';
import { SIDEBAR_CONFIG, SIDEBAR_GROUPS } from '../sidebarConfig';

describe('SidebarConfig', () => {
  it('should have defined groups', () => {
    expect(SIDEBAR_GROUPS).toBeDefined();
    expect(Object.keys(SIDEBAR_GROUPS).length).toBeGreaterThan(0);
  });

  it('should have menu items defined', () => {
    expect(SIDEBAR_CONFIG).toBeDefined();
    expect(SIDEBAR_CONFIG.length).toBeGreaterThan(0);
  });

  it('should have required properties for each item', () => {
    SIDEBAR_CONFIG.forEach(item => {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('label');
      expect(item).toHaveProperty('icon');
      expect(item).toHaveProperty('group');
    });
  });

  it('should only use valid groups', () => {
    const validGroupKeys = Object.keys(SIDEBAR_GROUPS);
    SIDEBAR_CONFIG.forEach(item => {
      expect(validGroupKeys).toContain(item.group);
    });
  });

  it('should have regular number of items', () => {
    // We reverted to the actual implemented items (16)
    expect(SIDEBAR_CONFIG.length).toBeGreaterThanOrEqual(16);
  });
});
