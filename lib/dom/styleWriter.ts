/** Writes inline styles only when a value actually changes. */
export function createStyleWriter() {
  const written = new Map<HTMLElement, Map<string, string>>();
  return {
    set(el: HTMLElement, property: string, value: string) {
      let props = written.get(el);
      if (!props) written.set(el, (props = new Map()));
      if (props.get(property) === value) return;
      props.set(property, value);
      el.style.setProperty(property, value);
    },
    clear() {
      written.forEach((props, el) => props.forEach((_, p) => el.style.removeProperty(p)));
      written.clear();
    },
  };
}
