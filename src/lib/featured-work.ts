/**
 * Homepage 精选 is the CMS `featured` flag on the same project records.
 * Order is the order already returned by content.public (sortOrder, then id).
 * There is no second list and no fixed card count.
 */
export function splitFeaturedProjects<T extends { id: number; featured: boolean }>(
  projects: readonly T[]
) {
  const featured = projects.filter(project => project.featured);
  const selected = new Set(featured.map(project => project.id));
  return {
    featured,
    earlier: projects.filter(project => !selected.has(project.id)),
  };
}
