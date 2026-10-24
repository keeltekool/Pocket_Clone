import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ReaderClient } from "@/components/ReaderClient";
import { hasSession } from "@/lib/auth";
import { getReaderItem } from "@/lib/items";
import { MAX_TEXT } from "@/lib/page";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ number: string }> };

// "58" → 58; anything else, 0, or past the integer column → null, which is a 404, never a database error.
const parse = (s: string) => (/^\d{1,10}$/.test(s) && Number(s) <= 2_147_483_647 ? Number(s) : null);

// The session is checked before the database: logged out learns nothing about the link, not even its title.
// cache(): the metadata and the page share one query per request.
const load = cache(async (segment: string) => {
  if (!hasSession((await cookies()).toString())) return { authed: false as const, item: null };
  const n = parse(segment);
  return { authed: true as const, item: n ? await getReaderItem(n) : null };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { item } = await load((await params).number);
  return { title: item ? `${item.title} · Pocket Clone` : "Pocket Clone" };
}

// Reader (SPEC §4.6): the saved text of one link. Logged out → the login form, then this page again.
export default async function ReadPage({ params }: Props) {
  const { authed, item } = await load((await params).number);
  if (!authed) return <ReaderClient item={null} truncated={false} />;
  if (!item) notFound();
  return <ReaderClient item={item} truncated={(item.pageText?.length ?? 0) >= MAX_TEXT} />;
}
