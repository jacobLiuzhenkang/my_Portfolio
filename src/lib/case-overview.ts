import { caseMarkdown, legacyPlain } from "@contracts/project-content";

// Read only explicitly named editorial sections. A project description alone
// does not establish an outcome, so never use it as a result fallback.
export function caseOverview(content: string, description = "") {
  const sections = new Map<string, string>();
  let heading = "";
  for (const line of caseMarkdown(content).split("\n")) {
    const match = line.match(/^#{1,6}\s+(?:\d{2}\.\s*)?(.+?)\s*$/);
    if (match) {
      heading = match[1];
      if (!sections.has(heading)) sections.set(heading, "");
    } else if (heading && !/^\s*(?:!\[|\[[^\]]*\]\(|\*\*项目时间)/.test(line)) {
      sections.set(heading, sections.get(heading) + line + "\n");
    }
  }
  const read = (names: string[]) => {
    for (const name of names) {
      const value = legacyPlain(sections.get(name) || "").trim();
      if (value) return value;
    }
    return "";
  };
  return [
    {
      label: "问题",
      source: "背景与痛点",
      text: read(["问题", "项目背景"]) || description.trim(),
    },
    {
      label: "做法",
      source: "方法与过程",
      text: read([
        "做法",
        "我的贡献",
        "设计策略与挑战",
        "设计策略与用户洞察",
        "设计理念与原型",
      ]),
    },
    {
      label: "结果",
      source: "成果与当前阶段",
      text: read(["结果", "当前阶段", "项目复盘", "项目总结", "设计总结"]),
    },
  ].filter(item => item.text);
}
