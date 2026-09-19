export type IconName =
  | 'telegram' | 'windows' | 'puzzle' | 'code' | 'ae' | 'pr' | 'au' | 'ps' | 'davinci' | 'chrome'
  | 'cart' | 'chat' | 'archive' | 'bell' | 'box' | 'layers' | 'mobile' | 'globe' | 'chart' | 'spark';

export type AccentName = 'blue' | 'violet' | 'mint' | 'cream' | 'rose' | 'slate' | 'sky';

export interface Media {
  id?: number;
  kind: 'image' | 'video';
  url: string;
  caption: string;
  sortOrder?: number;
}

export interface Comment {
  id: number;
  body: string;
  createdAt: string;
  author: string;
  authorId: number;
  projectSlug?: string;
  projectTitle?: string;
}

export interface Member {
  id: number;
  username: string;
  name: string;
  role: string;
  createdAt: string;
  commentCount: number;
}

export interface Category {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  introTitle: string;
  introBody: string;
  ctaLabel: string;
  icon: IconName;
  accent: AccentName;
  sortOrder: number;
  visible: boolean;
  projectCount?: number;
}

export interface Project {
  id: number;
  slug: string;
  categoryId: number;
  title: string;
  subtitle: string;
  summary: string;
  body: string;
  icon: IconName;
  logoUrl: string;
  accent: AccentName;
  tags: string[];
  media?: Media[];
  linkUrl: string;
  featured: boolean;
  published: boolean;
  views: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  category?: { slug: string; title: string; icon: IconName; accent: AccentName; ctaLabel: string };
}

export interface Message {
  id: number;
  name: string;
  email: string;
  subject: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface User {
  id: number;
  username: string;
  name: string;
  role: string;
}

export type Settings = Record<string, string>;

export interface Bootstrap {
  settings: Settings;
  categories: Category[];
  stats: { projects: number; categories: number };
}

export interface Overview {
  counts: {
    projects: number;
    published: number;
    featured: number;
    categories: number;
    messages: number;
    unread: number;
    views: number;
    comments: number;
    members: number;
    media: number;
  };
  byCategory: { title: string; accent: AccentName; total: number }[];
  topProjects: Project[];
  recentMessages: Message[];
}

export interface ProjectInput {
  title: string;
  slug: string;
  subtitle: string;
  summary: string;
  body: string;
  icon: IconName;
  logoUrl: string;
  accent: AccentName;
  tags: string[];
  /** Omit to leave the existing gallery untouched; send an array to replace it. */
  media?: Media[];
  linkUrl: string;
  featured: boolean;
  published: boolean;
  categoryId: number;
}

export interface CategoryInput {
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  introTitle: string;
  introBody: string;
  ctaLabel: string;
  icon: IconName;
  accent: AccentName;
  visible: boolean;
}
