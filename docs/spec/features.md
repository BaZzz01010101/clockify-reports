# Clockify Feature Inventory and Clone Effort Estimate

Date: 2026-05-18

Purpose: capture the publicly visible Clockify feature set as completely as possible for scoping a clone, based on official Clockify materials first, then reviews, community threads, and other secondary sources.

Notes:

- This document inventories product capabilities, not every UI control or pricing rule.
- When official pages disagreed on exact plan gating for a feature, the capability is still listed, and the plan is treated as approximate.
- "Core clone scope" means functionality that belongs to Clockify itself. CAKE.com ecosystem products that are merely linked from Clockify are called out separately.

## Source base

Primary sources used:

- Official features pages: `clockify.me/features` and feature detail pages for rates, scheduling, expenses, invoicing, and team
- Official pricing and plan comparison: `clockify.me/pricing`
- Official Help Center sections: Getting started, Track time & expenses, Projects, Reports, Administration, Integrations & Add-ons
- Official API docs: `docs.clockify.me`
- Official community forum: `forum.clockify.me`

Secondary sources used:

- G2 review summary
- Capterra feature catalog
- TrustRadius reviews
- Forbes Advisor review
- Reddit discussions about real-world usage and missing capabilities

## Product model

Core entities visible across the docs and API:

- Account / identity
- Workspace
- User / member / limited member
- Role and permission set
- Group
- Client
- Project
- Task
- Tag
- Time entry
- Expense and expense category
- Time off policy, holiday policy, balance, request
- Schedule, assignment, milestone
- Invoice, invoice item, payment record
- Shared report
- Webhook / API key / add-on

This matters for the clone because Clockify is not just a timer. It is a multi-tenant work management and accounting-adjacent system built around those entities.

## 1. Account, workspace, and platform features

- Multi-workspace account model
- Workspace-level settings, permissions, billing, and feature toggles
- Passwordless login and standard sign-up / sign-in flows
- Profile settings including week start, day start, and time zone-sensitive behavior
- Multiple user roles: owner, admin, regular user, project manager, team manager, limited member
- Multiple apps and clients:
  - Web app
  - Desktop apps for Windows, macOS, Linux
  - Mobile apps for iOS and Android
  - Browser extensions for Chrome, Firefox, and Edge
- Offline tracking in desktop and mobile apps with later sync
- Multi-language marketing/help surface at least in English, German, Spanish, French, Portuguese
- Custom subdomain for workspaces
- Data region selection
- API keys and webhooks
- Help center, tutorials, changelog, API docs, community forum

## 2. Core time capture

- Start/stop timer
- Manual time entry after the fact
- Continue a previous entry with one click
- Billable vs non-billable toggle
- Attach project, task, tag, and description to entries
- Edit existing time entries
- Duplicate, delete, and split time entries
- Favorite entries for frequently reused timers
- Bulk edit time entries
- Add time for other users
- Browser tab running-state indicator
- Pomodoro timer
- Idle detection
- Reminders for forgotten starts/stops
- Break tracking
- Force timer mode to block manual-only entry flows
- Required fields on time entries
- Time rounding
- Time categorization with tags
- Custom fields on time entries
- User fields associated with profiles and reporting
- Time audit to find incomplete or suspicious entries
- Manual mark-as-invoiced status for already billed time

## 3. Timesheet and calendar workflows

- Weekly timesheet grid for manual entry
- Save and reuse timesheet templates
- Copy last week's activities
- Submit timesheet for approval
- Export timesheet
- Hide the Time Tracker page and push users into timesheet-centric entry
- Calendar view for tracked time
- Add entries directly in calendar by click or drag
- Resize blocks to edit duration visually
- Copy and move blocks
- Zoom calendar from 1 hour down to 30 / 15 / 5 minute granularity
- Detect gaps and overlap situations visually
- Show working days only
- View team member calendars
- Admins/managers can add or edit others' time in calendar on paid plans
- Connect Google Calendar and Outlook
- Work with multiple external calendars
- Start timer from an external calendar event
- Create a time entry from an external calendar event

