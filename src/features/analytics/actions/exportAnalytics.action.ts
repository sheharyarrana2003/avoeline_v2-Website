"use server";

import { z } from "zod";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";
import { getAuthenticatedUser } from "@/src/features/auth/rbac.service";
import { AnalyticsService } from "@/src/services/anaylService";
import { parseAnalyticsFilters } from "@/src/features/analytics/analytics.filters";
import { deliverWorkbook } from "@/src/features/exports/writeSheet";
import type { CsvColumn } from "@/src/lib/csv";

const schema = z.object({
  organizerId: z.string().uuid(),
  range: z.string().optional(),
  event: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const exportAnalyticsAction = safeAction({
  input: schema,
  auth: async () => {
    const user = await getAuthenticatedUser();
    if (!user) return safeFail("UNAUTHORIZED", "Sign in required.");
    return { userId: user.userId, role: user.role, label: "exportAnalytics" };
  },
  run: async (input, auth) => {
    const isAdmin = auth.role === "platform_admin";
    if (!isAdmin && auth.userId !== input.organizerId) {
      return safeFail("FORBIDDEN", "You can only export your own analytics.");
    }

    const filters = parseAnalyticsFilters({
      range: input.range,
      event: input.event,
      from: input.from,
      to: input.to,
    });
    const data = await AnalyticsService.getAnalyticsData(input.organizerId, filters);

    const tileRows = [
      {
        metric: "Registrations",
        value: data.tiles.registrations.value,
        helper: data.tiles.registrations.helper ?? "",
      },
      {
        metric: "Revenue",
        value: data.tiles.revenue.value,
        helper: data.tiles.revenue.helper ?? "",
      },
      {
        metric: "Net after costs",
        value: data.tiles.netAfterCosts.value,
        helper: data.tiles.netAfterCosts.helper ?? "",
      },
      {
        metric: "Satisfaction",
        value: data.tiles.satisfaction.value,
        helper: data.tiles.satisfaction.helper ?? "",
      },
      { metric: "Events", value: data.tiles.events.value, helper: data.tiles.events.helper ?? "" },
      {
        metric: "Check-in rate",
        value: data.tiles.checkInRate.value,
        helper: data.tiles.checkInRate.helper ?? "",
      },
    ];

    const tileCols: CsvColumn<(typeof tileRows)[number]>[] = [
      { header: "Metric", value: (r) => r.metric },
      { header: "Value", value: (r) => r.value },
      { header: "Helper", value: (r) => r.helper },
    ];

    const seriesCols: CsvColumn<(typeof data.dailySeries)[number]>[] = [
      { header: "Key", value: (r) => r.key },
      { header: "Label", value: (r) => r.label },
      { header: "Registrations", value: (r) => r.registrations },
      { header: "People", value: (r) => r.people },
      { header: "Previous period", value: (r) => r.previous },
    ];

    const eventCols: CsvColumn<(typeof data.eventPerformanceRows)[number]>[] = [
      { header: "Event", value: (r) => r.eventName },
      { header: "Type", value: (r) => r.eventType },
      { header: "Date", value: (r) => r.date },
      { header: "Registrations", value: (r) => r.registrations },
      { header: "Checked in", value: (r) => r.checkedIn },
      { header: "Check-in %", value: (r) => r.checkInRate ?? "" },
      { header: "Satisfaction", value: (r) => r.avgSatisfaction ?? "" },
      { header: "Revenue", value: (r) => r.revenue },
      { header: "Vendor spend", value: (r) => r.vendorSpend },
      { header: "Expenses net", value: (r) => r.expenseNet },
      { header: "Net", value: (r) => r.netAfterCosts },
    ];

    const file = await deliverWorkbook(`analytics-${input.organizerId.slice(0, 8)}`, [
      { name: "Tiles", rows: tileRows, columns: tileCols as CsvColumn<unknown>[] },
      { name: "Daily series", rows: data.dailySeries, columns: seriesCols as CsvColumn<unknown>[] },
      {
        name: "Events",
        rows: data.eventPerformanceRows,
        columns: eventCols as CsvColumn<unknown>[],
      },
    ]);

    if (!file.success) return safeFail("EXPORT", file.error);
    return safeOk({ url: file.url, filename: file.filename });
  },
});
