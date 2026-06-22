# ChatZ Admin Platform Agent Instructions

This file is source of truth for agents building the ChatZ admin platform.

## Project Context

- Repository: `D:\pg\chat-z`
- Main backend: `backend-pg/`
- Mobile app: `ChatApp/`
- Future admin web app: `admin/`
- Admin web stack: Next.js, Tailwind CSS, shadcn/ui, Recharts
- Deploy target: Render for both `backend-pg` and `admin`

## Primary Goal

Build a full admin control center for ChatZ social media app.

Admin panel must manage:

- User reports
- Post reports
- Comment reports
- Story reports
- Chat/message reports
- Group reports
- Media reports
- User/profile reports
- Moderation actions
- Admin audit logs
- Analytics dashboards
- Retention/cohort/device/geography analytics
- Realtime flagged chat/report queue
- Admin roles and settings

## Required Build Order

Use parallel design tracks, but implementation priority is report system first.

1. Build report system in `backend-pg/`.
2. Add report buttons/flows in `ChatApp/`.
3. Create `admin/` Next.js app shell.
4. Add admin auth with existing JWT login and admin role checks.
5. Build analytics-first dashboard.
6. Build moderation queues and case workspace.
7. Add realtime flagged queue and chat monitor.
8. Add advanced analytics: retention, cohorts, geography, device, sessions.
9. Add settings, roles, and admin management.

## Backend Rules

`backend-pg/` is the main backend. Do not implement new admin APIs in old `backend/`.

Reuse existing mobile JWT auth. Add admin access control through existing users table with role/admin flag.

Suggested roles:

- `user`
- `moderator`
- `analyst`
- `admin`
- `super_admin`

Every admin API must:

- Require valid JWT
- Require admin/moderator/analyst role based on route
- Validate input
- Return consistent JSON response
- Write audit log for admin action
- Avoid leaking private data unnecessarily

## Report System Requirements

Create report support for all reportable targets:

- `post`
- `comment`
- `story`
- `message`
- `group`
- `user`
- `media`

Report fields should include:

- `id`
- `reporter_id`
- `target_type`
- `target_id`
- `reason`
- `details`
- `status`
- `priority`
- `assigned_to`
- `escalated_at`
- `created_at`
- `updated_at`

Report statuses:

- `open`
- `in_review`
- `dismissed`
- `action_taken`
- `escalated`
- `closed`

Moderation actions:

- Dismiss report
- Delete content
- Restore content
- Warn user
- Suspend user
- Ban user
- Escalate report
- Assign report
- Add notes
- Bulk actions

## Audit Log Requirements

Use full audit logging for admin actions.

Audit log must include:

- `admin_id`
- `action`
- `target_type`
- `target_id`
- `before_snapshot`
- `after_snapshot`
- `reason`
- `notes`
- `ip_address`
- `user_agent`
- `correlation_id`
- `created_at`

Never create admin action without audit log.

## Analytics Requirements

Analytics dashboard is admin UI default landing page.

Track events for:

- App open
- Login
- Signup
- Post create/view/delete
- Comment create/delete
- Story create/view/delete
- Message sent/read/reported
- Group create/join/leave
- Report created/resolved
- User banned/suspended/warned

Analytics dimensions:

- User
- Session
- Device
- Platform
- App version
- Country/region/city where available
- Timestamp

Dashboard must show:

- User growth
- DAU/WAU/MAU
- Posts/chats/reports growth
- Moderation SLA
- Ban/delete/warn trends
- Top report reasons
- Retention cohorts
- Geography breakdown
- Device/platform breakdown

## Admin UI Requirements

Create Next.js app in `admin/`.

Use:

- Tailwind CSS
- shadcn/ui
- Recharts
- Modern polished SaaS style
- Analytics-first layout

Navigation:

- Overview
- Growth
- Retention
- Moderation
- Reports
- Chats
- Users
- Settings

Moderation UI must support:

- Report queue
- Filters by type/status/priority/reason/date
- Assigned-to-me queue
- Escalated queue
- Evidence preview
- Reporter and target context
- Case notes
- Action panel
- Bulk actions
- Audit history

Chat moderation must support:

- Reported message/conversation review
- Admin search for messages/conversations
- Realtime flagged queue
- Live monitor for flagged content

## Mobile App Requirements

Add report entrypoints in `ChatApp/` for:

- Posts
- Comments
- Stories
- Messages
- Groups
- Users/profiles
- Media

Report UX:

- Use simple reason picker
- Optional details input
- Confirm submit
- Show success/error states
- Prevent duplicate rapid submit

## Security Rules

- Do not edit `.env`, `.env.local`, `node_modules/`, or `package-lock.json` manually.
- Do not expose secrets in admin UI.
- Do not let normal users access admin routes.
- Do not trust client-side role checks alone.
- Enforce role checks server-side.
- Validate all report/admin inputs.
- Rate limit report creation.
- Protect admin APIs with stricter rate limits where useful.

## Testing Requirements

Backend:

- Test report creation for every target type.
- Test invalid target type rejection.
- Test admin role access control.
- Test report status transitions.
- Test moderation actions.
- Test audit log creation.
- Test bulk actions.

Mobile:

- Test report API calls.
- Test report form validation.
- Test submit loading/success/error states.

Admin:

- Test protected routes.
- Test dashboard rendering.
- Test report queue filters.
- Test moderation action flows with mocked API.

## Done Criteria

Feature is done only when:

- Backend migration exists.
- API endpoints exist.
- Auth/role checks work.
- Audit logs write for admin actions.
- Mobile can submit reports.
- Admin can view and act on reports.
- Tests pass or skipped with clear reason.
- Render deployment config updated if needed.
