import { AppShell, BottomSheet, FilterButton, NavAdd, NavDivider, NavHeader, NavItem, SheetItem } from "../../components/shell";
import { DeleteButton, RowCard, SelectChip } from "../../components/row-card";
import { BrandMark, Button, GhostButton, InlineForm, TextField } from "../../components/ui";

// Filter sheet: the phone's group filter, opened from the filter button; same sheet at every width.
const rows = [
  { title: "A long placeholder headline that runs onto a second line on phones", meta: "example.com", date: "Just now", group: "Design" },
  { title: "Notes on a quiet interface: ten rules worth keeping", meta: "journal.example", date: "2 hours ago", group: "Design" },
  { title: "Field guide to layout systems", meta: "docs.example.org", date: "Yesterday", group: "Reading" },
  { title: "Measuring what matters on the page", meta: "web.example", date: "3 days ago", group: "Reading" },
  { title: "A short history of type", meta: "encyclopedia.example", date: "Oct 12", group: "Design" },
  { title: "How to do careful work", meta: "essays.example", date: "Oct 3", group: "Reading" },
];

export default function Page() {
  return (
    <>
      <AppShell
        title="App name"
        mark={<BrandMark />}
        action={<GhostButton>Log out</GhostButton>}
        sidebar={
          <>
            <NavItem label="All items" count={6} active />
            <NavDivider />
            <NavHeader>Groups</NavHeader>
            <NavItem label="Design" count={3} editable />
            <NavItem label="Reading" count={3} editable />
            <NavAdd>+ New group</NavAdd>
          </>
        }
      >
        <FilterButton>All items</FilterButton>
        <InlineForm field={<TextField type="url" placeholder="Paste a URL..." />} action={<Button>Save</Button>} />
        <div className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <RowCard
              key={r.title}
              index={i}
              title={r.title}
              meta={r.meta}
              date={r.date}
              actions={
                <>
                  <SelectChip label={r.group} />
                  <DeleteButton />
                </>
              }
            />
          ))}
        </div>
      </AppShell>
      <BottomSheet title="Filter by group" open>
        <SheetItem label="All items" count={6} active />
        <SheetItem label="Design" count={3} />
        <SheetItem label="Reading" count={3} />
      </BottomSheet>
    </>
  );
}
