// Unit check for src/lib/page.ts (plan Task 1.4): URL normalisation, first-URL extraction and one real page fetch.
//   node scripts/check-page.mjs
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { fetchPage, firstUrl, MAX_TEXT, normalizeUrl, paragraphs } from "../src/lib/page.ts";

const cases = [
  ["https://www.Example.com/Path/?utm_source=a&utm_medium=b#top", "example.com/Path"],
  ["http://example.com/x?fbclid=123&keep=1", "example.com/x?keep=1"],
  ["https://example.com/x/", "example.com/x"],
  ["https://EXAMPLE.com/x#section", "example.com/x"],
  ["https://example.com/?gclid=9&mc_cid=1&mc_eid=2", "example.com"],
  ["https://www.dokobit.com/et/blog/kuidas-kasutada-digitemplit-naited-reaalsest-elust", "dokobit.com/et/blog/kuidas-kasutada-digitemplit-naited-reaalsest-elust"],
];
for (const [input, key] of cases) assert.equal(normalizeUrl(input), key, input);
assert.equal(normalizeUrl("https://www.host.ee/x?utm_source=a#top"), normalizeUrl("http://host.ee/x/"), "www/utm/fragment/slash collapse");

assert.equal(firstUrl("Look at this https://a.ee/x ok"), "https://a.ee/x");
assert.equal(firstUrl("Vaata: https://a.ee/x?y=1, täitsa hea."), "https://a.ee/x?y=1");
assert.equal(firstUrl("no link here"), null);
assert.equal(firstUrl("https://en.wikipedia.org/wiki/Bookmark_(digital)"), "https://en.wikipedia.org/wiki/Bookmark_(digital)", "balanced bracket kept");
assert.equal(firstUrl("(see https://a.ee/x)."), "https://a.ee/x", "unbalanced bracket dropped");
console.log("normalizeUrl + firstUrl: ok");

// v2.1 paragraphs (SPEC §5): blocks → paragraphs joined by a blank line, inline runs on, whitespace collapsed.
const body = (html) => parseHTML(`<html><body>${html}</body></html>`).document.body;
assert.equal(paragraphs(body("<p>a  b</p><ul><li>c</li><li>d</li></ul>")), "a b\n\nc\n\nd");
assert.equal(paragraphs(body("<p>one <b>bold</b>\n word</p><div><p>two</p></div>line<br>break")), "one bold word\n\ntwo\n\nline\n\nbreak");
assert.equal(paragraphs(body("<p> </p><div>\n</div>")), null);
// At the 60,000 cap (Gate 2 review M6): the cut leaves no trailing break and no paragraph holds a newline.
// 98 chars + "\n\n" = 100 per paragraph, so the 60,000 cut lands right after a break. The stored text must stay exactly
// MAX_TEXT long: the Reader's "The saved text ends here." test is `length >= MAX_TEXT` (finish review R1).
const capped = paragraphs(body(Array.from({ length: 700 }, () => `<p>${"y".repeat(98)}</p>`).join("")));
assert.ok(capped.length >= MAX_TEXT, `a capped text is ${capped.length} chars, the Reader would not say it was cut`);
assert.ok(capped.split("\n\n").filter(Boolean).every((p) => !p.includes("\n")), "malformed paragraph at the cap");
console.log("paragraphs: ok");

const page = await fetchPage("https://www.dokobit.com/et/blog/kuidas-kasutada-digitemplit-naited-reaalsest-elust");
assert.ok(page.title && /digitempl/i.test(page.title), `title: ${page.title}`);
assert.ok(page.text && page.text.length > 1000, `text length: ${page.text?.length}`);
const paras = page.text.split("\n\n");
assert.ok(paras.length >= 5, `only ${paras.length} paragraphs`);
assert.ok(paras.every((p) => p && !p.includes("\n")) && !/\n{3,}/.test(page.text), "malformed paragraph breaks");
console.log(`fetchPage: "${page.title}" · image ${page.imageUrl ? "yes" : "no"} · text ${page.text.length} chars · ${paras.length} paragraphs`);

// x.com gives bots no HTML; the post text comes from the public oEmbed endpoint (Review focus 2).
const tweet = await fetchPage("https://x.com/jack/status/20?pcflow=unit"); // the flows save it with a marker param
assert.ok(tweet.title === "jack on X" && /twttr/.test(tweet.text ?? ""), `tweet: ${JSON.stringify(tweet)}`);
console.log(`x.com via oEmbed: "${tweet.title}" · "${tweet.text}"`);

const pdf = await fetchPage("https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf");
assert.deepEqual(pdf, { title: null, imageUrl: null, text: null }, "non-HTML gives nulls");
console.log("non-HTML: ok");
