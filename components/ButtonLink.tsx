import type { ComponentPropsWithoutRef } from "react";
import styles from "./ButtonLink.module.css";

interface ButtonLinkProps extends ComponentPropsWithoutRef<"a"> {
  variant?: "primary" | "secondary";
}

export default function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <a
      className={`${styles.button} ${styles[variant]} ${className ?? ""}`}
      {...props}
    />
  );
}
