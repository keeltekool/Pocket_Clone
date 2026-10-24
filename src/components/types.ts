// Client-side shapes of what the API returns (dates arrive as ISO strings).
export type Card = {
  id: string;
  number: number;
  url: string;
  title: string;
  domain: string;
  imageUrl: string | null;
  status: "sorting" | "sorted" | "unsorted";
  sortedBy: "agent" | "owner" | null;
  createdAt: string;
  bucket: { id: string; name: string } | null;
};

export type BucketRow = { id: string; name: string };

export type View = { kind: "all" } | { kind: "unsorted" } | { kind: "bucket"; id: string };

export const sameView = (a: View, b: View) => a.kind === b.kind && (a.kind !== "bucket" || b.kind !== "bucket" || a.id === b.id);

// The label a card shows for where it is.
export const cardLabel = (c: Card) => (c.status === "sorting" ? "Sorting…" : c.bucket?.name ?? "Unsorted");
