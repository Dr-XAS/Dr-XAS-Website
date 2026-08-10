// The legacy footer links are all dead (href="#"). Preserved as-is rather
// than invented — wire these up to real pages/anchors when content exists.
export interface FooterLink {
  label: string
  href: string
}

export const FOOTER_LINKS: readonly FooterLink[] = [
  { label: 'About Us', href: '#' },
  { label: 'Contact', href: '#' },
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms of Service', href: '#' },
] as const
