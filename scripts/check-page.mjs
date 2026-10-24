// Unit check for src/lib/page.ts (plan Task 1.4): URL normalisation, first-URL extraction and one real page fetch.
//   node scripts/check-page.mjs
import assert from "node:assert/strict";
import { fetchPage, firstUrl, normalizeUrl } from "../src/lib/page.ts";

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

const page = await fetchPage("https://www.dokobit.com/et/blog/kuidas-kasutada-digitemplit-naited-reaalsest-elust");
assert.ok(page.title && /digitempl/i.test(page.title), `title: ${page.title}`);
assert.ok(page.text && page.text.length > 1000, `text length: ${page.text?.length}`);
console.log(`fetchPage: "${page.title}" · image ${page.imageUrl ? "yes" : "no"} · text ${page.text.length} chars`);

const pdf = await fetchPage("https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf");
assert.deepEqual(pdf, { title: null, imageUrl: null, text: null }, "non-HTML gives nulls");
console.log("non-HTML: ok");
