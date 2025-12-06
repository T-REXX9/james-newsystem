import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import Sidebar from '../Sidebar';
import { UserProfile } from '../../types';

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

const moduleLabels = [
  'Dashboard',
  'Pipelines',
  'Customer Database',
  'Product Database',
  'Reorder Report',
  'Staff & Agents',
  'Inbox',
  'Calendar',
  'Calls',
  'Tasks'
];

afterEach(() => {
  cleanup();
});

describe('Sidebar', () => {
  it('renders every module for the owner role', () => {
    render(<Sidebar activeTab="dashboard" setActiveTab={vi.fn()} user={ownerUser} />);

    moduleLabels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('only renders modules allowed by access_rights', () => {
    render(<Sidebar activeTab="dashboard" setActiveTab={vi.fn()} user={limitedUser} />);

    expect(screen.queryAllByText('Dashboard')).not.toHaveLength(0);
    expect(screen.queryAllByText('Tasks')).not.toHaveLength(0);
    expect(screen.queryAllByText('Pipelines')).toHaveLength(0);
    expect(screen.queryAllByText('Staff & Agents')).toHaveLength(0);
  });

  it('defaults to showing everything when access_rights is missing', () => {
    const fallbackUser: UserProfile = {
      id: '3',
      email: 'legacy@example.com',
      role: 'Sales Agent'
    };

    render(<Sidebar activeTab="dashboard" setActiveTab={vi.fn()} user={fallbackUser} />);

    moduleLabels.forEach((label) => {
      expect(screen.queryAllByText(label)).not.toHaveLength(0);
    });
  });

  it('invokes setActiveTab when the matching icon button is clicked', async () => {
    const user = userEvent.setup();
    const setActiveTab = vi.fn();
    render(<Sidebar activeTab="dashboard" setActiveTab={setActiveTab} user={ownerUser} />);

    const tasksLabel = screen.getAllByText('Tasks')[0];
    const tasksButton = tasksLabel.previousSibling as HTMLElement | null;
    expect(tasksButton).toBeTruthy();

    await user.click(tasksButton as HTMLElement);
    expect(setActiveTab).toHaveBeenCalledWith('tasks');
  });
});
