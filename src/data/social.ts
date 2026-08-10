export interface SocialLink {
  id: 'github' | 'x' | 'discord' | 'email'
  label: string
  href: string
  color: string
  /** Path data for the icon's single <path>, viewBox varies (see icons/). */
}

export const SOCIAL_LINKS: readonly SocialLink[] = [
  { id: 'github', label: 'GitHub', href: 'https://github.com/Dr-XAS', color: '#641a80' },
  { id: 'x', label: 'X (formerly Twitter)', href: 'https://x.com/drx_xas', color: '#8c2981' },
  { id: 'discord', label: 'Discord', href: 'https://discord.gg/cxefJpZQ', color: '#b73779' },
  { id: 'email', label: 'Email', href: 'mailto:dr.xas.drx@gmail.com', color: '#de4968' },
] as const
