import { getActivePricing } from "@/lib/server/pricing";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json(await getActivePricing(), { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return Response.json({ error: "Pricing is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
