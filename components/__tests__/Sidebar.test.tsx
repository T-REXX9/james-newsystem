import React from 'react';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import Sidebar from '../Sidebar';
import { UserProfile } from '../../types';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
};

// Mock Scroll functionality
Element.prototype.scrollTo = vi.fn();

// Mock localStorage
const localStorageMock = (function () {
  let store: Record<string, string> = {};
  return {
    getItem: function (key: string) {
      return store[key] || null;
    },
    setItem: function (key: string, value: string) {
      store[key] = value.toString();
    },
    clear: function () {
      store = {};
    },
    removeItem: function (key: string) {
      delete store[key];
    },
    length: 0,
    key: (index: number) => null
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const ownerUser: UserProfile = {
  id: '1',
  email: 'owner@example.com',
  role: 'Owner',
  access_rights: ['*']
};

const limitedUser: UserProfile = {
  id: '2',
  email: 'agent@example.com',
  role: 'Sales Agent',
  access_rights: ['dashboard', 'tasks']
};

describe('Sidebar', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock the size of the container for virtualizer
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 1000 });
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 256 });
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    window.localStorage.clear();
    consoleErrorSpy.mockRestore();
  });

  it('renders module items for the owner role', async () => {
    const user = userEvent.setup();
    render(<Sidebar activeTab="home" setActiveTab={vi.fn()} user={ownerUser} />);

    const toggleBtn = screen.getByRole('button', { name: /expand sidebar/i });
    await user.click(toggleBtn);

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();

    const searchInput = await screen.findByPlaceholderText('Search navigation...');
    await user.type(searchInput, 'Pipelines');

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 350));
    });

    expect(screen.getByText('Pipelines')).toBeInTheDocument();
  });

  it('only renders modules allowed by access_rights', async () => {
    const user = userEvent.setup();
    render(<Sidebar activeTab="home" setActiveTab={vi.fn()} user={limitedUser} />);

    const toggleBtn = screen.getByRole('button', { name: /expand sidebar/i });
    await user.click(toggleBtn);

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();

    const searchInput = await screen.findByPlaceholderText('Search navigation...');
    await user.type(searchInput, 'Pipelines');

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 350));
    });

    expect(screen.queryByText('Pipelines')).not.toBeInTheDocument();
    expect(screen.queryByText('Staff')).not.toBeInTheDocument();
  });

  it('invokes setActiveTab when item is clicked', async () => {
    const user = userEvent.setup();
    const setActiveTab = vi.fn();
    render(<Sidebar activeTab="home" setActiveTab={setActiveTab} user={ownerUser} />);

    // Expand sidebar to make sure label is inside button (and not in tooltip)
    const toggleBtn = screen.getByRole('button', { name: /expand sidebar/i });
    await user.click(toggleBtn);

    const dashboardLabel = await screen.findByText('Dashboard');
    // The button is the parent or containing button
    const button = dashboardLabel.closest('button');
    expect(button).toBeInTheDocument();

    await user.click(button as HTMLElement);
    expect(setActiveTab).toHaveBeenCalledWith('home');
  });

  it('toggles group expansion', async () => {
    const user = userEvent.setup();
    render(<Sidebar activeTab="home" setActiveTab={vi.fn()} user={ownerUser} />);

    const expandBtn = screen.getByRole('button', { name: /expand sidebar/i });
    await user.click(expandBtn);

    expect(await screen.findByText('Warehouse')).toBeInTheDocument();
    expect(screen.getByText('Inventory')).toBeInTheDocument();

    const warehouseHeader = screen.getByText('Warehouse');
    const toggleButton = warehouseHeader.closest('button');

    await user.click(toggleButton as HTMLElement);

    await act(async () => {
      // allow virtualizer to settle
    });
    expect(screen.queryByText('Inventory')).not.toBeInTheDocument();

    await user.click(toggleButton as HTMLElement);
    expect(await screen.findByText('Inventory')).toBeInTheDocument();
  });

  it('filters items when searching', async () => {
    const user = userEvent.setup();
    render(<Sidebar activeTab="home" setActiveTab={vi.fn()} user={ownerUser} />);

    // Expand sidebar
    const toggleBtn = screen.getByRole('button', { name: /expand sidebar/i });
    await user.click(toggleBtn);

    const searchInput = await screen.findByPlaceholderText('Search navigation...');
    await user.type(searchInput, 'Tasks');

    // Wait for debounced search (300ms)
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 350));
    });

    expect(screen.getByText('Tasks')).toBeInTheDocument();
    // Dashboard should be filtered out
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });
});
