"use client";
import { useEffect, type ComponentProps, type ReactNode, type RefObject } from "react";

// Icons: inline 24-grid strokes, 2px, currentColor (the design ships no icon package).
type IconProps = { size?: number; className?: string };
const svg = (size: number, className = "", fill = "none") => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill,
  stroke: fill === "none" ? "currentColor" : undefined,
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className,
  "aria-hidden": true,
});
export const IconChevron = ({ size = 12, className }: IconProps) => (
  <svg {...svg(size, className)}><polyline points="6 9 12 15 18 9" /></svg>
);
export const IconClose = ({ size = 20, className }: IconProps) => (
  <svg {...svg(size, className)}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
export const IconFolder = ({ size = 14, className }: IconProps) => (
  <svg {...svg(size, className)}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
);
export const IconTrash = ({ size = 18, className }: IconProps) => (
  <svg {...svg(size, className)}><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
);
export const IconPencil = ({ size = 14, className }: IconProps) => (
  <svg {...svg(size, className)}><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
);
export const IconDots = ({ size = 16, className }: IconProps) => (
  <svg {...svg(size, className, "currentColor")}><circle cx="12" cy="6" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="18" r="2" /></svg>
);
export const IconSearch = ({ size = 16, className }: IconProps) => (
  <svg {...svg(size, className)}><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
);

/** Primary action: solid terracotta, lifts 1px on hover. */
export function Button({ className = "", ...props }: ComponentProps<"button">) {
  return (
    <button
      className={`cursor-pointer whitespace-nowrap rounded-md bg-terracotta px-6 py-3 text-body font-semibold text-warm-white transition-all duration-250 ease-out hover:-translate-y-px hover:bg-terracotta-soft hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 md:px-10 md:py-4 ${className}`}
      {...props}
    />
  );
}

/** Quiet outlined button (header actions). */
export function GhostButton({ className = "", ...props }: ComponentProps<"button">) {
  return (
    <button
      className={`cursor-pointer rounded-sm border-[1.5px] border-cream-dark bg-transparent px-3 py-1.5 text-small font-medium text-ink-muted transition-all duration-200 ease-out hover:border-ink-faint hover:bg-warm-white hover:text-ink md:px-4 md:py-2 ${className}`}
      {...props}
    />
  );
}

/** Text field: warm-white, 1.5px cream-dark border; focus turns the border terracotta-soft with a 4px glow ring. */
export function TextField({ className = "", ...props }: ComponentProps<"input">) {
  return (
    <input
      className={`w-full rounded-md border-[1.5px] border-cream-dark bg-warm-white px-4 py-3 text-body text-ink outline-none transition-all duration-250 ease-out placeholder:text-ink-faint focus:border-terracotta-soft focus:ring-4 focus:ring-terracotta-glow disabled:opacity-60 md:px-6 md:py-4 ${className}`}
      {...props}
    />
  );
}

export function Checkbox({ label, ...props }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className="flex cursor-pointer select-none items-center justify-center gap-2 text-small text-ink-muted">
      <input type="checkbox" className="accent-terracotta" {...props} />
      {label}
    </label>
  );
}

export function ErrorNote({ children, ...props }: ComponentProps<"p">) {
  return (
    <p className="animate-shake rounded-sm bg-danger-soft px-4 py-2 text-center text-small text-danger" {...props}>
      {children}
    </p>
  );
}

/** Count pill beside nav and sheet rows. */
export function Count({ children }: { children: ReactNode }) {
  return <span className="ml-2 shrink-0 rounded-md bg-cream-dark px-2 py-0.5 text-micro text-ink-faint">{children}</span>;
}

export function EmptyState({ title, hint, children }: { title: ReactNode; hint?: ReactNode; children?: ReactNode }) {
  return (
    <div className="px-6 py-16 text-center text-ink-muted">
      <p className="mb-2 font-display text-heading text-ink-soft">{title}</p>
      {hint && <p className="text-label text-ink-faint">{hint}</p>}
      {children}
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <span className={`inline-block size-[18px] animate-spin rounded-full border-2 border-cream-dark border-t-terracotta ${className}`} />;
}

/** Floating menu: warm-white, 10px radius, soft shadow. */
export function Menu({ className = "", children, ...props }: ComponentProps<"div">) {
  return (
    <div role="menu" className={`z-30 min-w-popover rounded-md border border-cream-dark bg-warm-white p-1 shadow-lg ${className}`} {...props}>
      {children}
    </div>
  );
}

export function MenuItem({ icon, danger, selected, className = "", children, ...props }: ComponentProps<"button"> & { icon?: ReactNode; danger?: boolean; selected?: boolean }) {
  const tone = danger
    ? "text-danger hover:bg-danger-soft"
    : selected
      ? "bg-terracotta-glow font-medium text-terracotta"
      : "text-ink-soft hover:bg-cream";
  return (
    <button type="button" role="menuitem" className={`flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-small transition-all duration-100 ${tone} ${className}`} {...props}>
      {icon}
      <span className="truncate">{children}</span>
    </button>
  );
}

/** Calls `onOutside` on a pointerdown outside `ref` and on Escape. */
export function useDismiss(ref: RefObject<HTMLElement | null>, active: boolean, onOutside: () => void) {
  useEffect(() => {
    if (!active) return;
    const down = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && onOutside();
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [ref, active, onOutside]);
}