## 4. Auto tracking and passive capture

- Auto tracker in desktop apps
- Local recording of apps, documents, browser tabs, and URLs
- Threshold-based filtering for short activities
- Activity timeline view
- Idle percentage per recorded activity
- Merge selected activities
- Convert activities into time entries manually
- Delete recorded activities
- Hide already-added activities from auto tracker
- Local-only privacy model for raw auto-tracked data
- Automatic cleanup of old locally stored activity data

## 5. Projects, clients, tasks, tags, and rate hierarchy

- Create and manage clients
- Client metadata such as name, email, address, note, currency
- Create and manage projects
- Public vs private projects
- Project colors
- Project note with markdown support
- Active / completed / archived project states
- Create and manage tasks inside projects
- Task assignees and task-level access restrictions
- Tags for time categorization
- Search, filter, sort, export, and bulk edit projects
- Manage people on projects
- Project managers
- Project templates
- Project status / progress view
- Project budgets and estimates
- Task estimates and task budgets
- Project alerts
- Forecast project budget
- Forecast completion
- Forecast charts
- Workspace rate
- Member rate
- Project rate
- Task rate
- Project-member rate
- Historic rates
- Billable-by-default controls
- Cost rates
- Labor cost and profit analysis
- Multiple currencies
- Assign currency to client
- Billable amount and cost projections in scheduled work
- Import users
- Import time
- Export user/project/client/report data in CSV, Excel, and PDF depending on area

## 6. Reports, dashboards, and analytics

- Team activity / who is active now
- Summary report
- Detailed report
- Weekly report
- Dashboard-style time analytics
- Attendance report
- Assignments report
- Expense report
- Project status reporting
- Breakdowns by project, task, client, user, group, tag, billable state, and more
- Rich filters including custom fields, currency, kiosk, note, missing data, user IDs
- Shared live reports by link
- Public/private shared reports
- Scheduled reports by email
- Relative date ranges for rolling report links
- Lock-date behavior for fixed report links
- Export report data as PDF, CSV, Excel
- Customizable exports
- Time format settings
- Free-plan report history limits

## 7. Team management and workspace administration

- Invite users individually or in bulk
- Import users via CSV
- Deactivate users while retaining historical data
- Limited members without email accounts
- Bulk edit user profiles
- User profiles with billable rate, cost rate, and capacity data
- User custom fields
- Export user info
- Customize user info exports
- Groups for easier project access management
- Assign groups to projects
- Filter reports by group
- Team managers
- Project managers
- Edit team members' time and expenses
- Manage multiple users' time tracking settings
- Users in different time zones
- Hide entries and pages from selected users
- Workspace-level permission control over who can create projects/clients, see rates, edit others' time, etc.
- Multiple workspaces per account

## 8. Approval, locking, attendance, and compliance controls

- Submit timesheets for approval
- Submit expenses for approval
- Weekly, monthly, and semi-monthly approval periods
- Edit pending requests
- Add more time/expenses into pending requests
- Bulk submit for others
- Withdraw approval requests
- Approve or reject time and expenses
- Approval history
- Lock timesheets and expenses to prevent later changes
- Attendance and overtime reporting
- Daily start/end time visibility
- Break visibility in attendance flows
- Time off visibility inside attendance reports
- Targets and reminders for missing or excessive time
- Time audit for broken or suspicious entries
- Audit log
- Control accounts / admin access into a user's account context
- Required fields
- Force timer
- Time rounding

## 9. Time off and holiday management

- Time off policies
- Holiday policies
- Request time off
- Approve time off
- Track balances
- Accruals
- Negative-balance rules
- Half-day support
- Track time off in days or hours
- Automatic time entry creation from approved leave when configured
- Export time off
- Manage non-working days
- See who is away and when
- Schedule integration for leave visibility

## 10. Scheduling, capacity planning, and forecasting

