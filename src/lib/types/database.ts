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

/**
 * All `public.*` tables, enumerated explicitly. With an index-signature
 * (`[tableName: string]: GenericTable`) the supabase-js insert overload
 * collapses to `never[]` because TS can't resolve concrete keys — listing
 * them keeps insert/update/upsert weakly typed but functional.
 *
 * Sync this list when adding tables in `supabase/migrations/`. Eventually
 * replaced wholesale by `supabase gen types` output (REVIEW_REPORT.md #5).
 */
type PublicTableName =
  | 'users'
  | 'estates'
  | 'addresses'
  | 'jokusors'
  | 'modules'
  | 'module_activations'
  | 'jokusor_modules'
  | 'orders'
  | 'time_slots'
  | 'order_events'
  | 'ratings'
  | 'tips'
  | 'module_proposals'
  | 'module_proposal_votes'
  | 'ai_intents'
  | 'voice_query_log'
  | 'marketplace_listings'
  | 'marketplace_messages'
  | 'marketplace_purchases'
  | 'trusted_professionals'
  | 'professional_reviews'
  | 'payments'
  | 'invoices'
  | 'push_subscriptions'
  | 'notifications'
  | 'audit_log';

export interface Database {
  public: {
    Tables: Record<PublicTableName, GenericTable>;
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
