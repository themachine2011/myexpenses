# MyExpenses Project Rules

1. Audit my Claude Skills for:

2. Visibility:

* Skills with high risk side effects (deploy, commit, send messages): add disable-model-invocation: true so Claude can't auto-fire.
* Skills that are pure background knowledge users would never /run themselves: add user-invocable: false to hide from /menu.

3. Deterministic vs non-deterministic:

* Find any step inside a skill where AI is interpreting something that's actually a fixed, repeatable operation.
* Suggest replacing those steps with a script saved inside the skill folder. Code = same result every time, no tokencost.
* Keep AI for the steps that need judgment.

4. Composability:

* Flag any skill that duplicates logic another skill already has. Suggest extracting shared logic into a callable script or a smaller composable skill.

5. Use natural, casual language instead of technical coding terms.

6. Explain things like talking to a friend who is not technical.

7. Use simple real-world analogies for complex logic or system behavior.

8. Keep explanations short, straight forward, and easy to picture mentally.

9. Focus on what is happening and why it is happening.

10. Use bullet points instead of long paragraphs whenever possible.

11. If technical terms are needed, explain them immediately in simple words.

12. Use conversational wording, phrasal verbs, and relaxed explanations.

13. Work only on the current branch, main.

14. Do not create, switch, commit, or push branches unless I clearly ask.

15. Do not use `/ultrareview` unless I explicitly request it.

16. Use `/init` if applicable.

17. Before changing files, show me proposed changes and selectable options, always with a recommendation, providing 5 options if applicable.

18. Only apply changes after I clearly say: “apply approved changes”.

19. Do not make up data, do not delete anything, rename overwrite or move files without approval.

20. Focus on the task, but first check if the request makes sense and has beneficial features, changes or even deletion, and raise 3 questions about my own prompt:
* if it makes sense
* if I am aware of the consequences of my request, showing the consequences in a short description
* suggest me a new prompt or improve my own, grabbing the idea of the prompt and my intentions

21. Do not add unrelated improvements or remove existing features without approval.

22. Use `/design`related commands for design creation if I prompt for new visuals, UI/UX always to improve the quality of the prompt.

23. Transactions is the source of truth for real spending.

24. Debts and TDG AVF / MONTH must reflect real Transactions values when showing actual spending.

25. Clearly separate:

* actual spending
* projected spending
* combined values

26. Use both **Brazilian Real (BRL)** and **US Dollar (USD)** across the Wallet system.

Requirements:

* The Wallet must always support **BRL and USD at the same time**.
* The Wallet amount must show both currencies, or allow the user to switch between them clearly.
* When the user clicks the Wallet amount or currency selector, the displayed currency must flip between **BRL** and **USD**.
* The conversion must be updated through the internet using an official exchange-rate source.
* The system must always use the **lowest available USD-to-BRL conversion rate** returned by the official source. Keeping the highest USD value possible visible. 
* Currency formatting must be correct:

  * BRL: `R$ 1.234,56`
  * USD: `$1,234.56`
* The currency switch must apply only to display values and must not break or change the original stored financial data.
* Keep the Wallet logic consistent across the entire system wherever Wallet amounts are shown.
* Add a clear fallback message or safe default behavior if the internet exchange-rate update fails.

27. Keep the dashboard premium, clean, and visually consistent. 

28. Before finishing any task, always review:

* calculations
* logic flow
* component behavior
* UI consistency
* responsiveness 
* charts and filters
* actual vs projected values
* broken connections between components

29. If any prompt above cites suggestions, place all suggestions in the stage that logically comes after review and validation rules.

30. Validate totals, averages, percentages, debts, projections, and monthly calculations using the selected period and correct data source.

31. Review the system like checking parts of a machine:

* make sure everything still connects properly
* make sure one change did not quietly break another area

32. Do not create reports except what was changed after the suggestions are applied, using short, concise and casual writing.

33. After the review, always suggest practical ideas for:

* UI polish
* smarter workflows
* automation
* premium dashboard improvements
* finance tracking
* better visualizations
* projection tools
* calculator improvements
* missing useful features

34. For design and final prompts given, always provide rounded cards on the background of any data or structure view for the user to read. Suggest 4 designs including background card color, font color, a unique color (out of pallete color) and a suggest reverse color for every aspect of the new features being amended or created. 

35. Take action point to point after you validate all these rules and potential questions you will raise mid prompt in the chat.
36. Add a dynamic **Dashboard Insight Suggestion Bubble** in a single row on the Dashboard.

The bubble must behave like an interactive animated suggestion system:

* It should appear as a soft insight bubble on the Dashboard.
* The bubble must slowly inflate while visible.
* After **30 seconds**, it must pop/explode with a smooth animation and disappear.
* Immediately after disappearing, a new suggestion bubble must appear in the same place with a different saving suggestion.
* The interaction should feel playful but not distracting.

The suggestion logic must be based on the user’s **top 5 highest-spending categories**.

Each bubble must suggest a possible spending reduction between **10% and 50%** for one or more of those categories.

Example logic:

* Reduce **Debts** by **10%**
* Reduce **Health** by **50%**
* Reduce **Subscriptions** by **25%**

The bubble must calculate and display how much money the user could save from that reduction.

Example display:

“Reduce Health by 30% and save R$ 240,00 this month.”

When the main bubble inflates, it should also show smaller sub-bubbles around it for the selected categories. These sub-bubbles must show:

* category name
* suggested reduction percentage
* estimated saving amount

The suggestions must update automatically every time:

* a new transaction is added
* spending data changes
* a category total changes
* the database is updated

Every update must create new possible saving combinations using the latest category totals.

The bubble must only affect Dashboard insights and visual suggestions. It must not modify transactions, categories, balances, Wallet values, or stored financial data.

37. Add a permanent **Overspending Reminder Bubble** next to the dynamic suggestion bubble.

This second bubble must stay visible permanently on the Dashboard, but it must use the same visual interaction style:

* soft bubble design
* light inflation animation
* smooth hover interaction
* optional small sub-bubbles
* readable and calm visual behavior

This bubble must remind the user when they have spent more than **R$ 100,00** on a specific item, merchant, transaction label, or category within the **last 15 days**.

The bubble must always analyze the most recent rolling 15-day period.

It should display a short reminder such as:

“You spent more than R$ 100,00 on Zaffari in the last 15 days.”

or:

“You spent too much on Food in the last 15 days.”

The related category must appear next to the message in **light grey**, clearly visible but visually secondary.

Example:

“You spent R$ 186,00 on Zaffari recently”
Category: `Groceries`

The bubble must update automatically whenever:

* a new transaction is added
* an existing transaction is edited
* a transaction is deleted
* category data changes
* the database is refreshed

The reminder must only display spending insights. It must not change stored data, create new categories, edit transactions, or alter Wallet calculations.

Both bubbles must follow the current Dashboard style, theme system, dark mode, light mode, spacing, responsiveness, and accessibility rules.

37. Rules 36 and 37 must not repeat the information displayed in 10 bubbles in a row. Must display new information sequently. Only bubble 11 can repeat information displayed in bubble one if no applicable or logic suggestions are considered to display. 


