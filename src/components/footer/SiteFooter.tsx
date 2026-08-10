import { SOCIAL_LINKS } from '@/data/social'
import { FOOTER_LINKS } from '@/data/footer'
import { SOCIAL_ICONS } from '@/components/icons/SocialIcons'

// Ported from index.html:222-266 (<footer class="site-footer">). The four
// `.footer-socials a.social-*` rules collapse into one, driven by
// `--social-color` set inline per link (see styles/footer.css).

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-bottom-container">
        <div className="footer-left">
          <div className="footer-socials">
            {SOCIAL_LINKS.map((link) => {
              const Icon = SOCIAL_ICONS[link.id]
              return (
                <a
                  key={link.id}
                  href={link.href}
                  aria-label={link.label}
                  target={link.id === 'email' ? undefined : '_blank'}
                  className={`social-${link.id}`}
                  style={{ '--social-color': link.color }}
                >
                  {Icon && <Icon />}
                </a>
              )
            })}
          </div>
          <div className="footer-links-row">
            {FOOTER_LINKS.map((link) => (
              <a key={link.label} href={link.href}>
                {link.label}
              </a>
            ))}
          </div>
          <div className="footer-ldrd-support">
            This project is supported by the Laboratory Directed Research and Development (LDRD) program at the
            Advanced Photon Source, Argonne National Laboratory.
          </div>
          <div className="footer-copyright">
            <p>&copy; 2026 Dr. XAS Project. All rights reserved.</p>
          </div>
        </div>

        <div className="footer-right" />
      </div>
    </footer>
  )
}
