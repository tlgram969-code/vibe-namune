/** Row → API object mappers. Keeps snake_case confined to the database layer. */

export function mapCategory(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    introTitle: row.intro_title,
    introBody: row.intro_body,
    icon: row.icon,
    accent: row.accent,
    ctaLabel: row.cta_label || '',
    sortOrder: row.sort_order,
    visible: !!row.visible,
    projectCount: row.project_count ?? undefined,
  };
}

export function mapMedia(row) {
  if (!row) return null;
  return {
    id: row.id,
    kind: row.kind === 'video' ? 'video' : 'image',
    url: row.url,
    caption: row.caption,
    sortOrder: row.sort_order,
  };
}

export function mapComment(row) {
  if (!row) return null;
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    author: row.author_name || row.author_username || 'کاربر',
    authorId: row.user_id,
    projectSlug: row.project_slug ?? undefined,
    projectTitle: row.project_title ?? undefined,
  };
}

export function mapProject(row) {
  if (!row) return null;
  let tags = [];
  try {
    const parsed = JSON.parse(row.tags || '[]');
    if (Array.isArray(parsed)) tags = parsed.map(String);
  } catch {
    tags = [];
  }
  return {
    id: row.id,
    slug: row.slug,
    categoryId: row.category_id,
    title: row.title,
    subtitle: row.subtitle,
    summary: row.summary,
    body: row.body,
    icon: row.icon,
    logoUrl: row.logo_url || '',
    accent: row.accent,
    tags,
    linkUrl: row.link_url,
    featured: !!row.featured,
    published: !!row.published,
    views: row.views,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    category: row.category_slug
      ? {
          slug: row.category_slug,
          title: row.category_title,
          icon: row.category_icon,
          accent: row.category_accent,
          ctaLabel: row.category_cta || '',
        }
      : undefined,
  };
}

export function mapMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    body: row.body,
    isRead: !!row.is_read,
    createdAt: row.created_at,
  };
}

/** SELECT fragment that joins a project with its category. */
export const PROJECT_SELECT = `
  SELECT p.*,
         c.slug   AS category_slug,
         c.title  AS category_title,
         c.icon   AS category_icon,
         c.accent AS category_accent,
         c.cta_label AS category_cta
  FROM projects p
  JOIN categories c ON c.id = p.category_id`;
