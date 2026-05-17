// Auto-generated Supabase types — placeholder.
// Regenerate with:
//   npx supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/lib/types/database.ts
// Until the SQL schema (docs/database/01_schema.sql) is applied to your Supabase project,
// this file exposes a minimal stub so the rest of the codebase typechecks.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
