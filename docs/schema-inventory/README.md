# Schema inventory (Step 1)

Generated on `staging/schema-optimization` during the schema optimization pass. See [`docs/schema-report.md`](../schema-report.md).

| File | Source |
| --- | --- |
| `columns.json` | `information_schema.columns` (public) |
| `table-sizes.json` | `pg_stat_user_tables` (partial) |
| `table-usage.json` | `scripts/schema-usage-scan.mjs` |
| `advisors-performance.json` | MCP Performance Advisors |
| `non-null-counts.json` | Per-column `count(col)` (regenerate if missing) |
| `all-null-columns.json` | Columns with count 0 |

Regenerate non-null counts via Supabase SQL (MCP `execute_sql` or SQL editor):

```sql
select jsonb_object_agg(key, value) as non_null_counts from (
  select format('%s.%s', c.table_name, c.column_name) as key,
    (xpath('/row/c/text()', query_to_xml(
      format('select count(%I) as c from public.%I', c.column_name, c.table_name),
      false, true, '')))[1]::text::bigint as value
  from information_schema.columns c
  join information_schema.tables t
    on t.table_schema = c.table_schema and t.table_name = c.table_name
  where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
) s;
```

Save the `non_null_counts` object to `non-null-counts.json`, then:

```bash
node -e "const c=require('./docs/schema-inventory/non-null-counts.json'); const z=Object.entries(c).filter(([,v])=>v===0).map(([k])=>k).sort(); require('fs').writeFileSync('docs/schema-inventory/all-null-columns.json', JSON.stringify(z,null,2));"
```
