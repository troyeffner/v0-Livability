# FFA Instance Seed Guide

## Objective
Initialize project FFA from a clean empty seed.

## Bootstrap Output
- `08_Data_Model_and_API_Contracts/ffa_instance.json`

## Rules
1. Keep seed empty at bootstrap.
2. First project commit should only add project-specific FFA records.
3. Never copy UXOS instance records directly into project seed.
4. Every FFA update must follow linked-change + version tracking rules.
5. OST records must live in first-class arrays: `desired_outcomes`, `opportunities`, `solutions`, `ost_links`.

## Required First Edits
1. Set `meta.is_template_seed` to `false`.
2. Set project-specific `meta.version_id`.
3. Add `epistemic_state` to every new framework record (`seed|hypothesis|stabilized`).
4. Add first assumptions/hypotheses only after intake gate is complete.
5. Any `seed` record must include `seed_metadata` with `seed_label`, `evaluation_status`, and `probe_intent`.
