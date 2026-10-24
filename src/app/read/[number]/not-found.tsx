"use client";
import { usePathname } from "next/navigation";
import { linkClass } from "@/components/styles";
import { EmptyState } from "@/components/ui";

// Unknown, deleted or malformed number (SPEC §4.6). A not-found boundary gets no params, so the number comes from the URL.
export default function ReaderNotFound() {
  const raw = usePathname().split("/").pop() ?? "";
  let segment = raw;
  try {
    segment = decodeURIComponent(raw);
  } catch {} // a malformed escape (/read/%E0%A4) shows as typed
  return (
    <div className="mx-auto max-w-page animate-main-in p-4 md:px-6 md:pt-16">
      <EmptyState title={`No link #${segment}.`}>
        <a href="/" className={`mt-4 inline-block ${linkClass}`}>
          ← All links
        </a>
      </EmptyState>
    </div>
  );
}
