import { AppShell, FilterButton, NavAdd, NavDivider, NavHeader, NavItem } from "../../components/shell";
import { ContextMenu, DeleteButton, MenuItem, Option, RowCard, SelectChip } from "../../components/row-card";
import { BrandMark, Button, GhostButton, IconPencil, IconTrash, InlineForm, TextField } from "../../components/ui";

// Menus: the first card's group chip open (popover of options), and on desktop a sidebar row's options menu.
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
    <AppShell
      title="App name"
      mark={<BrandMark />}
      action={<GhostButton>Log out</GhostButton>}
      sidebar={
        <>
          <NavItem label="All items" count={6} active />
          <NavDivider />
          <NavHeader>Groups</NavHeader>
          <div className="relative">
            <NavItem label="Design" count={3} editable hovered />
            <ContextMenu className="absolute top-[calc(100%-6px)] left-[208px]">
              <MenuItem icon={<IconPencil />}>Rename</MenuItem>
              <MenuItem icon={<IconTrash size={14} />} danger>
                Delete
              </MenuItem>
            </ContextMenu>
          </div>
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
                <SelectChip label={r.group} open={i === 0}>
                  {i === 0 && (
                    <>
                      <Option>None</Option>
                      <Option selected>Design</Option>
                      <Option>Reading</Option>
                      <Option add>+ Create new group</Option>
                    </>
                  )}
                </SelectChip>
                <DeleteButton />
              </>
            }
          />
        ))}
      </div>
    </AppShell>
  );
}