- Project scheduling
- Team scheduling
- Project timeline view
- Team capacity view
- Drag-and-drop schedule editing
- Publish schedules so members can see assignments
- Recurring weekly assignments
- Milestones on schedules
- Assign people to projects/tasks on a timeline
- Hours/day working patterns on assignments
- Notes on assignments
- Capacity visualization
- Over-capacity indication
- Compare scheduled vs tracked time
- Amount and cost visibility for scheduled work
- Search scheduled projects and clients
- Shift timeline for an already-planned project
- Time off visibility in schedule
- Team members can track time based on assignments
- Forecasting from scheduled assignments
- Schedule date-range limitations in UI called out by users and forum posts

## 11. Expenses

- Expense tracking
- Expense categories/types
- Record by sum or by unit
- Notes/details on expense
- Billable vs non-billable expenses
- Attach receipts as image or PDF
- Capture receipt photo from mobile
- Expense reporting
- Expense export
- Expense approval
- Add expenses to invoices
- Include expenses in project budget tracking
- Permissions for who can see and edit expenses
- Lock expenses with locked timesheets period

## 12. Invoicing and billing operations

- Create invoices from tracked time
- Create invoices from expenses
- Add manual invoice items
- Import billable hours and expenses into invoices
- Edit imported items
- Quantity x price totals
- Taxes
- Discounts
- Different tax modes per item
- Invoice PDF download
- Invoice customization:
  - Company name, address, logo
  - Optional notes
  - Invoice labels
  - Subject defaults
  - "Bill from" contacts
  - Per-invoice currency
- Multiple billing contacts / companies
- Email templates for invoice communication
- Invoice statuses: sent, unsent, paid, void
- Overdue invoice visibility/reminders
- Record payments and partial payments
- Recurring invoices
- Invoice report generation
- Export invoices as CSV / Excel
- Filter uninvoiced hours
- Manually mark time as invoiced
- Attach time reports to invoices
- Invoice taxes
- Send invoice emails

## 13. Kiosk, attendance capture, GPS, and screenshots

- Shared-device kiosk for clock in/out
- Personal PIN authentication
- QR-code authentication
- Universal PIN for clocking in for others
- Break tracking from kiosk
- Kiosk activity visibility
- Kiosk reporting
- Multiple kiosks
- Customize kiosk branding and launch behavior
- Access kiosk from mobile devices
- Limited-seat / limited-member operating model
- Attendance report
- GPS location tracking
- Route / visited-location review
- Screenshots while on the clock
- Privacy controls for collected location/screenshot data

## 14. Integrations, API, webhooks, marketplace, and add-ons

- Browser-extension integrations across 90+ web apps
- Featured integrations include QuickBooks, Jira, Google Calendar, Outlook, Zapier, Pumble, and Plaky
- Extension can pick up project/task/tag context from integrated apps
- Extension can auto-create projects/tasks/tags when allowed
- Custom domains for self-hosted integrations
- Per-app integration enable/disable controls
- REST API
- API keys
- Webhooks
- API rate limits and webhook limits by plan
- Shared-report links as lightweight integration surface
- QuickBooks integration for accounting/payroll-oriented flows
- Jira 2-way integration
- Add-on marketplace inside the CAKE.com ecosystem
- Install, enable, disable, configure, and uninstall add-ons
- Add-on-specific webhooks
- Insights add-on dashboard
- Peppol e-invoicing add-on
- Clockify + Xero add-on/integration path

## 15. Security, identity, and enterprise controls

- Single sign-on (SSO)
- Common IdP support called out in official docs/pages: SAML, Office 365, Okta, Google
- SCIM user provisioning
- Audit log with report export
- Data regions: EU, UK, USA, Australia
- Custom subdomain
- Control accounts
- Role-based access management
- Workspace-level permissions
- Compliance posture signaled publicly through ISO / SOC 2 / GDPR marketing badges

## 16. Ecosystem features that are adjacent, but not core Clockify clone scope

These appear in official Clockify pages but belong to the broader CAKE.com suite rather than the core Clockify product:

