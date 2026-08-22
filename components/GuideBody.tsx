import type { GuideBlock } from "@/lib/guides"

/**
 * Renders a guide's blocks.
 *
 * A small fixed block vocabulary rather than raw HTML: guide content is prose
 * about visa rules and fees, and the set of shapes it needs is genuinely small.
 * Keeping it typed means a guide cannot introduce markup, and the styling of
 * every guide stays consistent without anyone remembering the classes.
 */
export default function GuideBody({ blocks }: { blocks: GuideBlock[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`

        switch (block.type) {
          case "heading":
            return (
              <h2 key={key} className="pt-4 text-2xl font-bold text-primary">
                {block.text}
              </h2>
            )

          case "paragraph":
            return (
              <p key={key} className="max-w-prose leading-relaxed text-foreground/90">
                {block.text}
              </p>
            )

          case "list": {
            const List = block.ordered ? "ol" : "ul"
            return (
              <List
                key={key}
                className={`max-w-prose space-y-2 pl-5 text-foreground/90 ${
                  block.ordered ? "list-decimal" : "list-disc"
                }`}
              >
                {block.items.map((item) => (
                  <li key={item} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </List>
            )
          }

          case "checklist":
            return (
              <ul key={key} className="max-w-prose space-y-2">
                {block.items.map((item) => (
                  <li key={item} className="flex gap-2.5 leading-relaxed">
                    <span aria-hidden="true" className="font-bold text-emerald-600">
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )

          case "table":
            return (
              <figure key={key} className="max-w-prose">
                {/* Its own scroll container so a wide table never scrolls the page. */}
                <div className="overflow-x-auto rounded-2xl border border-border">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        {block.columns.map((column) => (
                          <th
                            key={column}
                            scope="col"
                            className="border-b border-border bg-muted/60 px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground"
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {block.rows.map((row) => (
                        <tr key={row.join("|")}>
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cell}
                              className={`border-b border-border px-4 py-3 align-top last:border-b-0 ${
                                cellIndex === 0 ? "font-semibold text-foreground" : "text-muted-foreground"
                              }`}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {block.caption ? (
                  <figcaption className="mt-2 text-xs text-muted-foreground">
                    {block.caption}
                  </figcaption>
                ) : null}
              </figure>
            )

          case "note": {
            const warning = block.tone === "warning"
            return (
              <aside
                key={key}
                className={`max-w-prose rounded-2xl border p-5 ${
                  warning
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-primary/15 bg-muted/50"
                }`}
              >
                {block.title ? (
                  <p
                    className={`text-sm font-bold ${
                      warning ? "text-destructive" : "text-primary"
                    }`}
                  >
                    {block.title}
                  </p>
                ) : null}
                <p
                  className={`text-sm leading-relaxed text-muted-foreground ${
                    block.title ? "mt-1.5" : ""
                  }`}
                >
                  {block.text}
                </p>
              </aside>
            )
          }
        }
      })}
    </div>
  )
}
