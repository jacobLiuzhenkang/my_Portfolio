type ResponsiveCover = { desktop: string; wide: string; mobile: string };

/** Adapt only the known archive covers; administrator-uploaded covers stay authoritative. */
const archiveCovers: Record<string, ResponsiveCover> = Object.fromEntries(
  ["seashine", "memoring", "shike", "ip", "other"].map(project => [
    `/images/${project}/cover.webp`,
    {
      desktop: `/images/${project}/cover-adapted-v1.webp`,
      wide: `/images/${project}/cover-adapted-v1-wide.webp`,
      mobile: `/images/${project}/cover-adapted-v1-mobile.webp`,
    },
  ])
);

export function projectCoverSources(url: string | null) {
  return url && Object.hasOwn(archiveCovers, url)
    ? archiveCovers[url]
    : undefined;
}
