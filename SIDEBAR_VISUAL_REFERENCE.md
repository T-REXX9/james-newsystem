# Sidebar Enhancement - Visual Reference

## Sidebar States

### Collapsed State (64px)
```
┌──────┐
│ ☰    │  ← Toggle button
├──────┤
│ 📊   │  ← Dashboard (icon only)
│ 📈   │  ← Pipelines
├──────┤
│ 👥   │  ← Customers
│ 📦   │  ← Products
├──────┤
│ 📄   │  ← Sales Inquiry (with badge)
│ ✓ 3  │
├──────┤
│ ⚙️   │  ← Settings
│ ❓   │  ← Help
└──────┘
```

### Expanded State (256px)
```
┌────────────────────────────┐
│ ☰ Navigation          ✕    │  ← Toggle button
├────────────────────────────┤
│ 🔍 Search navigation...    │  ← Search box
├────────────────────────────┤
│ FAVORITES                  │  ← Section header
│ ⭐ 📊 Dashboard        ★   │  ← Favorite item
│ ⭐ 📈 Pipelines        ★   │
├────────────────────────────┤
│ MAIN                       │
│ 📊 Dashboard               │
│ 📈 Pipelines               │
├────────────────────────────┤
│ DATA MANAGEMENT            │
│ 👥 Customers               │
│ 📦 Products                │
│ 📋 Reorder Report          │
├────────────────────────────┤
│ SALES WORKFLOW             │
│ 📄 Sales Inquiry      3    │  ← Badge
│ ✓ Sales Orders        2    │
│ 📋 Order Slips             │
│ 💰 Invoices                │
├────────────────────────────┤
│ ADMINISTRATION             │
│ 👔 Staff & Agents          │
│ 📊 Management              │
│ 🗑️ Recycle Bin        1    │
├────────────────────────────┤
│ TOOLS                      │
│ 📧 Inbox                   │
│ 📅 Calendar                │
│ ☎️ Daily Calls             │
│ ✓ Tasks               5    │
├────────────────────────────┤
│ [Avatar] User Name    ▼    │  ← User profile
│ Sales Agent                │
├────────────────────────────┤
│ ⚙️ Settings                │
│ ❓ Help                    │
└────────────────────────────┘
```

## Keyboard Shortcuts

```
┌─────────────────────────────────────┐
│ Keyboard Shortcuts                  │
├─────────────────────────────────────┤
│ Toggle sidebar      ⌘ B             │
│ Search navigation   ⌘ K             │
│ Show shortcuts      ?                │
├─────────────────────────────────────┤
│ [Got it]                            │
└─────────────────────────────────────┘
```

## User Profile Dropdown

```
┌──────────────────────────┐
│ [Avatar] User Name   ▼   │
│ Sales Agent              │
└──────────────────────────┘
         ↓ (click)
┌──────────────────────────┐
│ 👤 View Profile          │
│ ⚙️ Settings              │
├──────────────────────────┤
│ 🚪 Sign Out              │
└──────────────────────────┘
```

## Search Results

### With Results
```
┌────────────────────────────┐
│ 🔍 sales          ✕        │
├────────────────────────────┤
│ SALES WORKFLOW             │
│ 📄 Sales Inquiry      3    │
│ ✓ Sales Orders        2    │
│ 📋 Order Slips             │
└────────────────────────────┘
```

### No Results
```
┌────────────────────────────┐
│ 🔍 xyz123        ✕         │
├────────────────────────────┤
│                            │
│      No results found      │
│                            │
└────────────────────────────┘
```

## Badge Styles

### Collapsed
```
📄 ← Icon
 3 ← Badge (top-right)
```

### Expanded
```
📄 Sales Inquiry    3 ← Badge (inline)
```

## Hover States

### Collapsed
```
Normal:  │ 📊 │
Hover:   │ 📊 │ (scale 1.05)
Active:  │ 📊 │ (blue background + left bar)
         │ ▌  │
```

### Expanded
```
Normal:  │ 📊 Dashboard        │
Hover:   │ 📊 Dashboard    ★   │ (scale 1.05, star appears)
Active:  │ 📊 Dashboard    ★   │ (blue background)
```

## Animation Timings

- **Sidebar expansion**: 300ms ease-in-out
- **Hover scale**: 200ms ease-in-out
- **Ripple effect**: 600ms ease-out
- **Pulse animation**: 2s ease-in-out infinite
- **Slide in**: 200ms ease-out

## Color Scheme

### Light Mode
- Background: White (#ffffff)
- Border: Light gray (#e4e4e7)
- Text: Dark gray (#334155)
- Active: Brand blue (#0F5298)
- Badge: Red (#dc2626)
- Hover: Light gray (#f4f4f5)

### Dark Mode
- Background: Slate 900 (#050505)
- Border: Slate 800 (#121212)
- Text: Slate 100 (#f1f5f9)
- Active: Brand blue (#0F5298)
- Badge: Red (#dc2626)
- Hover: Slate 800 (#121212)

## Responsive Behavior

### Desktop (≥768px)
- Fixed sidebar on left
- Smooth width transitions
- Full menu visible

### Tablet (480px - 768px)
- Sidebar becomes overlay drawer
- Backdrop overlay when open
- Auto-collapse on navigation

### Mobile (<480px)
- Sidebar as full-height drawer
- Swipe to open/close
- Touch-optimized spacing
- Auto-collapse on item click

## Accessibility Features

```
┌─────────────────────────────────────┐
│ Keyboard Navigation                 │
├─────────────────────────────────────┤
│ Tab        → Navigate items         │
│ Enter      → Activate item          │
│ Escape     → Close dropdowns        │
│ Cmd/Ctrl+B → Toggle sidebar         │
│ Cmd/Ctrl+K → Focus search           │
│ ?          → Show help              │
├─────────────────────────────────────┤
│ Screen Reader Support               │
│ • ARIA labels on all buttons        │
│ • aria-expanded on toggle           │
│ • aria-label on menu items          │
│ • Live regions for updates          │
└─────────────────────────────────────┘
```

## Performance Metrics

- **Initial Load**: <100ms
- **Expansion Animation**: 300ms
- **Search Filter**: <50ms
- **Badge Update**: Real-time
- **Memory Usage**: <2MB
- **Bundle Size**: +15KB (gzipped)

## Browser Compatibility

```
Chrome    ✅ 90+
Firefox   ✅ 88+
Safari    ✅ 14+
Edge      ✅ 90+
Mobile    ✅ All modern
```

