import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// The owner's branded link (gastrobuch-app.vercel.app/m/their-slug) resolves
// to the same public menu that already lives at /menu/[restaurantId] — kept
// as a redirect, not a duplicate page, so the actual ordering experience
// has exactly one implementation to maintain and test.
export default async function BrandedMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string }>;
}) {
  const { slug } = await params;
  const { table } = await searchParams;
  const supabase = await createClient();

  const { data: restaurantId, error } = await supabase.rpc("resolve_menu_slug", { p_slug: slug });

  if (error || !restaurantId) {
    notFound();
  }

  redirect(`/menu/${restaurantId}${table ? `?table=${encodeURIComponent(table)}` : ""}`);
}
