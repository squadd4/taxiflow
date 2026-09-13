import { APP_URL, NAV_LINKS } from "@/lib/site";
import Logo from "../Logo";
import styles from "./sections.module.css";

export default function Footer() {
  return (
    <footer id="rodape" className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <Logo />
          <p className={styles.footerNote}>
            Feito para a estrada e para quem a conhece. Aplicações de gestão à medida de
            motoristas e empresas de táxi.
          </p>
        </div>
        <nav aria-label="Rodapé">
          <ul className={styles.footerLinks}>
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
            <li>
              <a href={APP_URL}>Entrar</a>
            </li>
          </ul>
        </nav>
        <p className={styles.legal}>© {new Date().getFullYear()} Taxi Flow</p>
      </div>
    </footer>
  );
}
