# Diagrams

Each diagram exists in two formats. **Keep them in sync** when editing — update both files in the same PR.

| Diagram | Mermaid (renders on GitHub) | PlantUML source |
|---|---|---|
| System context | [mermaid/system-context.md](mermaid/system-context.md) | [puml/system-context.puml](puml/system-context.puml) |
| Request lifecycle — page (SSR) | [mermaid/request-lifecycle-page.md](mermaid/request-lifecycle-page.md) | [puml/request-lifecycle-page.puml](puml/request-lifecycle-page.puml) |
| Request lifecycle — API route | [mermaid/request-lifecycle-api.md](mermaid/request-lifecycle-api.md) | [puml/request-lifecycle-api.puml](puml/request-lifecycle-api.puml) |
| Data fetching stack | [mermaid/data-fetching-stack.md](mermaid/data-fetching-stack.md) | [puml/data-fetching-stack.puml](puml/data-fetching-stack.puml) |
| Caching decision | [mermaid/caching-decision.md](mermaid/caching-decision.md) | [puml/caching-decision.puml](puml/caching-decision.puml) |
| Driver photos fallback | [mermaid/driver-photos-fallback.md](mermaid/driver-photos-fallback.md) | [puml/driver-photos-fallback.puml](puml/driver-photos-fallback.puml) |
| Projections cron | [mermaid/projections-cron.md](mermaid/projections-cron.md) | [puml/projections-cron.puml](puml/projections-cron.puml) |
| Schedule row expand | [mermaid/schedule-row-expand.md](mermaid/schedule-row-expand.md) | [puml/schedule-row-expand.puml](puml/schedule-row-expand.puml) |

## Why two formats

- **Mermaid (`mermaid/*.md`)** — renders inline on github.com, in PR descriptions, and in the VS Code Markdown preview with zero dependencies. This is the canonical view for readers.
- **PlantUML (`puml/*.puml`)** — preserved as the authoring source for richer layout, larger architecture diagrams, and future deployment/timing diagrams Mermaid can't express cleanly. Requires the PlantUML VS Code extension + Graphviz (`brew install graphviz`) for local preview.

## Maintenance rule

When you change a diagram:

1. Edit both the `.puml` and the corresponding `.md` (Mermaid block).
2. Confirm the Mermaid version renders on GitHub (open the file on github.com or in VS Code Markdown preview).
3. Mention both files in the PR description.

If a diagram type cannot be expressed in Mermaid (rare — e.g. PlantUML deployment / timing / Salt wireframe), keep only the `.puml` and link the rendered SVG from the doc instead.
