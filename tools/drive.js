const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const EV = process.env.EVIDENCE_DIR || "/tmp/evidence";
const BASE = process.env.BASE || "http://127.0.0.1:8765/";
const out = (k, v) => console.log(k.padEnd(34), JSON.stringify(v));
const panel = (p) => p.evaluate(() => ({
  src: ["utm_source","utm_medium","utm_campaign","referrer_host"].map(f => document.getElementById("v-"+f).textContent),
  log: [...document.querySelectorAll("#event-log li")].map(l => l.textContent),
  email: document.getElementById("count-email").textContent,
  cc: document.getElementById("count-crediclip").textContent,
}));
(async () => {
  const b = await chromium.launch();
  // layouts
  for (const [name, w, h] of [["phone",375,800],["desktop",1280,800]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    const reqs = []; p.on("request", r => reqs.push(r.url()));
    await p.goto(BASE);
    out(name+" overflow", await p.evaluate(() => document.documentElement.scrollWidth > innerWidth));
    out(name+" console below CTAs", await p.evaluate(() => document.getElementById("console-title").getBoundingClientRect().top > document.querySelector(".ctas").getBoundingClientRect().bottom - 1));
    out(name+" requests", reqs.map(u => new URL(u).pathname));
    await p.screenshot({ path: `${EV}/${name}-top.png` });
    await p.screenshot({ path: `${EV}/${name}-full.png`, fullPage: true });
    await ctx.close();
  }
  // demo link, reload, reset, new session
  let ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  let p = await ctx.newPage();
  await p.goto(BASE);
  out("direct", await panel(p));
  await p.click("#demo-link");
  await p.waitForURL(/utm_source=hackernews/);
  out("after demo link", await panel(p));
  await p.reload();
  out("after reload (persisted)", await panel(p));
  // CTA clicks navigate (block external)
  await p.route(/^(?!http:\/\/127).*/, r => r.fulfill({ status: 200, body: "ext" }));
  await p.click("#cta-crediclip");
  await p.waitForURL(/alirazaai\.page/);
  out("crediclip navigated to", p.url());
  await p.goBack(); await p.waitForSelector("#event-log");
  out("after crediclip click+back", await panel(p));
  const emailHref = await p.getAttribute("#cta-email", "href");
  out("email href", emailHref);
  await p.evaluate(() => document.getElementById("cta-email").addEventListener("click", e => { window.__prevented = e.defaultPrevented; }, { once: false }));
  await p.evaluate(() => document.addEventListener("click", e => { window.__dp = e.defaultPrevented; }));
  await p.click("#cta-email").catch(()=>{});
  out("email click defaultPrevented", await p.evaluate(() => window.__dp));
  out("after email click", await panel(p));
  await p.click("#reset-demo");
  out("after reset", await panel(p));
  out("sessionStorage keys after reset", await p.evaluate(() => Object.keys(sessionStorage)));
  const p2 = await ctx.newPage(); // same context, new tab = new session
  await p2.goto(BASE);
  out("new tab", await panel(p2));
  await ctx.close();
  // hostile input
  ctx = await b.newContext(); p = await ctx.newPage();
  const errs = []; p.on("pageerror", e => errs.push(String(e)));
  await p.goto(BASE + "?utm_source=%3Cscript%3Ewindow.__x=1%3C%2Fscript%3E%3Cimg%20src=x%20onerror=window.__x=2%3E&utm_medium=%E0%A4%A&utm_campaign=" + "a".repeat(300) + "&utm_source=second");
  out("hostile", await panel(p));
  out("injected nodes / __x", await p.evaluate(() => [document.querySelectorAll("#console-live script,#console-live img").length, window.__x]));
  out("lengths<=80", await p.evaluate(() => ["utm_source","utm_medium","utm_campaign"].every(f => document.getElementById("v-"+f).textContent.length <= 80)));
  out("page errors", errs);
  await ctx.close();
  // referrer
  ctx = await b.newContext(); p = await ctx.newPage();
  await p.route("**/*", r => r.request().url().startsWith("http://127") ? r.continue() : r.fulfill({ status: 200, contentType: "text/html", body: "<a id=l href='"+BASE+"'>go</a>" }));
  await p.goto("http://news.ycombinator.com/item?id=1&secret=abc");
  await p.click("#l"); await p.waitForSelector("#event-log");
  out("referrer host only", (await panel(p)).src);
  await ctx.close();
  // blocked sessionStorage
  ctx = await b.newContext(); p = await ctx.newPage();
  await p.addInitScript(() => { const t = () => { throw new DOMException("blocked", "SecurityError"); };
    Object.defineProperty(window, "sessionStorage", { get: t }); });
  const errs2 = []; p.on("pageerror", e => errs2.push(String(e)));
  await p.goto(BASE + "?utm_source=blocked");
  await p.route(/^(?!http:\/\/127).*/, r => r.fulfill({ status: 200, body: "ext" }));
  await p.click("#cta-email"); await p.click("#cta-email");
  out("blocked storage page errors", errs2);
  out("blocked: panel", await panel(p));
  await ctx.close();
  // keyboard
  ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); p = await ctx.newPage();
  await p.goto(BASE);
  const order = [];
  for (let i = 0; i < 20; i++) {
    await p.keyboard.press("Tab");
    order.push(await p.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); return (e.id || e.textContent.trim().slice(0,22)) + (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2 ? " [focus ok]" : " [NO FOCUS]"); }));
  }
  out("tab order", order);
  await p.keyboard.press("Shift+Tab"); 
  await p.goto(BASE); await p.keyboard.press("Tab"); await p.keyboard.press("Enter");
  out("skip link hash", await p.evaluate(() => location.hash));
  await p.focus("#reset-demo"); await p.screenshot({ path: `${EV}/focus-reset.png` });
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
