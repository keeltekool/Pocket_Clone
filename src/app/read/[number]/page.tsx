import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ReaderBody } from "@/components/ReaderBody";
import { ReaderClient } from "@/components/ReaderClient";
import { hasSession } from "@/lib/auth";
import { parseItemNumber } from "@/lib/format";
import { getReaderItem } from "@/lib/items";
import { MAX_TEXT } from "@/lib/page";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ number: string }> };

// The session is checked before the database: logged out learns nothing about the link, not even its title.
// A segment that is not a link number is a 404, never a database error. cache(): metadata and page share one query.
const load = cache(async (segment: string) => {
  if (!hasSession((await cookies()).toString())) return { authed: false as const, item: null };
  const n = parseItemNumber(segment);
  return { authed: true as const, item: n ? await getReaderItem(n) : null };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { item } = await load((await params).number);
  return { title: item ? `${item.title} · Pocket Clone` : "Pocket Clone" };
}

// Reader (SPEC §4.6): the saved text of one link. Logged out → the login form, then this page again. The text renders
// here on the server (ReaderBody); the client gets the card without it.
export default async function ReadPage({ params }: Props) {
  const { authed, item } = await load((await params).number);
  if (!authed) return <ReaderClient item={null} />;
  if (!item) notFound();
  const { pageText, ...card } = item;
  return (
    <ReaderClient item={card}>
      <ReaderBody pageText={pageText} truncated={(pageText?.length ?? 0) >= MAX_TEXT} url={item.url} />
    </ReaderClient>
  );
}
