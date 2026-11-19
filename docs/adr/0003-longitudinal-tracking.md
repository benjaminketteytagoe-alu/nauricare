# 0003: Longitudinal tracking data model

Date: 2026-11-19 · Status: Accepted

## Context

Pilot feedback said isolated symptom checks aren't enough. Women need to log cycles, symptoms, habits and lab biomarkers over time, so that patterns across cycles become visible.

## Decision

- **Keep** `CycleLog`, `CycleDayLog` and `HabitLog`.
- **Extend `CycleDayLog`** with optional pain, sleep, stress and basal temperature fields.
- **Add `LabResult`:** biomarker catalog key, value, unit, reference range, collection date, source, and an optional document.
- **Add `BodyMetric`.**
- **Units** are normalised through a typed biomarker catalog.
- **Encryption:** free text and lab values are sealed at rest.
- **Export:** data can be exported as JSON and FHIR R4.

## Consequences

This needs one additive migration. All provider reads go through a single consent-aware access check.
