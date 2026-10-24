import { Button, Checkbox, TextField } from "../../components/ui";

// Login: hero serif title and lede over a soft terracotta glow; a 340px form (focused field, checkbox, full-width button).
// The block sits at the top of the page (40px inset), centred horizontally.
export default function Page() {
  return (
    <div className="min-h-screen animate-auth-in bg-glow p-10 text-center">
      <h1 className="mb-1 font-display text-hero text-ink text-shadow-glow">App name</h1>
      <p className="mb-10 text-lede text-ink-muted">One line about the app</p>
      <form className="mx-auto flex w-full max-w-form flex-col gap-4">
        <TextField type="password" placeholder="Password" autoFocus />
        <Checkbox label="Remember this device" defaultChecked />
        <Button type="submit" sheen className="w-full px-6">
          Unlock
        </Button>
      </form>
    </div>
  );
}