- Pumble team communication:
  - Direct messages
  - Channels
  - Audio/video calls
  - Mobile calls
  - File sharing
- Plaky project management
- CAKE.com bundle packaging

Recommendation: do not include these in a first-pass Clockify clone unless the goal is a CAKE.com suite clone rather than a Clockify clone.

## 17. User-validated strengths from reviews

Repeatedly praised across G2, Capterra, TrustRadius, Forbes, and Reddit:

- Broad free plan for core time tracking
- Easy setup and low learning curve
- Strong reporting relative to price
- Good fit for freelancers, agencies, startups, and small businesses
- Useful integrations
- Real-time sync across devices
- Good billable/non-billable and project-based tracking model

## 18. User-reported friction and missing capabilities

Important because a clone that only copies the feature checklist can still miss why users switch away.

Repeated friction:

- Mobile app quality issues mentioned in review summaries
- Kiosk usability complaints
- Invoicing/reporting friction in real workflows
- QuickBooks integration complaints
- No direct payroll-first experience compared with workforce/payroll products
- Some desktop-app rough edges
- Free-plan data/reporting limits

Frequently requested but apparently not native/publicly solved in current Clockify:

- Hard tracking limits or contractual caps that actually stop logging
- Auto-start on activity and auto-stop on idle with automatic entry creation
- Negative "adjustment" entries
- Project/task start and end timeframe fields as first-class fields
- Easier project/task/tag selection automation when starting timers
- Better handling of overlapping entry transitions
- More flexible long-range scheduling views

These are useful "differentiator candidates" for a clone, but they are not required for baseline feature parity.

## 19. Recommended parity target for a clone

### Phase 1: credible core clone

Build first:

- Multi-workspace auth and roles
- Time tracker, manual entry, timesheet, calendar
- Projects, tasks, clients, tags
- Billable tracking and rate hierarchy
- Summary/detailed/weekly reports
- Team management, groups, imports/exports
- Basic approvals and locking
- Mobile-responsive web UX

Reason: this gets most of the value users actually use without taking on the highest-complexity edge areas first.

### Phase 2: business-grade clone

Add next:

- Expenses
- Invoicing
- Time off
- Attendance and overtime
- Kiosk
- Scheduling and forecasting
- GPS/screenshots where appropriate
- Webhooks/API

### Phase 3: enterprise-grade clone

Add last:

- SSO
- SCIM
- Audit log
- Data region controls
- Control accounts
- Marketplace/add-on surface
- Native desktop/mobile/offline polish
- Browser extension and deep third-party integrations

## 20. Effort estimate if Codex is used actively

Assumptions:

- One strong full-stack engineer using Codex heavily for scaffolding, CRUD, tests, refactors, migration work, report queries, and documentation
- Modern web stack, greenfield architecture, no legacy migration burden
- Reasonable product design decisions made quickly
- No attempt to literally clone every screen 1:1
- Native mobile apps, desktop apps, and a browser extension are counted separately from the web app

### Effort by capability area

