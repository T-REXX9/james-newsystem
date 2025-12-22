# Plan: Implement Scalable Sidebar & Dynamic RBAC

## Phase 1: Sidebar Refactoring (Scalability)
- [ ] Task: Create `SidebarConfig` data structure with categories and mock items (simulate 10x scale).
    - [ ] Sub-task: Write Tests
    - [ ] Sub-task: Implement Feature
- [ ] Task: Create `CollapsibleSidebarSection` component for grouped items.
    - [ ] Sub-task: Write Tests
    - [ ] Sub-task: Implement Feature
- [ ] Task: Refactor main `Sidebar` component to render from `SidebarConfig`.
    - [ ] Sub-task: Write Tests
    - [ ] Sub-task: Implement Feature
- [ ] Task: Conductor - User Manual Verification 'Sidebar Refactoring (Scalability)' (Protocol in workflow.md)

## Phase 2: RBAC Backend & State
- [ ] Task: Design and apply Database Schema for dynamic permissions (`permissions`, `role_permissions`).
    - [ ] Sub-task: Write Tests
    - [ ] Sub-task: Implement Feature
- [ ] Task: Create `PermissionService` to fetch and update permissions in Supabase.
    - [ ] Sub-task: Write Tests
    - [ ] Sub-task: Implement Feature
- [ ] Task: Implement `usePermission` hook / Context to load user permissions on startup.
    - [ ] Sub-task: Write Tests
    - [ ] Sub-task: Implement Feature
- [ ] Task: Conductor - User Manual Verification 'RBAC Backend & State' (Protocol in workflow.md)

## Phase 3: RBAC Settings UI
- [ ] Task: Create `PermissionMatrix` component (Table with checkboxes for Roles vs. Features).
    - [ ] Sub-task: Write Tests
    - [ ] Sub-task: Implement Feature
- [ ] Task: Implement `PermissionSettingsPage` for Owners to modify access.
    - [ ] Sub-task: Write Tests
    - [ ] Sub-task: Implement Feature
- [ ] Task: Conductor - User Manual Verification 'RBAC Settings UI' (Protocol in workflow.md)

## Phase 4: Integration
- [ ] Task: Connect `Sidebar` to `usePermission` to filter items based on visibility.
    - [ ] Sub-task: Write Tests
    - [ ] Sub-task: Implement Feature
- [ ] Task: Create `Restricted` wrapper component to conditionally render UI elements based on action permissions.
    - [ ] Sub-task: Write Tests
    - [ ] Sub-task: Implement Feature
- [ ] Task: Conductor - User Manual Verification 'Integration' (Protocol in workflow.md)
