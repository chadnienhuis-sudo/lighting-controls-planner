/**
 * A+ Lighting Solutions brand constants. Used for rendering attribution,
 * contact info, and legal text across the web preview and the exported PDF.
 */
export const BRAND = {
  legalName: "A+ Lighting Solutions, LLC",
  displayName: "A+ Lighting Solutions",
  address: {
    line1: "2336 Wilshere Dr #103",
    cityStateZip: "Jenison, MI 49428",
  },
  phone: "(866) 798-4446",
  email: "sales@apluslightingllc.com",
  website: "apluslightingllc.com",
} as const;

/** Single-line contact string — suited to a compact footer row. */
export function brandContactLine(): string {
  const { address, phone, email } = BRAND;
  return `${address.line1}, ${address.cityStateZip} · ${phone} · ${email}`;
}
