# How to Add New Sidebar Menu Items

This guide explains how to add new pages/modules to the sidebar navigation.

## Quick Steps

### 1. Add the Menu Item to Sidebar Component

Edit `components/Sidebar.tsx` and add your new item to the `menuItems` array:

```typescript
const menuItems = [
  // ... existing items ...
  { 
    id: 'your-new-page',           // Unique identifier
    icon: YourIcon,                 // Lucide React icon
    label: 'Your New Page',         // Display name
    group: 'tools'                  // Group: main, data, sales, admin, or tools
  },
];
```

**Available Groups:**
- `main` - Core features (Dashboard, Pipelines)
- `data` - Data management (Customers, Products, Reports)
- `sales` - Sales workflow (Inquiry, Orders, Invoices)
- `admin` - Administration (Staff, Management, Settings)
- `tools` - Productivity tools (Mail, Calendar, Tasks)

### 2. Import the Icon

At the top of `components/Sidebar.tsx`, import your icon from lucide-react:

```typescript
import { 
  LayoutDashboard, 
  Mail, 
  // ... other icons ...
  YourIcon  // Add your new icon here
} from 'lucide-react';
```

Browse available icons at: https://lucide.dev/icons/

### 3. Add to Available Modules List

Edit `constants.ts` and add your module to `AVAILABLE_APP_MODULES`:

```typescript
export const AVAILABLE_APP_MODULES = [
  // ... existing modules ...
  { id: 'your-new-page', label: 'Your New Page' },
];
```

This ensures the module appears in access control settings.

### 4. Add Route Handler in App.tsx

Edit `App.tsx` and add a case in the `renderContent()` function:

```typescript
const renderContent = () => {
  switch (activeTab) {
    // ... existing cases ...
    case 'your-new-page':
      return (
        <div className="h-full overflow-y-auto">
          <YourNewPageComponent />
        </div>
      );
    // ... rest of cases ...
  }
};
```

### 5. Create Your Component

Create your new page component in `components/YourNewPage.tsx`:

```typescript
import React from 'react';

const YourNewPage: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Your New Page</h1>
      {/* Your content here */}
    </div>
  );
};

export default YourNewPage;
```

### 6. Configure Access Control (Optional)

If you want to restrict access to certain roles:

Edit `components/Sidebar.tsx` and add special logic in `isItemAllowed()`:

```typescript
const isItemAllowed = (itemId: string) => {
  // ... existing logic ...
  
  // Special case: Your new page only for specific roles
  if (itemId === 'your-new-page') {
    return user.role === 'Owner' || user.role === 'Manager';
  }
  
  // ... rest of logic ...
};
```

## Example: Adding a "Reports" Page

### Step 1: Add to Sidebar
```typescript
{ 
  id: 'reports', 
  icon: FileBarChart, 
  label: 'Reports', 
  group: 'data' 
},
```

### Step 2: Import Icon
```typescript
import { FileBarChart } from 'lucide-react';
```

### Step 3: Add to Constants
```typescript
{ id: 'reports', label: 'Reports' },
```

### Step 4: Add Route
```typescript
case 'reports':
  return (
    <div className="h-full overflow-y-auto">
      <ReportsView />
    </div>
  );
```

### Step 5: Create Component
```typescript
// components/ReportsView.tsx
import React from 'react';

const ReportsView: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Reports</h1>
      <p>Your reports content here</p>
    </div>
  );
};

export default ReportsView;
```

## Tips

### Icon Selection
- Choose icons that clearly represent the feature
- Keep icon style consistent (all from lucide-react)
- Preview icons at https://lucide.dev/icons/

### Grouping
- Place related items in the same group
- Groups are separated by visual dividers
- Order items logically within groups

### Naming
- Use clear, concise labels (2-3 words max)
- Be consistent with existing naming patterns
- Avoid abbreviations unless widely understood

### Access Control
- By default, items respect the `access_rights` array
- Owners always see all items
- Add special cases only when needed

## Testing

After adding a new item, test:

1. ✅ Item appears in sidebar for authorized users
2. ✅ Item is hidden for unauthorized users
3. ✅ Clicking item navigates to correct page
4. ✅ Tooltip shows correct label
5. ✅ Active state highlights correctly
6. ✅ Item appears in Settings > Access Control

Run tests:
```bash
npm run test -- Sidebar.test.tsx
```

## Troubleshooting

**Item not showing up?**
- Check user has access rights to the module ID
- Verify the ID matches in all three places (Sidebar, constants, App)
- Check for typos in the ID

**Icon not displaying?**
- Verify icon is imported from lucide-react
- Check icon name is correct (case-sensitive)
- Ensure icon component is capitalized

**Route not working?**
- Verify case statement in App.tsx matches the ID exactly
- Check component is imported in App.tsx
- Ensure component is exported correctly

**Access control not working?**
- Check `isItemAllowed()` logic in Sidebar.tsx
- Verify user's `access_rights` array includes the module ID
- Remember: Owners bypass access control

