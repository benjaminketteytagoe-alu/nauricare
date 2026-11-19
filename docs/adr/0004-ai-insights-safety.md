# 0004: Deterministic signals first; the LLM explains

Date: 2026-11-19 · Status: Accepted

## Context

We want to produce risk trajectories and pre-consultation briefs from multi-cycle history. The platform must not diagnose, must be explainable, and must escalate safely.

## Decision

1. **Rules compute every signal.** Rules in `lib/insights/signals.ts` compute each signal (for example, cycle irregularity across 3 or more cycles) together with its evidence: dates and values. Risk levels come only from these rules and from the existing red-flag screen. The red-flag screen can only raise urgency.
2. **The model only phrases signals.** The model chain (MedGemma → Gemini → rules-only) writes the wording for the computed signals. Its output is validated against a schema, and each statement must cite a signal id. Statements that don't cite a signal are dropped.
3. **Patients always see the framing and a way to care.** Every insight carries "Educational decision support — not a diagnosis" and a one-tap route to care. Urgent signals always show emergency numbers.
4. **Briefs are traceable.** Each brief records the engine, the prompt version and a hash of its inputs. Provider review is audit-logged. Setting `INSIGHTS_AI=off` turns off the model layer and leaves the rules running.

## Consequences

Insights stay useful even when no model is reachable. A golden-case test suite runs in CI.
