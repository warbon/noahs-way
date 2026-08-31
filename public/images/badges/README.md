# Registration badges

Marks for the entries in `accreditations` in `lib/site-config.ts`. Drop a file
here, then point at it:

```ts
{
  label: "BIR Registration",
  value: env("NEXT_PUBLIC_BIR_REGISTRATION", "RSN 080RC20250000004120"),
  note: "…",
  logo: { src: "/images/badges/bir-registered.png", width: 177, height: 145 }
}
```

`width` and `height` must be the file's true pixel dimensions — the badge is
height-constrained with `width: auto`, so the browser sizes the box from this
ratio before the image decodes. Wrong numbers make the badge jump width on
load. Check with `sips -g pixelWidth -g pixelHeight <file>`.

Until `logo` is set the entry renders text-only. That is a working state, not a
broken one — the registration number is what a customer verifies, so nothing is
lost while a file is missing.

A mark is also dropped when the entry's `value` is still blank, so adding a
file to an entry that has no number yet changes nothing on the page. That is
deliberate: an official emblem above a "to be added" placeholder would claim a
credential the business does not hold.

## Where the files come from

Both files came from the sibling `acwareorg` project, which had already prepared
them. Both are plain agency emblems carrying no RSN, no QR and no year, so they
identify the issuing body rather than any particular business — which is why
they are safe to share between projects.

- **BIR** — `bir-registered.png`. The "REGISTERED" shield only. The full badge
  the Bureau issues is a wide composite — shield, wordmark, and a QR encoding
  this business's RSN — and at the size these render the QR would be far too
  small to scan, so it earns nothing. The RSN sits beside the shield as text
  instead. Background keyed to transparent and trimmed to content.
- **DTI** — `dti.png`. The agency logo. DTI issues no per-business display
  badge, so the plain mark is all there is; see the note below.

If a per-business badge is ever wanted instead, it has to be *this* business's,
downloaded from the issuing portal — another company's badge resolves to their
registration, which is worse than showing none.

## A note on the DTI logo

The BIR badge exists to be displayed; the DTI logo does not. A business name
registration records a trading name — the certificate says in as many words that
it "is not a license to engage in any kind of business" — so the agency logo
beside it can read as accreditation or endorsement by DTI, which it isn't. The
number alone carries the trust signal without that implication. Showing the logo
is the owner's call, and it has been made here; this note exists so the reasoning
isn't lost if anyone revisits it.

## Format

Transparent PNG or SVG, at least 120px tall so it stays sharp at the rendered
56px.

Trim surrounding whitespace before adding a file. The height constraint applies
to the image, not to the artwork inside it, so a mark with wide margins renders
smaller than its neighbours and looks inconsistent.

Both marks sit on a white chip, which is load-bearing: they are drawn in dark
navy, the same colour as the footer, and would vanish there without a light
backing. That also means a file with its own flat white background looks fine —
but transparent is still preferred, since the chip's colour may not stay white.
