export default function JsonLd() {
  const siteUrl = "https://kahelstudio.com";
  const logoUrl = `${siteUrl}/kahelstudio-logo_b.svg`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "@id": `${siteUrl}/#business`,
        name: "Kahel Studio",
        description:
          "Timeless portraits, studio sessions, and event photography in Tabaco City, Albay.",
        image: [
          `${siteUrl}/Solo_Liza%20Burzon%20Bino_9A.jpg`,
          logoUrl,
        ],
        logo: logoUrl,
        url: siteUrl,
        telephone: "+63 969 153 2992",
        email: "hello[@]kahelstudio.com",
        priceRange: "₱₱",
        address: {
          "@type": "PostalAddress",
          streetAddress: "Cobo",
          addressLocality: "Tabaco City",
          addressRegion: "Albay",
          postalCode: "4511",
          addressCountry: "PH",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: 13.3592,
          longitude: 123.7295,
        },
        openingHoursSpecification: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
          opens: "09:00",
          closes: "17:00",
        },
        sameAs: [
          "https://www.facebook.com/kahelstudio",
          "https://www.instagram.com/kahelstudio",
          "https://www.tiktok.com/@kahel.studio",
          "https://youtube.com/@kahelstudio",
        ],
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "5.0",
          bestRating: "5",
          reviewCount: "300",
        },
        foundingDate: "2022",
      },
      {
        "@type": "Service",
        "@id": `${siteUrl}/#studio-sessions`,
        name: "Studio Sessions",
        description:
          "Portraits, branding, group and mini shoots in our Tabaco City studio.",
        provider: { "@id": `${siteUrl}/#business` },
        areaServed: {
          "@type": "Place",
          name: "Tabaco City, Albay",
        },
      },
      {
        "@type": "Service",
        "@id": `${siteUrl}/#event-photography`,
        name: "Event Photography",
        description:
          "Debut, christening, birthday and celebration coverage across Luzon.",
        provider: { "@id": `${siteUrl}/#business` },
        areaServed: {
          "@type": "Place",
          name: "Luzon, Philippines",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "Kahel Studio",
        publisher: { "@id": `${siteUrl}/#business` },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
