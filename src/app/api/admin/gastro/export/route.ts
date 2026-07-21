// GET /api/admin/gastro/export?w=YYYY-MM-DD — weekly gastro statement as CSV
// (the basis for the collective invoice per restaurant; MVP has no invoicing
// integration). The week is Mon–Sun containing `w` (default: current week).
//
// CSV details: UTF-8 with BOM + semicolon separator so Polish Excel opens it
// correctly. Amounts are NET (as frozen on each course).

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/guards';
import { mondayOf, addDays, DATE_ONLY_RE } from '@/lib/utils/week';
import { dayKey } from '@/lib/utils/formatters';

type CourseRow = {
  delivered_on: string;
  distance_km: number;
  fee: number;
  notes: string | null;
  jokusor_id: string;
  restaurants: { name: string; nip: string | null } | null;
};

const csvCell = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { searchParams } = new URL(request.url);
  const w = searchParams.get('w');
  const monday = mondayOf(w && DATE_ONLY_RE.test(w) ? w : dayKey(new Date().toISOString()));
  const nextMonday = addDays(monday, 7);

  const admin = createAdminClient();
  const [{ data: rows, error }, { data: jokusorUsers }] = await Promise.all([
    admin
      .from('gastro_orders')
      .select('delivered_on, distance_km, fee, notes, jokusor_id, restaurants(name, nip)')
      .gte('delivered_on', monday)
      .lt('delivered_on', nextMonday)
      .order('delivered_on', { ascending: true }),
    admin.from('users').select('id, full_name').eq('role', 'jokusor')
  ]);

  if (error) {
    console.error('[GET /api/admin/gastro/export]', error);
    return NextResponse.json({ error: 'export_failed', message: error.message }, { status: 500 });
  }

  const nameById = new Map(
    ((jokusorUsers as { id: string; full_name: string | null }[] | null) ?? []).map((u) => [
      u.id,
      u.full_name ?? u.id
    ])
  );
  const courses = (rows as unknown as CourseRow[] | null) ?? [];

  const plAmount = (n: number) => n.toFixed(2).replace('.', ',');
  const lines: string[] = [];
  lines.push(`Zestawienie gastro;tydzień ${monday} – ${addDays(monday, 6)};;;;`);
  lines.push('restauracja;NIP;data;jokusor;dystans_km;oplata_netto_zl');
  for (const c of courses) {
    lines.push(
      [
        csvCell(c.restaurants?.name ?? '—'),
        csvCell(c.restaurants?.nip ?? ''),
        c.delivered_on,
        csvCell(nameById.get(c.jokusor_id) ?? c.jokusor_id),
        plAmount(c.distance_km),
        plAmount(c.fee)
      ].join(';')
    );
  }
  // Per-restaurant totals under the detail rows.
  const totals = new Map<string, { count: number; fee: number }>();
  for (const c of courses) {
    const key = c.restaurants?.name ?? '—';
    const t = totals.get(key) ?? { count: 0, fee: 0 };
    t.count += 1;
    t.fee += Math.round(c.fee * 100);
    totals.set(key, t);
  }
  lines.push(';;;;;');
  lines.push('RAZEM restauracja;liczba_kursow;suma_netto_zl;;;');
  for (const [name, t] of totals) {
    lines.push(`${csvCell(name)};${t.count};${plAmount(t.fee / 100)};;;`);
  }

  const csv = '\uFEFF' + lines.join('\r\n') + '\r\n'; // BOM so Polish Excel detects UTF-8
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="gastro_${monday}.csv"`
    }
  });
}
