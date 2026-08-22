# Payment provider logos

Drop official brand files here, then point at them from `paymentMethods` in
`lib/site-config.ts`:

```ts
{ name: "GCash", detail: "…", icon: "wallet", logo: "/images/payments/gcash.svg" }
```

Until a `logo` is set the badge falls back to a neutral icon, so the site is
never showing an approximation of somebody else's mark.

## Where the files come from

These are third-party trademarks. Take them from each provider's own brand kit
rather than from a web search, and check the usage terms — most permit display
only by registered merchants, and set rules on clear space and minimum size.

- GCash / GGives — GCash merchant brand assets
- Maya — Maya Business brand assets
- Bayad Center — partner/merchant brand assets

## Format

SVG preferred; a transparent PNG at 2x the display height (40px+) also works.
The badge renders them at 20px tall with width auto, so marks of different
proportions still line up.
