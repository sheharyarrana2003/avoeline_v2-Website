import { redirect } from "next/navigation";

export default async function ShortEventRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const sp = await searchParams;

  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") {
      search.set(k, v);
    } else if (Array.isArray(v)) {
      v.forEach((val) => search.append(k, val));
    }
  }

  const queryStr = search.toString();
  redirect(`/events/${eventId}${queryStr ? `?${queryStr}` : ""}`);
}
