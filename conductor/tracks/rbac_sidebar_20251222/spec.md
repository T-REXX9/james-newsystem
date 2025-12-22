# Specification: Implement Scalable Sidebar & Dynamic RBAC

## 1. Overview
This track focuses on two critical infrastructure improvements:
1.  **Scalable Sidebar:** Refactoring the sidebar navigation to handle a significantly larger number of items (10x growth) through categorization, collapsible sections, and a clean, high-density design.
2.  **Dynamic RBAC:** Implementing a "Permission Settings" interface that allows the 'Owner' role to toggle visibility and action permissions for 'Staff' and 'Agent' roles. These settings must dynamically filter the sidebar items and restrict access to specific routes/actions.

## 2. User Stories
-   **As an Owner**, I want to view a list of all system features (pages, actions) so I can manage access control.
-   **As an Owner**, I want to toggle "View" and "Edit" permissions for specific roles (Staff, Agent) against each feature.
-   **As an Owner**, I want changes in permissions to be reflected immediately for logged-in users (or upon next refresh).
-   **As a User (Staff/Agent)**, I should only see sidebar items that I have "View" permission for.
-   **As a User**, I should be blocked from performing actions (e.g., "Delete") if I do not have the specific permission enabled by the Owner.
-   **As a User**, I want to navigate a clean sidebar that groups related items together, so I can easily find tools even as the number of features grows.

## 3. Technical Requirements

### 3.1 Sidebar Architecture
-   **Data Structure:** Sidebar items must be defined in a structured config array (e.g., `SIDEBAR_ITEMS`) that includes properties for:
    -   `id` (unique key)
    -   `label` (display name)
    -   `icon` (Lucide icon)
    -   `path` (route)
    -   `category` (for grouping)
    -   `permissionId` (link to RBAC system)
-   **Component:** A recursive or categorized list renderer that supports:
    -   Collapsible categories (accordions).
    -   Search/Filter functionality (optional but recommended for 10x scale).
    -   Active state highlighting.

### 3.2 Dynamic RBAC System
-   **Database Schema:**
    -   `permissions` table: Stores available permissions (e.g., `view_inventory`, `edit_inventory`).
    -   `role_permissions` table: Maps roles to permissions (e.g., `role_id`, `permission_id`, `enabled`).
    -   *Alternative (Simpler):* A JSONB column in a `role_settings` table if the schema is rigid, but relational is preferred for scalability.
-   **Context/Store:** A `PermissionContext` or Redux slice to load and cache the current user's permissions on login.
-   **Settings UI:** A management page with a matrix view:
    -   Rows: Features/Permissions
    -   Columns: Roles (Staff, Agent)
    -   Cells: Checkboxes to toggle access.

## 4. Acceptance Criteria
-   [ ] Sidebar renders items grouped by category.
-   [ ] Sidebar can handle 50+ items without breaking layout (scrollable area).
-   [ ] "Permission Settings" page is accessible only to Owners.
-   [ ] Toggling a permission in Settings updates the database.
-   [ ] Revoking "View" permission for a feature immediately hides it from the relevant user's sidebar.
-   [ ] Revoking "Action" permission disables the corresponding UI element (button/link).
