import { Helmet } from 'react-helmet-async';

/**
 * SEOHead — per-route meta tags, canonical, OG, Twitter, JSON-LD
 *
 * Props:
 *   title        {string}  Full page title (shown in tab + SERPs)
 *   description  {string}  Meta description (max ~155 chars)
 *   canonical    {string}  Canonical URL (defaults to production root)
 *   ogImage      {string}  OG image URL
 *   schema       {object|object[]}  JSON-LD schema object(s) — merged into @graph
 *   noindex      {boolean} Suppress indexing (login, dashboard, etc.)
 */
export default function SEOHead({
  title = 'Book Salons Near You | MySalonBookings',
  description = 'Find and book the best salons near you instantly. Hair, spa, beard, nails and more — 500+ verified salons across India.',
  canonical = 'https://mysalonbookings.com',
  ogImage = 'https://mysalonbookings.com/icon.png',
  schema = null,
  noindex = false,
}) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="MySalonBookings" />
      <meta property="og:locale" content="en_IN" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify({ '@context': 'https://schema.org', ...(Array.isArray(schema) ? { '@graph': schema } : schema) })}
        </script>
      )}
    </Helmet>
  );
}
