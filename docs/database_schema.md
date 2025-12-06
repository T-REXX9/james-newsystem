Profiles Table Schema:
```
Table: public.profiles
├── id (uuid, PK, FK → auth.users.id)
├── email (text)
├── full_name (text)
├── avatar_url (text)
├── role (text)
├── access_rights (text[])
├── birthday (text)
├── mobile (text)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

RLS Policies:
- SELECT: Public (all users can view all profiles)
- INSERT: Self-only (users can only insert their own profile)
- UPDATE: Self-only (users can only update their own profile)

Trigger Behavior:
- Automatically creates profile when user signs up via `auth.signUp()`
- Extracts metadata from `raw_user_meta_data` field
- Default permissions: `['dashboard', 'pipelines', 'mail', 'calendar', 'tasks']`

Migration Reference:
- File: `supabase/migrations/001_create_profiles_table.sql`
- File: `supabase/migrations/002_adjust_profiles_table.sql`
- Applied: via MCP migration `adjust_profiles_table` (profiles table existed already)

Service Layer:
- Primary creation path now uses `createStaffAccount()` in `services/supabaseService.ts`
- Responsibilities: validate input, generate avatar URLs, call `auth.signUp()`, verify profile trigger execution, and fall back to manual profile insert if needed
- Default values sourced from `constants.ts` (`DEFAULT_STAFF_ACCESS_RIGHTS`, `DEFAULT_STAFF_ROLE`, `STAFF_ROLES`, `generateAvatarUrl`)

New Trigger Logging:
- Migration `supabase/migrations/005_enhance_profile_trigger.sql` adds `profile_creation_logs` to capture trigger success/errors with metadata
- Trigger now validates email format, logs failures, and remains idempotent with `ON CONFLICT`

Usage Example:
```ts
import { createStaffAccount } from '../services/supabaseService';

await createStaffAccount({
  email: 'agent@example.com',
  password: 'StrongPass1!',
  fullName: 'New Agent',
  role: 'Sales Agent',
  mobile: '09171234567',
  birthday: '1990-01-01'
});
```
