# Promotion Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public examples library, feedback/case submission from history, and a password-protected admin console for user, generation, case, and credit management.

**Architecture:** Extend the existing Supabase schema with soft-delete and case workflow fields on `generations`, add a public `case_examples` table, and add RPCs for admin/case rewards. Implement user-facing actions through authenticated server actions and admin actions through service-role clients behind a password cookie. Keep all changes local until approved.

**Tech Stack:** Next.js App Router, React Server Components, server actions, Supabase Postgres/RLS/storage, Vitest.

---

### Task 1: Data Model

**Files:**
- Create: `supabase/migrations/004_promotion_features.sql`
- Create: `src/lib/cases.ts`
- Test: `src/lib/cases.test.ts`
- Modify: `src/lib/credits.ts`
- Test: `src/lib/credits.test.ts`

- [ ] Add case workflow fields to `generations`: `deleted_at`, `case_submission_status`, `case_submitted_at`, `case_featured_at`, `case_rewarded_at`, `admin_note`.
- [ ] Create `case_examples` with generation link, user link, prompt fields, image path, title, tags, visibility, featured timestamps, and public select policy.
- [ ] Extend `credit_ledger.reason` with `admin_bonus` and `case_reward`.
- [ ] Add RPCs `apply_admin_credit_bonus` and `apply_case_reward`.
- [ ] Add helper functions for case status labels, default example seed data, and admin password verification.

### Task 2: User History Actions

**Files:**
- Create: `src/app/history/actions.ts`
- Modify: `src/app/history/page.tsx`
- Modify: `src/components/history-grid.tsx`
- Test: `src/components/history-grid.test.tsx`

- [ ] Add server actions for soft delete and case submission.
- [ ] Query only non-deleted user generations.
- [ ] Add per-card buttons for delete and submit case, with status text after submission.

### Task 3: Examples And Feedback

**Files:**
- Create: `src/app/examples/page.tsx`
- Create: `src/app/feedback/page.tsx`
- Create: `src/components/top-nav.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/create/page.tsx`
- Modify: `src/app/history/page.tsx`
- Modify: `src/app/account/page.tsx`

- [ ] Add shared top nav links: case examples and feedback rewards.
- [ ] Build `/examples` from accepted `case_examples`, with fallback seed examples.
- [ ] Build `/feedback` explaining reward rules and linking authenticated users to history.

### Task 4: Admin Console

**Files:**
- Create: `src/lib/admin-auth.ts`
- Create: `src/lib/admin-dashboard.ts`
- Create: `src/app/admin/actions.ts`
- Create: `src/app/admin/page.tsx`
- Test: `src/lib/admin-auth.test.ts`
- Test: `src/lib/admin-dashboard.test.ts`

- [ ] Gate `/admin` by password cookie.
- [ ] Show users with credit, recharge, usage, and reward summaries.
- [ ] Show generations with user filter and signed image previews.
- [ ] Allow marking a generation as a case.
- [ ] Allow custom credit rewards to a user.

### Task 5: Verification

**Files:**
- Modify: `src/app/globals.css`
- Modify: `.env.example`
- Modify: `docs/env.example`

- [ ] Add styles for examples, feedback, admin, history action states, and shared top nav.
- [ ] Add `ADMIN_PASSWORD` to example env docs.
- [ ] Run `npm test`, `npx tsc --noEmit`, and `npm run build`.
- [ ] Restart local preview server and capture local screenshots for review.
