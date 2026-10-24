const sectionNames = new Set([
  "项目背景",
  "我的贡献",
  "关键取舍",
  "协作与边界",
  "当前阶段",
  "图集说明",
  "验证方式",
]);
export function caseMarkdown(content: string) {
  return content
    .split("\n")
    .map(line => {
      const value = line.trim();
      return sectionNames.has(value) || /^\d{2}\.\s+/.test(value)
        ? "### " + value
        : /^[A-Z]\.\s+.+[:：]/.test(value)
          ? "#### " + value
          : line;
    })
    .join("\n");
}
export function inlineImageSources(content: string) {
  return new Set(
    [...content.matchAll(/!\[[^\]]*\]\(\s*([^\s)]+)\s*\)/g)].map(
      match => match[1]
    )
  );
}
export function legacyPlain(markdown: string) {
  return markdown
    .split("\n")
    .filter(
      line => !/^\s*!\[/.test(line) && !/^\s*(---|___|\*\*\*)\s*$/.test(line)
    )
    .map(line =>
      line
        .replace(/^#{1,6}\s*/, "")
        .replace(/\*\*/g, "")
        .replace(/^\s*[-*+]\s+/, "• ")
        .trimEnd()
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
export function recentCaseLayout(content: string, kind: "viform" | "sac") {
  let result = caseMarkdown(content);
  const before = (heading: string, image: string) => {
    const source = [...inlineImageSources(image)][0];
    if (source && !inlineImageSources(result).has(source)) {
      const key = "### " + heading;
      if (result.includes(key))
        result = result.replace(key, image + "\n\n" + key);
    }
  };
  if (kind === "viform")
    before(
      "关键取舍",
      "![VIFORM 亮版创作工作台：统一工具入口与创作记录](/images/viform/workspace.png)"
    );
  else {
    before("关键取舍", "![SAC 沉浸式活动首页](/images/sac/home.png)");
    before("验证方式", "![SAC 活动指南与参与流程](/images/sac/guide.png)");
  }
  return result;
}
