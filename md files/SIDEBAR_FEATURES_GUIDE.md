# Sidebar Enhancement Features Guide

## Quick Start

### Expanding/Collapsing the Sidebar
- **Click** the hamburger menu icon at the top of the sidebar
- **Keyboard**: Press `Cmd+B` (Mac) or `Ctrl+B` (Windows/Linux)
- Your preference is automatically saved

### Searching Navigation
- **Click** the search box when sidebar is expanded
- **Keyboard**: Press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux)
- Type to filter menu items by name or ID
- Results update in real-time

### Adding Favorites
- **Hover** over any menu item when sidebar is expanded
- **Click** the star icon to add to favorites
- Favorites appear at the top of the menu
- Maximum 5 favorites allowed
- Click star again to remove from favorites

### Keyboard Shortcuts
| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| Toggle Sidebar | `Cmd+B` | `Ctrl+B` |
| Search Navigation | `Cmd+K` | `Ctrl+K` |
| Show Shortcuts | `?` | `?` |

### User Profile Menu
- **Collapsed**: Click your avatar to see options
- **Expanded**: Click the profile card at the bottom
- Options:
  - View Profile
  - Settings
  - Sign Out
- Green dot indicates online status

## Features Overview

### Notification Badges
- Red badges show pending items count
- Appears on relevant modules:
  - Dashboard: pending notifications
  - Sales Inquiry: pending approvals
  - Sales Orders: pending confirmations
  - Tasks: pending assignments
  - Recycle Bin: items pending deletion

### Section Organization
When expanded, menu items are organized by:
- **Main**: Dashboard, Pipelines
- **Data Management**: Customers, Products, Reorder Report
- **Sales Workflow**: Sales Inquiry, Orders, Slips, Invoices
- **Administration**: Staff, Management, Recycle Bin
- **Tools**: Inbox, Calendar, Calls, Tasks

### Analytics
The sidebar tracks:
- Most used modules
- Recently accessed modules
- Search queries
- Favorite selections
- Used to suggest favorites automatically

## Tips & Tricks

1. **Quick Navigation**: Use Cmd/Ctrl+K to search instead of scrolling
2. **Favorites**: Add your 5 most-used modules for quick access
3. **Mobile**: Sidebar becomes a drawer on small screens
4. **Dark Mode**: All features work in dark mode
5. **Persistence**: All preferences saved automatically

## Accessibility

- **Keyboard Users**: All features accessible via keyboard
- **Screen Readers**: Full ARIA labels and descriptions
- **Focus Management**: Clear focus indicators
- **High Contrast**: Meets WCAG AA standards

## Troubleshooting

**Sidebar won't expand?**
- Refresh the page
- Check browser console for errors
- Clear localStorage if needed

**Search not working?**
- Ensure sidebar is expanded
- Check that search box is focused
- Try clearing the search and typing again

**Favorites not saving?**
- Check if localStorage is enabled
- Verify browser allows local storage
- Try a different browser

**Keyboard shortcuts not working?**
- Ensure focus is not in an input field
- Exception: Cmd/Ctrl+K works in search box
- Check if browser has conflicting shortcuts

## Customization

### Changing Sidebar Width
Edit `components/Sidebar.tsx`:
- Collapsed: `w-16` (64px)
- Expanded: `w-64` (256px)

### Adjusting Animation Speed
Edit `index.html` or `components/Sidebar.tsx`:
- Default: `duration-300` (300ms)
- Change to `duration-200` for faster
- Change to `duration-500` for slower

### Modifying Colors
Edit `index.html` Tailwind config:
- Brand color: `#0F5298`
- Badge color: `bg-red-600`
- Hover: `hover:bg-gray-50 dark:hover:bg-slate-800`

## Performance Notes

- Sidebar state persisted in localStorage
- Analytics data stored locally
- No server calls for sidebar operations
- Smooth 60fps animations
- Optimized for mobile devices

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers

## Need Help?

Press `?` to see keyboard shortcuts help modal

