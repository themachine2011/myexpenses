# MyExpenses Project Rules

## 1. Communication style

- Use simple, casual, natural language.
- Avoid technical terms when possible.
- If a technical term is needed, explain it immediately in plain words.
- Prefer bullet points over long paragraphs.
- Keep explanations short, practical, and easy to picture.
- Use real-world analogies only when they make complex logic clearer.

## 2. Safe workflow

- Use the current branch by default.
- Branch usage is optional. Only create, switch, or work on another branch if it makes sense for the task or if I ask for it.
- Do not commit, push, rename, delete, overwrite, or move files unless I clearly approve it.
- Before changing files, show:
  - what you found
  - proposed changes
  - 4 practical options
  - your recommendation
- Apply changes only after I clearly approve with words like:
  - `go`
  - `ok`
  - `apply`
  - `sure`
  - `just do it`
- Do not add unrelated improvements or remove existing features without approval.

## 3. Prompt review

- Before acting, check whether my request makes sense.
- Ask questions only when the request is unclear, risky, or could cause unwanted side effects.
- Do not force questions when the request is already clear.
- When helpful, suggest a cleaner version of my prompt that keeps my original intention.

## 4. Claude Skills rules

- For skills with risky side effects, such as deploy, commit, push, or sending messages, use `disable-model-invocation: true`.
- For background-only skills that users should not run manually, use `user-invocable: false`.
- Do not duplicate skill logic.
- If two skills repeat the same steps, suggest extracting shared logic into a script or smaller reusable skill.
- Use scripts for fixed, repeatable actions.
- Use AI only where judgment is needed.

## 5. Project financial logic

- Transactions are the source of truth for real spending.
- Debts and TDG AVF / MONTH must reflect real Transaction values when showing actual spending.
- Always clearly separate:
  - actual spending
  - projected spending
  - combined values
- Validate totals, averages, percentages, debts, projections, and monthly calculations using the selected period and correct data source.

## 6. Wallet and currency rules

- Wallet must support BRL and USD.
- Currency switching must affect display only.
- Currency switching must never change stored financial data.
- Use correct formatting:
  - BRL: `R$ 1.234,56`
  - USD: `$1,234.56`
- Exchange-rate updates must use an official source when internet access is available.
- If exchange-rate fetching fails, show a clear fallback message and keep the last safe/default value.

## 7. UI and dashboard quality

- Keep the dashboard premium, clean, responsive, and visually consistent.
- Preserve the current theme system, spacing, dark mode, light mode, and accessibility rules.
- For UI changes, use rounded cards and readable contrast.
- Suggest design options only when the task is related to UI/UX or when I ask for design ideas.

## 8. Final validation before finishing

Before finishing, review:

- calculations
- logic flow
- component behavior
- UI consistency
- responsiveness
- charts and filters
- actual vs projected values
- broken connections between components

Report only:

- what changed
- what was checked
- any important risk found

Do not create long reports unless I ask for one.

## 9. Commands and tools

- Do not use `/ultrareview` unless I explicitly request it.
- Use `/memory` to check which rules files are loaded when behavior seems inconsistent.
- Use `/init` only when setting up or refreshing project guidance.
- For visual or design work, use available Claude Design/design tooling only when available in the current environment such as `/design-system` `/frontend-design` `/design-handoff`