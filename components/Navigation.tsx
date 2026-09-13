"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { APP_URL, NAV_LINKS } from "@/lib/site";
import ButtonLink from "./ButtonLink";
import Logo from "./Logo";
import styles from "./Navigation.module.css";

export default function Navigation() {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Solid bar as soon as the hero stops being pinned and its content starts sliding
  // beneath the bar; active section marker.
  useEffect(() => {
    const header = headerRef.current!;
    const hero = document.getElementById("topo");
    let heroEnd = 0;
    let solid: boolean | null = null;
    let frame = 0;

    const update = () => {
      frame = 0;
      const next = window.scrollY > heroEnd - window.innerHeight;
      if (next !== solid) {
        solid = next;
        header.dataset.solid = String(next);
      }
    };
    const measure = () => {
      heroEnd = hero ? hero.offsetTop + hero.offsetHeight : 0;
      update();
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const resize = new ResizeObserver(measure);
    if (hero) resize.observe(hero);
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });

    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("[data-nav-link]"));
    const sections = NAV_LINKS.map((l) => document.querySelector(l.href)).filter(
      (s): s is Element => s !== null,
    );
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const href = `#${entry.target.id}`;
          for (const link of links) {
            if (link.getAttribute("href") !== href) continue;
            if (entry.isIntersecting) link.setAttribute("aria-current", "true");
            else link.removeAttribute("aria-current");
          }
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((s) => sectionObserver.observe(s));

    return () => {
      resize.disconnect();
      sectionObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // In-page links glide to their section (instantly when motion is reduced).
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element).closest?.<HTMLAnchorElement>('a[href^="#"]');
      const id = link?.getAttribute("href")?.slice(1);
      const target = id ? document.getElementById(id) : null;
      if (!target) return;

      event.preventDefault();
      setOpen(false);
      requestAnimationFrame(() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
        history.pushState(null, "", `#${id}`);
      });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Mobile menu: lock scroll, move focus in, make the page inert, close on Escape.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    const outside = [document.getElementById("conteudo"), document.getElementById("rodape")];

    html.style.overflow = "hidden";
    outside.forEach((node) => node?.setAttribute("inert", ""));
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const desktop = window.matchMedia("(min-width: 900px)");
    const onBreakpoint = () => desktop.matches && setOpen(false);

    document.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onBreakpoint);
    return () => {
      html.style.overflow = previousOverflow;
      outside.forEach((node) => node?.removeAttribute("inert"));
      document.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onBreakpoint);
    };
  }, [open]);

  return (
    <header ref={headerRef} className={styles.header} data-open={open}>
      <nav className={styles.bar} aria-label="Principal">
        <a className={styles.brand} href="#topo" aria-label="Taxi Flow, voltar ao início">
          <Logo />
        </a>
        <ul className={styles.links}>
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a className={styles.link} href={link.href} data-nav-link>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <a className={styles.login} href={APP_URL}>
          Entrar
        </a>
        <button
          ref={buttonRef}
          type="button"
          className={styles.menuButton}
          aria-expanded={open}
          aria-controls="menu-movel"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">{open ? "Fechar menu" : "Abrir menu"}</span>
          <span className={styles.burger} aria-hidden="true" />
        </button>
      </nav>

      <div id="menu-movel" ref={panelRef} className={styles.panel} inert={!open}>
        <ul className={styles.panelLinks}>
          {NAV_LINKS.map((link, i) => (
            <li key={link.href} style={{ "--i": i } as CSSProperties}>
              <a href={link.href} data-nav-link>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <ButtonLink href={APP_URL} className={styles.panelCta}>
          Entrar no Taxi Flow
        </ButtonLink>
      </div>
    </header>
  );
}
