import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "API reference - Stockpile",
  description: "Interactive REST API documentation for the Stockpile inventory API.",
};

/**
 * Renders public/openapi.json with Scalar, loaded from a CDN. Deliberately not
 * a generated spec: the handlers are thin, so a hand-written OpenAPI document
 * stays readable and reviewable, and it is served as a plain static file that
 * any tool (Postman, curl, a codegen) can consume.
 *
 * Public on purpose so the API can be reviewed without signing in.
 */
export default function ApiDocsPage() {
  return (
    <>
      {/* Scalar reads its configuration from this element's data attributes. */}
      <script id="api-reference" data-url="/openapi.json" />
      <Script
        src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"
        strategy="afterInteractive"
      />
      <noscript>
        <p style={{ padding: 24 }}>
          This page renders the OpenAPI document with JavaScript. The raw spec is available at{" "}
          <a href="/openapi.json">/openapi.json</a>.
        </p>
      </noscript>
    </>
  );
}
