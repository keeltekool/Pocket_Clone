import { AppShell, FilterButton, NavAdd, NavDivider, NavHeader, NavItem } from "../../components/shell";
import { BrandMark, Button, EmptyState, GhostButton, InlineForm, TextField } from "../../components/ui";

// Empty list: the shell with a zero count and no groups yet; a serif empty-state line under the URL field.
export default function Page() {
  return (
    <AppShell
      title="App name"
      mark={<BrandMark />}
      action={<GhostButton>Log out</GhostButton>}
      sidebar={
        <>
          <NavItem label="All items" count={0} active />
          <NavDivider />
          <NavHeader>Groups</NavHeader>
          <NavAdd>+ New group</NavAdd>
        </>
      }
    >
      <FilterButton>All items</FilterButton>
      <InlineForm field={<TextField type="url" placeholder="Paste a URL..." />} action={<Button>Save</Button>} />
      <EmptyState title="Nothing saved yet" hint="Paste a URL above to get started" />
    </AppShell>
  );
}
