import type { ReactNode } from "react";
import { IconChevron, IconFolder, IconTrash } from "./ui";

/**
 * List row card: thumbnail, serif title (2 lines), meta line, right-aligned date, then an actions column.
 * Hover lifts 2px with the card-hover shadow and turns the title terracotta. Cards slide in, staggered by `index`.
 */
export function RowCard({ href = "#", thumb, title, meta, date, actions, index = 0, busy }: {
  href?: string;
  thumb?: string;
  title: ReactNode;
  meta: ReactNode;
  date?: ReactNode;
  actions?: ReactNode;
  index?: number;
  /** Removing: dimmed, slightly shrunk, not clickable. */
  busy?: boolean;
}) {
  return (
    <div
      style={{ animationDelay: `${Math.min(index, 5) * 0.05}s` }}
      className={`group relative z-1 grid animate-card-in grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-cream-dark bg-warm-white transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-ink-faint hover:shadow-card-hover active:translate-y-0 has-[[data-open]]:z-1000 ${busy ? "pointer-events-none scale-[0.98] opacity-50" : ""}`}
    >
      <a href={href} className="grid grid-cols-[70px_1fr] items-center gap-2 py-2 pl-4 md:grid-cols-[80px_1fr_100px]">
        <div className="h-[50px] w-[70px] shrink-0 overflow-hidden rounded-sm bg-cream-dark md:h-14 md:w-20">
          {thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="size-full object-cover transition-transform duration-400 ease-out group-hover:scale-105" />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="line-clamp-2 font-display text-card text-ink transition-colors duration-200 group-hover:text-terracotta">{title}</h3>
          <span className="text-meta font-medium lowercase text-ink-muted">{meta}</span>
        </div>
        <span className="hidden whitespace-nowrap text-right text-micro text-ink-faint md:block">{date}</span>
      </a>
      {actions && <div className="relative z-10 flex flex-col items-center gap-1 pr-2 md:flex-row md:pr-4">{actions}</div>}
    </div>
  );
}

/** Folder chip with a chevron; opens a popover of options. The label hides on phones (icon + chevron only). */
export function SelectChip({ label, open, children }: { label: ReactNode; open?: boolean; children?: ReactNode }) {
  return (
    <div className="relative" data-open={open || undefined}>
      <button
        type="button"
        aria-expanded={!!open}
        className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-sm border border-cream-dark bg-cream px-2 py-1 text-micro text-ink-muted transition-all duration-150 ease-out hover:border-ink-faint hover:bg-cream-dark md:px-2.5 md:py-1.5"
      >
        <IconFolder className="shrink-0" />
        <span className="hidden max-w-20 truncate md:block">{label}</span>
        <IconChevron size={10} className="shrink-0" />
      </button>
      {open && (
        <div className="absolute top-[calc(100%+4px)] right-0 z-[99999] max-h-[280px] min-w-popover overflow-y-auto rounded-md border border-cream-dark bg-warm-white shadow-popover">
          {children}
        </div>
      )}
    </div>
  );
}

/** Popover option. `selected` = terracotta on glow; `add` = the terracotta "create" row under a divider. */
export function Option({ children, selected, add }: { children: ReactNode; selected?: boolean; add?: boolean }) {
  const tone = selected
    ? "bg-terracotta-glow font-medium text-terracotta"
    : add
      ? "border-t border-cream-dark font-medium text-terracotta hover:bg-terracotta-glow"
      : "text-ink-soft hover:bg-cream";
  return (
    <button type="button" className={`block w-full cursor-pointer px-4 py-2 text-left text-meta leading-body transition-all duration-100 ${tone}`}>
      {children}
    </button>
  );
}

/** Icon-only delete: faint, appears on card hover from md up (always shown on phones), danger tint on hover. */
export function DeleteButton() {
  return (
    <button
      type="button"
      title="Delete"
      className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-sm bg-transparent text-ink-faint opacity-100 transition-all duration-200 ease-out hover:scale-110 hover:bg-danger-soft hover:text-danger active:scale-95 md:size-9 md:opacity-0 md:group-hover:opacity-100"
    >
      <IconTrash />
    </button>
  );
}

/** Small floating menu (row options): warm-white, 10px radius, large soft shadow. Position it with `className`. */
export function ContextMenu({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`z-1000 min-w-menu rounded-md border border-cream-dark bg-warm-white p-1 shadow-lg ${className}`}>{children}</div>
  );
}

export function MenuItem({ icon, danger, children }: { icon?: ReactNode; danger?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      className={`flex w-full cursor-pointer items-center gap-2 rounded-sm px-4 py-2 text-left text-small transition-all duration-150 ${danger ? "text-danger hover:bg-danger-soft" : "text-ink-soft hover:bg-cream"}`}
    >
      {icon}
      {children}
    </button>
  );
}
