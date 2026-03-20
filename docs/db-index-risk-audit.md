# DB Index Risk Audit

Date: 2026-03-20

Added now:
- `pomodoro_sessions (user_id, running, updated_at)` for `findActiveByUser(userId)` ordered by newest update.
- `pomodoro_sessions (user_id, task_id, updated_at)` for `findLatestByTask(userId, taskId)` ordered by newest update.

Why these were added:
- Both session lookups currently filter on leading equality columns and then sort by `updated_at DESC`.
- The previous single-column and partial composite indexes could still force extra sorting or broader scans as session history grows.
- These indexes are backward compatible and directly match current repository query shapes.

Current watchpoints:
- `tasks.findByUser(userId)` sorts by `created_at` after filtering by `user_id` and optional status/archive fields. That is acceptable at current scope, but if per-user task counts grow materially, add a composite task-list index that matches the final production filter shape.
- `task_progress_events` are only inserted today. If timeline or analytics reads are introduced beyond the existing `task_id` and `user_id` time-series indexes, re-audit before shipping them.
