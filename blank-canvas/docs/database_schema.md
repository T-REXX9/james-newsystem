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
