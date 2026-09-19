import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSite } from './site';

/* ─────────────────────────────────────────────────────────────────────────────
   Per-page metadata. A single-page app serves one index.html to every route, so
   the title, description, canonical URL and share cards have to be written as
   each route mounts. Everything here is idempotent: tags are reused if present.
   ───────────────────────────────────────────────────────────────────────────── */

type MetaKind = 'name' | 'property';

function upsertMeta(kind: MetaKind, key: string, content: string) {
  const selector = `meta[${kind}="${key}"]`;
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(kind, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.rel = rel;
    document.head.appendChild(tag);
  }
  tag.href = href;
}

/** Replaces the single JSON-LD block; never appends a second one. */
function setStructuredData(data: unknown) {
  const id = 'vn-structured-data';
  let tag = document.getElementById(id) as HTMLScriptElement | null;
  if (!data) {
    tag?.remove();
    return;
  }
  if (!tag) {
    tag = document.createElement('script');
    tag.id = id;
    tag.type = 'application/ld+json';
    document.head.appendChild(tag);
  }
  tag.textContent = JSON.stringify(data);
}

const trim = (value: string, max = 300) => {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
};

export interface SeoInput {
  /** Page title without the site name; omit on the home page. */
  title?: string;
  description?: string;
  /** Absolute or root-relative image for the share card. */
  image?: string;
  type?: 'website' | 'article';
  /** Extra schema.org payload merged in beside the site-wide entry. */
  structuredData?: Record<string, unknown> | null;
}

export function useSeo({ title, description, image, type = 'website', structuredData = null }: SeoInput = {}) {
  const { text } = useSite();
  const { pathname } = useLocation();

  const siteName = text('site_name', 'وایب نمونه');
  const fallbackDescription = text('seo_description', text('site_tagline', ''));

  useEffect(() => {
    const origin = window.location.origin;
    const url = origin + pathname;
    const fullTitle = title ? `${title} — ${siteName}` : siteName;
    const desc = trim(description || fallbackDescription);
    const card = image ? (image.startsWith('http') ? image : origin + image) : `${origin}/og-cover.png`;

    document.title = fullTitle;
    upsertMeta('name', 'description', desc);
    upsertLink('canonical', url);

    upsertMeta('property', 'og:site_name', siteName);
    upsertMeta('property', 'og:locale', 'fa_IR');
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', desc);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', card);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', desc);
    upsertMeta('name', 'twitter:image', card);

    setStructuredData({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': `${origin}/#website`,
          name: siteName,
          url: origin,
          inLanguage: 'fa-IR',
          description: trim(fallbackDescription),
        },
        {
          '@type': 'WebPage',
          '@id': `${url}#page`,
          url,
          name: fullTitle,
          description: desc,
          isPartOf: { '@id': `${origin}/#website` },
        },
        ...(structuredData ? [structuredData] : []),
      ],
    });
  }, [title, description, image, type, structuredData, siteName, fallbackDescription, pathname]);
}
