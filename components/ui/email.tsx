"use client";

interface EmailProps {
  local: string;
  domain: string;
  label?: string;
  className?: string;
}

export function Email({ local, domain, label, className }: EmailProps) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.location.href = `mailto:${local}@${domain}`;
  };

  return (
    <a href={`mailto:${local}@${domain}`} onClick={handleClick} className={className}>
      {label ?? `${local}@${domain}`}
    </a>
  );
}
