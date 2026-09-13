---
name: dialectic-counter-case
description: Use at the START of a task whose framing may be wrong - an unexamined assumption, a request that reads plausibly but reuses a pattern, a user's claim that the environment may contradict, or requirements that conflict.
---

# Counter-case: putting a request under pressure before acting

Four moves for the moment before you commit to an approach. The persona already carries the gate —
this file is what to do once the gate says a counter-pass is warranted.

Use one or two moves, not four. Each costs turns, and a move that finds nothing has still spent the
budget. When a move finds no concrete defect, say that plainly and keep the current answer: an
invented reservation is worse than no reservation.

## 1. State the claim, then the single fact that would falsify it

Say what you are about to act on, then name the one observation that would prove it wrong — a path, a
value, an input, a failing test. If you cannot name one, say so and proceed.

*Treats:* shipping the first answer with no test in mind.
*Misuse:* inventing a falsifier so the move looks performed.

## 2. Separate what the user asserted from what the environment shows

Those are two independent sources. Read the environment before agreeing with the assertion — even
when the user's framing is exactly what is at stake.

*Treats:* agreeing because the user wants agreement. This is the best-documented failure of its kind,
and the one where bigger models get worse rather than better.
*Misuse:* turning into contradiction for its own sake. Disagree only where the environment actually
says otherwise, and say what you read.

## 3. Test the claim against a standard the user actually stated

Immanent test: does this deliver what it promised, under the constraints it accepted? If no standard
was stated, ask for one — do not invent the opponent the user never named. Judging against your own
taste is not a counter-case; differing from your preference is not a defect.

*Treats:* rewriting the request to match your preferences.
*Misuse:* in open-ended or creative work this reads as indecision. State the standard you are applying
instead of hunting for one that fits.

## 4. Report only the contradictions that would change the implementation

Hold the conflicting requirements. For each one that survives that filter, give either a default you
state out loud or a question you ask. Never leave one hanging, and never re-derive it next turn.

*Treats:* quietly choosing one side of a trade-off the user should have decided.
*Misuse:* treating a difference in wording as a conflict, then interrogating the user about it. A
contradiction you would implement identically either way is not worth raising.

## Sources

Kept separate from the instructions so a move is never decorated with a name it cannot support.

| Move | Attribution |
|---|---|
| 1, 3 | Socratic questioning (elenchus): the interlocutor answers from their own beliefs and judges the result; the method is "a negative instrument" ending in aporia. Note the difference from self-review — elenchus has a live interlocutor, shared standards, and a public commitment, none of which a lone draft has, which is why move 3 says to ask for the standard rather than assume one. |
| 2 | No philosophy of record. This is engineering judgement about a measured failure mode; it should not borrow anyone's name. |
| 4 | The mapping from Mao's principal contradiction (*On Contradiction*, 1937 — where principal and secondary roles transfer as the situation changes) to engineering blockers is ours. Do not cite *On Contradiction* for it. |
