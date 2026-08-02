import Image from "next/image";
import type { PublicImageVariant } from "@/lib/media-contract";

type Props = {
  assetId: string;
  variant: PublicImageVariant;
  alt: string;
  width: number;
  height: number;
  sizes: string;
  className?: string;
  decorative?: boolean;
  preload?: boolean;
};

export function ResponsivePublicImage({ assetId, variant, alt, width, height, sizes, className, decorative = false, preload = false }: Props) {
  return <Image
    src={`/images/${encodeURIComponent(assetId)}/${variant}`}
    alt={decorative ? "" : alt}
    width={width}
    height={height}
    sizes={sizes}
    className={className}
    preload={preload}
    unoptimized
  />;
}