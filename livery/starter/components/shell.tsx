import type { ReactNode } from "react";
import { Count, IconChevron, IconClose, IconDots } from "./ui";

/** Page shell: serif title header over a hairline, then a 240px sidebar beside the main column (sidebar hidden below md). */
export function AppShell({ title, mark, action, sidebar, children }: {
  title: ReactNode;
  mark?: ReactNode;
  action?: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-page animate-main-in p-4 md:px-6 md:pt-6 md:pb-16">
      <header className="mb-4 flex items-center justify-between border-b border-cream-dark pt-2 pb-6 md:mb-6 md:pt-4 md:pb-10">
        <div className="flex items-center gap-3">
          {mark}
          <h1 className="font-display text-title-sm text-ink md:text-title">{title}</h1>
        </div>
        {action}
      </header>
      <div className="flex flex-col gap-10 md:flex-row">
        {sidebar && <aside className="hidden w-sidebar shrink-0 py-4 md:block">{sidebar}</aside>}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

/** Sidebar row: name, count pill, and (for editable rows) a dots button that appears on hover. */
export function NavItem({ label, count, href = "#", active, editable, hovered }: {
  label: ReactNode;
  count?: ReactNode;
  href?: string;
  active?: boolean;
  editable?: boolean;
  /** Renders the hover state (used where a menu is open from this row). */
  hovered?: boolean;
}) {
  return (
    <div
      className={`group relative flex items-center rounded-sm px-4 py-2 transition-all duration-150 ease-out hover:bg-terracotta-glow ${active ? "bg-terracotta-pale" : hovered ? "bg-terracotta-glow" : ""}`}
    >
      <a
        href={href}
        className={`flex-1 truncate text-label transition-colors duration-150 ${active ? "font-semibold text-terracotta" : "text-ink-soft"}`}
      >
        {label}
      </a>
      {count !== undefined && <Count>{count}</Count>}
      {editable && (
        <button
          type="button"
          title="Options"
          className={`ml-1 flex cursor-pointer items-center justify-center rounded-sm p-1 text-ink-muted transition-all duration-150 hover:bg-cream-dark hover:text-ink group-hover:opacity-100 ${hovered ? "opacity-100" : "opacity-0"}`}
        >
          <IconDots />
        </button>
      )}
    </div>
  );
}

export function NavDivider() {
  return <div className="mx-4 my-2 h-px bg-cream-dark" />;
}

export function NavHeader({ children }: { children: ReactNode }) {
  return <div className="px-4 pt-4 pb-2 text-overline uppercase text-ink-faint">{children}</div>;
}

/** Dashed "add" row at the foot of the sidebar; hover turns it terracotta. */
export function NavAdd({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2 px-4">
      <button
        type="button"
        className="w-full cursor-pointer rounded-sm border-[1.5px] border-dashed border-cream-dark bg-transparent px-4 py-2 text-left text-small text-ink-muted transition-all duration-150 ease-out hover:border-terracotta-soft hover:bg-terracotta-glow hover:text-terracotta"
      >
        {children}
      </button>
    </div>
  );
}

/** Phone stand-in for the sidebar: a small outlined button that opens the bottom sheet. Hidden from md up. */
export function FilterButton({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 md:hidden">
      <button
        type="button"
        className="flex cursor-pointer items-center gap-2 rounded-md border border-cream-dark bg-warm-white px-4 py-2 text-label font-medium text-ink-soft transition-all duration-150 hover:border-ink-faint"
      >
        {children}
        <IconChevron className="text-ink-muted" />
      </button>
    </div>
  );
}

/** Bottom sheet over a 40% ink scrim; 14px top corners, serif title, round close button. */
export function BottomSheet({ title, open, children }: { title: ReactNode; open?: boolean; children: ReactNode }) {
  return (
    <div
      className={`fixed inset-0 z-2000 transition-opacity duration-300 ${open ? "visible opacity-100" : "invisible opacity-0"}`}
    >
      <div className="absolute inset-0 bg-scrim" />
      <div
        className={`absolute inset-x-0 bottom-0 max-h-[70vh] rounded-t-lg bg-warm-white transition-transform duration-300 ease-out ${open ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="flex items-center justify-between border-b border-cream-dark p-6">
          <h3 className="font-display text-subheading text-ink">{title}</h3>
          <button
            type="button"
            aria-label="Close"
            className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-cream text-ink-muted transition-all duration-150 hover:bg-cream-dark hover:text-ink"
          >
            <IconClose />
          </button>
        </div>
        <div className="max-h-[calc(70vh-80px)] overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

export function SheetItem({ label, count, href = "#", active }: { label: ReactNode; count?: ReactNode; href?: string; active?: boolean }) {
  return (
    <a
      href={href}
      className={`flex items-center justify-between rounded-md p-4 transition-all duration-150 hover:bg-cream ${active ? "bg-terracotta-pale font-semibold text-terracotta hover:bg-terracotta-pale" : ""}`}
    >
      <span>{label}</span>
      {count !== undefined && <Count>{count}</Count>}
    </a>
  );
}
