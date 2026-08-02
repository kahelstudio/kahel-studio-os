import Link from "next/link";
import Image from "next/image";
import styles from "./customer-auth.module.css";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

function BrandLink({ mobile = false }: { mobile?: boolean }) {
  return (
    <Link
      href="/"
      className={`${styles.brandLink} ${mobile ? styles.mobileBrand : ""}`}
      aria-label="Kahel Studio home"
    >
      <Image src="/kahelstudio-logo_b.svg" alt="Kahel Studio" width={164} height={24} priority />
    </Link>
  );
}

export function AuthShell({ eyebrow, title, description, children, footer }: AuthShellProps) {
  return (
    <main className={styles.page}>
      <section className={styles.shell} aria-labelledby="customer-auth-title">
        <aside className={styles.brandPanel} aria-label="Kahel Studio customer portal">
          <BrandLink />
          <div className={styles.brandCopy}>
            <p>Your story, kept in one place.</p>
            <p>Review sessions, follow project updates, and access your studio deliveries.</p>
          </div>
        </aside>
        <div className={styles.formPanel}>
          <div className={styles.formWrap}>
            <BrandLink mobile />
            <header>
              <p className={styles.eyebrow}>{eyebrow}</p>
              <h1 className={styles.title} id="customer-auth-title">{title}</h1>
              <p className={styles.description}>{description}</p>
            </header>
            <div className={styles.content}>{children}</div>
            {footer ? <footer className={styles.footer}>{footer}</footer> : null}
          </div>
        </div>
      </section>
    </main>
  );
}
