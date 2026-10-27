import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { PortfolioHeader } from "../../src/components/PortfolioUI";

function navBlock(source: string) {
  const nav = source.match(/<nav className="pf-nav"[\s\S]*?<\/nav>/);
  expect(nav).not.toBeNull();
  return nav![0];
}

function drawerLinks(source: string) {
  const links = source.match(/<nav className="pf-drawer-links"[\s\S]*?<\/nav>/);
  expect(links).not.toBeNull();
  return links![0];
}

describe("guestbook information architecture", () => {
  it("keeps the numbered desktop chain and drops the guestbook from it", async () => {
    const source = await readFile("src/components/PortfolioUI.tsx", "utf8");
    const nav = navBlock(source);
    expect(nav).not.toContain("留言板");
    expect(nav).not.toContain("/guestbook");
    const work = nav.indexOf("<span>01</span> 精选作品");
    const growth = nav.indexOf("<span>02</span> 我的成长");
    const contact = nav.indexOf("<span>03</span> 联系我");
    expect(work).toBeGreaterThan(-1);
    expect(growth).toBeGreaterThan(work);
    expect(contact).toBeGreaterThan(growth);

    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(PortfolioHeader, { active: "work" })
      )
    );
    const renderedNav = html.match(/<nav class="pf-nav"[\s\S]*?<\/nav>/)?.[0];
    expect(renderedNav).toBeDefined();
    expect(renderedNav).not.toContain("留言板");
    expect(renderedNav).not.toContain("/guestbook");
    expect(renderedNav).toContain("精选作品");
    expect(renderedNav).toContain("我的成长");
    expect(renderedNav).toContain("联系我");
    expect(renderedNav!.indexOf("精选作品")).toBeLessThan(
      renderedNav!.indexOf("我的成长")
    );
    expect(renderedNav!.indexOf("我的成长")).toBeLessThan(
      renderedNav!.indexOf("联系我")
    );
  });

  it("moves the phone drawer link below the main chain and keeps the footer", async () => {
    const source = await readFile("src/components/PortfolioUI.tsx", "utf8");
    const links = drawerLinks(source);
    expect(links).not.toContain("留言板");
    expect(links).not.toContain("/guestbook");
    expect(links).toContain("精选作品");
    expect(links).toContain("我的成长");
    expect(links).toContain("联系我");
    expect(source).toMatch(
      /className="pf-drawer-footer"[\s\S]*pf-drawer-quiet[\s\S]*公开留言/
    );
    expect(source).toContain('to="/guestbook"');
    expect(source).toMatch(/className="pf-footer-guestbook"[\s\S]*给我留言/);
    expect(source).toContain('to="/guestbook" className="pf-footer-guestbook"');
  });

  it("does not put the guestbook on the recruiter hero actions", async () => {
    for (const file of [
      "src/pages/Home.tsx",
      "src/components/mobile/PhoneHomeHero.tsx",
    ]) {
      const source = await readFile(file, "utf8");
      expect(source).not.toContain("/guestbook");
      expect(source).toMatch(/to="\/#contact">\s*联系我/);
    }
    const routes = await readFile("src/App.tsx", "utf8");
    expect(routes).toContain('path="/guestbook"');
    expect(routes).toContain(
      '<Route path="/contact" element={<Navigate to="/#contact" replace />} />'
    );
  });
});
