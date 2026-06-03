# ImmiMate UI standards

Shared primitives for consistent, accessible workspace UI. Import from `@/components/ui/standards`.

| Export | Use when |
|--------|----------|
| `ui` | Token class strings (inputs, cards, tables) |
| `WorkflowProgress` | Multi-step async operations (send agreement, dispatch document) |
| `AutosaveIndicator` | Wizards with debounced draft save |
| `PageEmptyState` | Module list has zero DB-backed rows |

Do not add fake metrics, badges, or analytics here.
