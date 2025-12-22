# Sidebar Customization - Code Snippets

## Quick Customizations

### Change Sidebar Width

**File**: `components/Sidebar.tsx` (line ~184)

```typescript
// Current
className={`
  ${isExpanded ? 'w-64' : 'w-16'}  // 256px / 64px
  ...
`}

// Change to 300px / 80px
className={`
  ${isExpanded ? 'w-[300px]' : 'w-20'}
  ...
`}
```

### Adjust Animation Speed

**File**: `components/Sidebar.tsx` (line ~184)

```typescript
// Current (300ms)
transition-all duration-300 ease-in-out

// Faster (200ms)
transition-all duration-200 ease-in-out

// Slower (500ms)
transition-all duration-500 ease-in-out
```

### Change Brand Color

**File**: `index.html` (line ~19)

```javascript
colors: {
  brand: {
    blue: '#0F5298', // Change this
    dark: '#000000',
    light: '#e0f2fe',
  },
}
```

### Modify Badge Color

**File**: `components/SidebarBadge.tsx` (line ~10)

```typescript
// Current (red)
className={`
  bg-red-600 text-white ...
`}

// Change to orange
className={`
  bg-orange-600 text-white ...
`}

// Change to green
className={`
  bg-green-600 text-white ...
`}
```

### Add New Menu Item

**File**: `components/Sidebar.tsx` (line ~38)

```typescript
const menuItems = [
  // ... existing items
  { 
    id: 'reports', 
    icon: BarChart3, 
    label: 'Reports', 
    group: 'tools', 
    badge: 0 
  },
];
```

### Add New Keyboard Shortcut

**File**: `components/Sidebar.tsx` (line ~100)

```typescript
useKeyboardShortcuts([
  // ... existing shortcuts
  {
    key: 's',
    meta: true,
    handler: () => {
      // Your handler
    },
    description: 'Your shortcut description',
  },
], true);
```

### Change Max Favorites

**File**: `hooks/useSidebarState.ts` (line ~60)

```typescript
// Current (5 max)
if (prev.includes(itemId) || prev.length >= 5) {
  return prev;
}

// Change to 10
if (prev.includes(itemId) || prev.length >= 10) {
  return prev;
}
```

### Disable Search Feature

**File**: `components/Sidebar.tsx` (line ~246)

```typescript
// Current
{isExpanded && (
  <SidebarSearch
    value={searchQuery}
    onChange={updateSearchQuery}
    autoFocus={false}
  />
)}

// Disable by removing or commenting out
{/* isExpanded && (
  <SidebarSearch ... />
) */}
```

### Disable Favorites Feature

**File**: `components/Sidebar.tsx` (line ~260)

```typescript
// Remove or comment out favorites section
{/* {favoriteItems.length > 0 && (
  <>
    {isExpanded && (
      <div>Favorites</div>
    )}
    ...
  </>
)} */}
```

### Change Section Labels

**File**: `components/Sidebar.tsx` (line ~75)

```typescript
const groupLabels: { [key: string]: string } = {
  main: 'Main Navigation',      // Change from 'Main'
  data: 'Data & Reports',       // Change from 'Data Management'
  sales: 'Sales Pipeline',      // Change from 'Sales Workflow'
  admin: 'Admin & Settings',    // Change from 'Administration'
  tools: 'Utilities',           // Change from 'Tools'
};
```

### Customize Help Modal

**File**: `components/Sidebar.tsx` (line ~450)

```typescript
<div className="space-y-3">
  <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
    <span className="text-sm text-slate-600 dark:text-slate-400">
      Your custom shortcut
    </span>
    <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono">
      ⌘ Y
    </kbd>
  </div>
  {/* Add more shortcuts */}
</div>
```

### Disable Dark Mode Styling

**File**: `components/Sidebar.tsx` (line ~184)

```typescript
// Remove all dark: prefixes
// From:
className="... dark:bg-slate-900 dark:border-slate-800 ..."

// To:
className="... bg-white border-gray-200 ..."
```

### Change Hover Scale Effect

**File**: `components/Sidebar.tsx` (line ~300)

```typescript
// Current (1.05x)
hover:scale-105

// Change to 1.10x
hover:scale-110

// Or disable
// hover:scale-105
```

### Customize User Profile Avatar

**File**: `components/SidebarUserProfile.tsx` (line ~40)

```typescript
// Current (gradient)
bg-gradient-to-br from-brand-blue to-blue-600

// Change to solid color
bg-brand-blue

// Change to different gradient
bg-gradient-to-br from-purple-500 to-pink-500
```

### Add Analytics Dashboard

**File**: Create new file `components/SidebarAnalyticsDashboard.tsx`

```typescript
import { sidebarAnalytics } from '../utils/sidebarAnalytics';

export const SidebarAnalyticsDashboard = () => {
  const mostUsed = sidebarAnalytics.getMostUsedModules(5);
  const suggested = sidebarAnalytics.getSuggestedFavorites();
  
  return (
    <div>
      <h3>Most Used: {mostUsed.join(', ')}</h3>
      <h3>Suggested: {suggested.join(', ')}</h3>
    </div>
  );
};
```

### Persist Preferences to Server

**File**: `hooks/useSidebarState.ts` (line ~40)

```typescript
// Add after localStorage.setItem
useEffect(() => {
  const saveToServer = async () => {
    await fetch('/api/user-preferences', {
      method: 'POST',
      body: JSON.stringify({ isExpanded, favorites }),
    });
  };
  saveToServer();
}, [isExpanded, favorites]);
```

### Add Drag-and-Drop for Favorites

**File**: `components/Sidebar.tsx`

```typescript
// Install: npm install @dnd-kit/core @dnd-kit/sortable

import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

// Wrap favorites in DndContext
<DndContext collisionDetection={closestCenter}>
  <SortableContext items={favorites} strategy={verticalListSortingStrategy}>
    {/* Render favorites */}
  </SortableContext>
</DndContext>
```

## Common Issues & Solutions

### Sidebar not persisting state
- Check if localStorage is enabled
- Clear browser cache
- Check browser console for errors

### Search not working
- Ensure sidebar is expanded
- Check if search input is focused
- Verify menuItems array is populated

### Keyboard shortcuts not working
- Check if focus is in input field
- Verify browser doesn't have conflicting shortcuts
- Check browser console for errors

### Badges not updating
- Verify badge count logic
- Check if real-time subscriptions are active
- Ensure component re-renders on data change

### Dark mode not working
- Check if dark class is on html element
- Verify Tailwind dark mode is enabled
- Check CSS specificity

## Performance Tips

1. **Memoize expensive computations**
   ```typescript
   const filteredItems = useMemo(() => {
     return items.filter(item => item.label.includes(query));
   }, [items, query]);
   ```

2. **Use React.memo for list items**
   ```typescript
   const MenuItem = React.memo(({ item }) => (
     <button>{item.label}</button>
   ));
   ```

3. **Lazy load analytics**
   ```typescript
   const analytics = useMemo(() => sidebarAnalytics, []);
   ```

4. **Debounce search**
   ```typescript
   const debouncedSearch = useCallback(
     debounce((query) => updateSearchQuery(query), 300),
     []
   );
   ```

