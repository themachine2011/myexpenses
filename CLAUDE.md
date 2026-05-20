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

22. Use `/design` related commands for design creation if I prompt for new visuals, UI/UX always to improve the quality of the prompt.

23. Transactions is the source of truth for real spending.

24. Debts and TDG AVF / MONTH must reflect real Transactions values when showing actual spending.

25. Clearly separate:

* actual spending
* projected spending
* combined values

26. Use Brazilian currency formatting:

* R$ 1.532,26
* decimal comma
* thousands separator with dot

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


