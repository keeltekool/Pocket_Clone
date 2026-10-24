// One card's heart saves (SPEC §6.6a), shared by the list and the Reader. Each click shows its value at once and sends
// it (the value, never a toggle); saves for the card go out one after another, so they reach the server in click
// order. Only the newest click may undo itself: a failed save shows the last value the server confirmed. keepalive lets a
// save finish when the owner leaves the page right after the click; `settled()` lets Read and Back wait for it.
export type HeartSaver = { save: (on: boolean) => void; pending: () => boolean; settled: () => Promise<void> };

export function heartSaver(
  id: string,
  serverValue: boolean,
  show: (on: boolean) => void,
  fail: (sessionEnded: boolean) => void,
): HeartSaver {
  let saved = serverValue;
  let tail = Promise.resolve();
  let clicks = 0;
  let inFlight = 0;
  return {
    save(on) {
      const click = ++clicks;
      inFlight++;
      show(on);
      tail = tail.then(async () => {
        try {
          const r = await fetch(`/api/items/${id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ favourite: on }),
            keepalive: true,
          });
          if (r.status === 401) return fail(true); // the login form replaces the page
          if (!r.ok) throw new Error(String(r.status));
          saved = on;
        } catch {
          if (click !== clicks) return; // a newer click decides what shows
          show(saved);
          fail(false);
        } finally {
          inFlight--;
        }
      });
    },
    pending: () => inFlight > 0,
    settled: () => tail,
  };
}
