import { bucketLabel } from "@/lib/format";

// The API's card shape (type-only import: nothing from lib/items reaches the client bundle).
export type { Card } from "@/lib/items";
import type { Card } from "@/lib/items";

export type BucketRow = { id: string; name: string };

export type Suggestion = { id: string; name: string; itemNumbers: number[]; createdAt: string };

// What a suggestion's Create bucket hands to the new-bucket field. `nonce` re-opens the field on a repeat click.
export type Prefill = { name: string; suggestionId: string; target: "sidebar" | "sheet"; nonce: number };

export type View = { kind: "all" } | { kind: "unsorted" } | { kind: "favourites" } | { kind: "bucket"; id: string };

export const sameView = (a: View, b: View) => a.kind === b.kind && (a.kind !== "bucket" || b.kind !== "bucket" || a.id === b.id);

export const cardLabel = (c: Pick<Card, "status" | "bucket">) => bucketLabel(c.status, c.bucket?.name);
