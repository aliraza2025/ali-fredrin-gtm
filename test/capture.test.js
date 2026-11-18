"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../capture.js");

test("sanitize trims, strips control chars and caps at 80", () => {
  assert.equal(C.sanitize("  hi\u0000\u0007there\n "), "hithere");
  assert.equal(C.sanitize("a".repeat(500)).length, 80);
  assert.equal(C.sanitize(null), "");
  assert.equal(C.sanitize(42), "");
});

test("parseSource reads utm params, first of repeats, caps length", () => {
  const s = C.parseSource("?utm_source=a&utm_source=b&utm_medium=" + "x".repeat(200), "");
  assert.equal(s.utm_source, "a");
  assert.equal(s.utm_medium.length, 80);
  assert.equal(s.utm_campaign, C.NONE);
});

test("malicious and malformed values stay plain text and never throw", () => {
  const s = C.parseSource("?utm_source=%3Cscript%3Ealert(1)%3C%2Fscript%3E&utm_medium=%E0%A4%A&utm_campaign=%", "");
  assert.equal(s.utm_source, "<script>alert(1)</script>"); // inert text, rendered via textContent
  assert.equal(typeof s.utm_medium, "string");
  assert.ok(s.utm_medium.length <= 80);
  assert.doesNotThrow(() => C.parseSource("%%%&=&&utm_source", "not a url"));
});

test("referrer is hostname only with direct fallback", () => {
  assert.equal(C.referrerHost("https://news.ycombinator.com/item?id=1&token=secret#x"), "news.ycombinator.com");
  assert.equal(C.referrerHost(""), "direct");
  assert.equal(C.referrerHost("garbage"), "direct");
  assert.equal(C.referrerHost("javascript:alert(1)"), "direct");
  assert.equal(C.referrerHost(undefined), "direct");
  assert.equal(C.referrerHost("https://me.example/page", "me.example"), "direct"); // same-site navigation
  assert.equal(C.parseSource("", "").referrer_host, "direct");
});

test("store persists via storage and only touches its own key", () => {
  const data = { other: "keep" };
  const st = {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = v; },
    removeItem: (k) => { delete data[k]; },
  };
  const store = C.createStore(() => st);
  store.save(C.addEvent(C.emptyState(), "page_view"));
  assert.deepEqual(store.load().events, ["page_view"]);
  store.reset();
  assert.deepEqual(store.load().events, []);
  assert.equal(data.other, "keep");
  assert.ok(!(C.KEY in data));
});

test("blocked storage falls back to memory without throwing", () => {
  const boom = () => { throw new Error("blocked"); };
  const st = { getItem: boom, setItem: boom, removeItem: boom };
  for (const getter of [() => st, () => { throw new Error("denied"); }]) {
    const store = C.createStore(getter);
    assert.doesNotThrow(() => store.save(C.addEvent(C.emptyState(), "click: email")));
    assert.deepEqual(store.load().events, ["click: email"]);
    assert.doesNotThrow(() => store.reset());
    assert.deepEqual(store.load().events, []);
  }
});

test("tampered stored state is re-sanitized", () => {
  const st = {
    getItem: () => JSON.stringify({ source: { utm_source: "z".repeat(300), referrer_host: 5 }, events: ["page_view", "<b>x</b>", 7] }),
    setItem() {}, removeItem() {},
  };
  const s = C.createStore(() => st).load();
  assert.equal(s.source.utm_source.length, 80);
  assert.equal(s.source.referrer_host, "direct");
  assert.deepEqual(s.events, ["page_view"]);
});

test("mergeSource keeps stored source when a reload has none; counts clicks", () => {
  let s = C.mergeSource(C.emptyState(), C.parseSource("?utm_source=hackernews", ""));
  s = C.mergeSource(s, C.parseSource("", ""));
  assert.equal(s.source.utm_source, "hackernews");
  s = C.addEvent(C.addEvent(s, "click: email"), "click: crediclip_case_study");
  assert.deepEqual(C.counts(s), { email: 1, crediclip_case_study: 1 });
  assert.deepEqual(C.addEvent(s, "bogus").events, s.events);
});