| Area                          | Scope                                                                                             | Estimated effort with active Codex |
| ----------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Foundation                    | auth, tenants/workspaces, roles, billing hooks, settings, base UI, audit-friendly schema          | 4-6 engineer-weeks                 |
| Core time tracking            | timer, manual entry, billable flag, tags, favorites, split, Pomodoro, idle detection, force timer | 5-7 engineer-weeks                 |
| Timesheet + calendar          | weekly grid, templates, calendar editing, Google/Outlook calendar sync                            | 4-6 engineer-weeks                 |
| Projects + rates              | clients, projects, tasks, groups, templates, estimates, rate hierarchy, bulk edit                 | 5-7 engineer-weeks                 |
| Reports                       | summary/detailed/weekly/activity/dashboard/share/export/filtering                                 | 5-8 engineer-weeks                 |
| Team/admin                    | invites, imports, groups, profile fields, hide pages, edit others' time, exports                  | 4-6 engineer-weeks                 |
| Approval/compliance basics    | approvals, lock time, time audit, rounding, reminders, attendance/overtime                        | 5-7 engineer-weeks                 |
| Time off                      | policies, accruals, requests, approval, balances, holidays                                        | 4-6 engineer-weeks                 |
| Expenses + invoicing          | expenses, receipts, approvals, invoices, taxes, recurring, payment state                          | 6-9 engineer-weeks                 |
| Scheduling + forecasting      | assignments, capacity, milestones, publish, scheduled-vs-tracked, forecasts                       | 6-9 engineer-weeks                 |
| Kiosk + location monitoring   | kiosk auth, limited members, GPS, screenshots, privacy controls                                   | 6-9 engineer-weeks                 |
| API + webhooks + integrations | public API, webhook system, initial integrations, browser-extension groundwork                    | 8-12 engineer-weeks                |
| Enterprise controls           | SSO, SCIM, audit log, data region abstraction, custom subdomain, control accounts                 | 8-12 engineer-weeks                |
| Native clients                | desktop auto tracker/offline polish, mobile parity, extension polish                              | 10-16 engineer-weeks               |
| Hardening                     | QA automation, observability, permissions edge cases, security review, performance                | 6-10 engineer-weeks                |

### Total ranges

- Web-first MVP clone: 16-24 engineer-weeks
- Strong SMB clone with most paid business features: 36-52 engineer-weeks
- Near-parity web product without full native/extension depth: 50-70 engineer-weeks
- Near-parity across web, desktop, mobile, extension, enterprise controls, and ecosystem surface: 70-100+ engineer-weeks

### Calendar-time translation

If Codex is used actively and well:

- 1 engineer: 9-18 months for a strong business clone, 18-24+ months for near parity
- 2 engineers: 5-9 months for a strong business clone, 10-14 months for near parity
- 3-4 engineers: 4-7 months for a strong business clone, 8-12 months for near parity

### What Codex materially helps with

High leverage:

- CRUD-heavy admin surfaces
- Table/report/filter/export screens
- Validation and permission plumbing
- API/controller/model generation
- Test generation
- Schema migrations
- Refactors and consistency cleanup
- Documentation and internal specs

Lower leverage:

- Product decisions and scope discipline
- Finance/accounting correctness
- Complex permission edge cases
- Native-app behavior differences
- Browser extension integration maintenance
- Performance tuning on large report datasets
- Security/compliance review

Practical expectation: active Codex usage can reduce the build time of a Clockify clone by roughly 20-35%, but it does not remove the architectural and product complexity.

## 21. Build recommendation

If the goal is to ship a realistic Clockify competitor instead of a research demo:

- Clone the web product first
- Skip Pumble/Plaky ecosystem scope
- Defer deep integration count parity
- Treat scheduling, invoicing, kiosk, and enterprise identity as separate milestones
- Spend extra time on reporting correctness, permissions, and import/export quality because those are where users feel the product's reliability

## 22. Public references

Official Clockify:

- https://clockify.me/features
- https://clockify.me/features/rates
- https://clockify.me/features/scheduling
- https://clockify.me/features/expenses
- https://clockify.me/features/invoicing
- https://clockify.me/features/team
- https://clockify.me/pricing
- https://clockify.me/help/track-time-and-expenses
- https://clockify.me/help/projects
- https://clockify.me/help/reports
- https://clockify.me/help/administration
- https://clockify.me/help/integrations-and-add-ons
- https://docs.clockify.me/
- https://forum.clockify.me/

Reviews and discussions:

- https://www.g2.com/products/clockify/reviews
- https://www.capterra.com/p/169607/Clockify/
- https://www.trustradius.com/products/clockify/reviews
- https://www.forbes.com/advisor/business/software/clockify-review/
- https://www.reddit.com/r/webdev/comments/1ow17nm/how_do_you_all_track_billable_hours_im_going/
- https://www.reddit.com/r/clockify/comments/1te4zwd/enshittification_of_the_free_plan/
