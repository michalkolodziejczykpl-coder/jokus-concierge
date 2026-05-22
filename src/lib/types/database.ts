// Auto-generated Supabase types — TEMPORARY permissive stub.
//
// Real types should be regenerated against the live schema. Once the
// `supabase` CLI is installed and you're logged in:
//
//   npx supabase login
//   npx supabase gen types typescript --project-id uveeqjidyuumcddnfnop > src/lib/types/database.ts
//
// Regenerate after every migration. Tracked under #5 in REVIEW_REPORT.md.
//
// Until then, the index-signature shape below lets `supabase.from('orders')`
// (or any other table name) typecheck — payloads come back as Record<string,
// unknown> instead of properly-typed Row objects, so call sites still need
// runtime validation (zod).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type GenericRow = Record<string, unknown>;

type GenericTable = {
  Row: GenericRow;
  Insert: GenericRow;
  Update: GenericRow;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: { [tableName: string]: GenericTable };
    Views: { [viewName: string]: { Row: GenericRow; Relationships: [] } };
    Functions: {
      [functionName: string]: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
    };
    Enums: { [enumName: string]: string };
    CompositeTypes: Record<string, never>;
  };
}
