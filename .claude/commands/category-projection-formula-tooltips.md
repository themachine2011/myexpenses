# Category Projection Formula Tooltips

Use the existing project context and CLAUDE.md.

TASK:
Add formula explanation popups to the Category Projection Card.

GOAL:
When I hover the mouse over any calculated number in the Category Projection Card, a popup must appear showing the formula used to calculate that result.

The popup must only appear when hovering directly over the number, not the whole row.

When the mouse leaves the number, the popup must disappear.

IMPORTANT RULES:
1. Work only on the current branch, main.
2. Do not create, switch, commit, or push branches.
3. Do not use /ultrareview.
4. Do not create reports.
5. Do not write long explanations.
6. Do not ask for approval unless a destructive action is required.
7. Do not delete, rename, move, or overwrite files unless required and clearly safe.
8. Do not change unrelated Dashboard sections.
9. Do not rewrite transaction data.
10. Do not change calculation results unless required for the tooltip formula display.
11. Keep changes focused only on formula tooltips.
12. Keep the design consistent with the current dark premium Dashboard style.
13. Act directly after inspecting the relevant files.
14. At the end, provide only a short summary of what changed and which files were modified.

ACTION 1 — INSPECT

Inspect only the files related to:
- Dashboard
- Category Projection Card
- calculator/projection logic
- category rows
- calculated result values
- tooltip/popover components
- animations
- styling
- visible UI behavior

Identify:
1. Where the Category Projection Card is rendered.
2. Where each calculated row is displayed.
3. Where projection formulas are calculated.
4. Which rows contain calculated numbers.
5. Whether a tooltip, popover, hover card, or animation component already exists.
6. Which styling system is used.

Do not create a report.

ACTION 2 — ADD TOOLTIP POPUPS

Add a hover popup to every calculated number in the Category Projection Card.

The popup must appear for rows such as:
- actual spent value
- average spending
- reduced monthly average
- percentage reduction result
- fixed amount reduction result
- divided average result
- projected total without reduction
- projected total with reduction
- monthly saving
- yearly saving
- total projected saving
- future year projection result
- any ready-to-calculate preset result

Every row that displays a calculated number must have its own formula popup.

The popup must:
- appear only when hovering over the number
- not appear when hovering over the label
- not appear when hovering over empty space in the row
- disappear when the mouse leaves the number
- display the formula used for that exact number
- use simple plain-English explanations
- use Brazilian currency formatting
- use decimal comma and thousands separator with dot

Example popup text:

"Formula:
Average spending = total spent in selected period ÷ number of months

Example:
R$ 2.700,00 ÷ 3 months = R$ 900,00"

Another example:

"Formula:
Savings = current average × reduction percentage

Example:
R$ 900,00 × 10% = R$ 90,00 saved per month"

ACTION 3 — POPUP DESIGN

The popup must look like a rounded balloon.

Visual requirements:
1. Rounded shape.
2. Light medium red background.
3. White font.
4. Soft shadow.
5. Smooth opening transition.
6. Smooth closing transition.
7. Opening animation should feel like a balloon inflating.
8. Closing animation should feel like a bubble popping or softly shrinking.
9. Popup should not block important nearby numbers.
10. Popup should stay readable and clean.
11. Popup should match the premium Dashboard style.

Suggested visual direction:
- background: light medium red
- text: white
- large rounded corners
- soft shadow
- scale + opacity animation
- opening: scale from slightly smaller to full size
- closing: scale down and fade out
- smooth transition, not jumpy

ACTION 4 — FORMULA CONTENT

The popup must show the actual formula used by the row.

Each formula explanation should include:
1. Formula name.
2. Formula structure.
3. Values used in the calculation.
4. Final result.
5. Whether the value is based on actual Transactions data, projected data, or combined data.

Formula examples:

For average spending:
"Average spending = total category spending ÷ selected months"

For percentage reduction:
"Reduced value = average spending - selected percentage"

For projected total:
"Projected total = monthly average × projection period"

For savings:
"Savings = projected total without reduction - projected total with reduction"

For divide-by-3:
"Divided average = category average ÷ 3"

For Debts or TDG AVF / MONTH:
Explain whether the value comes from Transactions, projected data, or combined data.

Do not show confusing technical code terms to the user.

ACTION 5 — INTERACTION BEHAVIOR

The tooltip interaction must be clean and reliable.

Requirements:
1. Hovering over the number opens the popup.
2. Moving away from the number closes the popup.
3. The popup must not flicker.
4. The popup must not remain stuck open.
5. The popup must work for every calculated row.
6. The popup must work after changing category.
7. The popup must work after changing projection period.
8. The popup must work after selecting a ready-to-calculate preset.
9. The popup must not break normal calculator input.
10. The popup must not affect the calculation result.

ACTION 6 — FILE NAMING

If new files are needed, use clear names following this pattern:

- YYYY-MM-DD-component-formula-tooltip
- YYYY-MM-DD-component-category-projection-tooltip
- YYYY-MM-DD-utils-formula-explanations
- YYYY-MM-DD-styles-formula-tooltip

Use lowercase letters and hyphens only.

ACTION 7 — CHECK AFTER CHANGES

After applying the feature, check that:
1. Every calculated number has a tooltip.
2. Tooltip appears only when hovering over the number.
3. Tooltip does not appear when hovering over the label.
4. Tooltip disappears when mouse leaves the number.
5. Tooltip shows the correct formula.
6. Tooltip shows the values used in the calculation.
7. Tooltip uses Brazilian currency formatting.
8. Tooltip background is light medium red.
9. Tooltip font is white.
10. Tooltip has a rounded balloon shape.
11. Opening animation feels like a balloon inflating.
12. Closing animation feels like a bubble popping or shrinking.
13. Tooltip does not flicker.
14. Tooltip does not break calculator input.
15. Tooltip works after changing category.
16. Tooltip works after changing time period.
17. Tooltip works after using presets.
18. No unrelated Dashboard behavior was broken.

FINAL RESPONSE:
Do not create a report.

Only say:
1. Done.
2. What changed in one short paragraph.
3. Files modified.
4. Files created, if any.
5. Anything I should quickly test.
