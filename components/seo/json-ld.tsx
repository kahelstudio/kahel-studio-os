export default function JsonLd() {
  const siteUrl = "https://kahelstudio.com";
  const logoUrl = `${siteUrl}/kahelstudio-logo_b.svg`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "PhotographyBusiness",
        "@id": `${siteUrl}/#business`,
        name: "Kahel Studio",
        description:
          "Professional photography studio in Tabaco City, Albay, Philippines. Specializing in portrait sessions, debut, christening, birthday, and event photography across Bicol and Luzon.",
        image: [
          `${siteUrl}/Solo_Liza%20Burzon%20Bino_9A.jpg`,
          logoUrl,
        ],
        logo: logoUrl,
        url: siteUrl,
        telephone: "+63 969 153 2992",
        email: "hello@kahelstudio.com",
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
        potentialAction: {
          "@type": "ReserveAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl}/#book`,
            actionPlatform: [
              "https://schema.org/DesktopWebPlatform",
              "https://schema.org/MobileWebPlatform",
            ],
          },
          result: {
            "@type": "Reservation",
            name: "Photography Session Booking",
          },
        },
        sameAs: [
          "https://www.facebook.com/kahelstudio",
          "https://www.instagram.com/kahelstudio",
          "https://www.tiktok.com/@kahel.studio",
          "https://youtube.com/@kahelstudio",
        ],
        foundingDate: "2022",
      },
      {
        "@type": "Service",
        "@id": `${siteUrl}/#studio-sessions`,
        name: "Studio Sessions",
        description:
          "Professional portrait, solo, duo, group, and mini photo sessions in our photography studio in Tabaco City, Albay. Ideal for individuals, couples, families, and business branding.",
        provider: { "@id": `${siteUrl}/#business` },
        areaServed: {
          "@type": "Place",
          name: "Tabaco City, Albay",
        },
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "PHP",
          lowPrice: "999",
          highPrice: "3000",
        },
      },
      {
        "@type": "Service",
        "@id": `${siteUrl}/#event-photography`,
        name: "Event Photography",
        description:
          "Debut, christening, birthday, anniversary, and celebration photography coverage across Bicol, Luzon, and the Philippines.",
        provider: { "@id": `${siteUrl}/#business` },
        areaServed: {
          "@type": "Place",
          name: "Luzon, Philippines",
        },
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "PHP",
          lowPrice: "5000",
          highPrice: "10000",
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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
    />
  );
}
