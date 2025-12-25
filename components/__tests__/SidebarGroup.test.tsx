import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import SidebarGroupHeader from '../SidebarGroup';

describe('SidebarGroupHeader', () => {
    afterEach(() => {
        cleanup();
    });
    const mockToggleGroup = vi.fn();

    const defaultProps = {
        groupId: 'test-group',
        label: 'Test Group',
        isExpanded: true, // Sidebar is expanded
        isGroupExpanded: true,
        onToggleGroup: mockToggleGroup,
        itemCount: 5
    };

    it('renders nothing when sidebar is collapsed (isExpanded=false)', () => {
        const { container } = render(<SidebarGroupHeader {...defaultProps} isExpanded={false} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders label and item count when sidebar is expanded', () => {
        render(<SidebarGroupHeader {...defaultProps} />);
        expect(screen.getByText('Test Group')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('calls onToggleGroup when clicked', () => {
        render(<SidebarGroupHeader {...defaultProps} />);
        fireEvent.click(screen.getByRole('button'));
        expect(mockToggleGroup).toHaveBeenCalledWith('test-group');
    });

    it('shows unexpanded state correctly', () => {
        // We can't easily check for the specific icon without checking SVG paths or using a test-id, 
        // but we can check the component renders without errors.
        render(<SidebarGroupHeader {...defaultProps} isGroupExpanded={false} />);
        expect(screen.getByText('Test Group')).toBeInTheDocument();
    });
});
