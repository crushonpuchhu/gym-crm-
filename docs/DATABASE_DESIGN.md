# DATABASE DESIGN — GYMFLOW MEMBER CRM

## Tenant model
Organization is the tenant root and represents one gym brand. A user belongs to organizations via `TeamMembership` (many-to-many with role). Every record carries `organizationId` and is soft-deleted (`deletedAt`).

## Enums
- `RoleKey`: SUPER_ADMIN, ORG_OWNER, ORG_ADMIN, CLUB_MANAGER, MEMBERSHIP_ADVISOR, SUPPORT_MANAGER, SUPPORT_AGENT, VIEWER
- `ProspectStatus`: NEW, CONTACTED, TOUR_BOOKED, TOURED, TRIAL, NEGOTIATING, JOINED, LOST
- `ProspectSource`: WALK_IN, WEBSITE, REFERRAL, INSTAGRAM, FACEBOOK, GOOGLE, EVENT, PARTNER, OTHER
- `MemberStatus`: TRIAL, ACTIVE, PAUSED, CANCELLED, EXPIRED
- `MembershipStatus`: PENDING, ACTIVE, PAUSED, CANCELLED, EXPIRED
- `BillingCycle`: MONTHLY, QUARTERLY, ANNUAL, ONE_TIME
- `CheckInMethod`: QR, APP, FRONT_DESK
- `TicketCategory`: BILLING, EQUIPMENT, CLASS_BOOKING, ACCESS, CLEANLINESS, STAFF, OTHER
- `SubscriptionPlan`: STARTER, GROWTH, SCALE

## Core entities
- Organization(id, name, slug, plan, status, currency, timezone, createdAt, updatedAt, deletedAt)
- User(id, email, passwordHash, name, avatarUrl, emailVerified, createdAt, updatedAt, deletedAt)
- TeamMembership(id, userId, organizationId, role, createdAt, updatedAt, deletedAt) — unique(userId, organizationId)
- Role(id, organizationId, name, key, permissions JSON)
- Permission(id, key, description)
- Invitation(id, organizationId, email, role, token, expiresAt, acceptedAt, createdById)
- Location(id, organizationId, name, address, city, region, phone, email, capacity, opensAt, closesAt, isActive, timestamps, deletedAt)
- MembershipPlan(id, organizationId, name, description, price Decimal(10,2), billingCycle, durationDays, color, isActive, timestamps, deletedAt)
- Member(id, organizationId, ownerId, locationId, firstName, lastName, email, phone, dateOfBirth, address, emergencyContact, fitnessGoal, status, joinedAt, notes, timestamps, deletedAt)
- Prospect(id, organizationId, ownerId, locationId, firstName, lastName, email, phone, source, status, priority, score, value Decimal(12,2), fitnessGoal, followUpAt, convertedMemberId, convertedMembershipId, timestamps, deletedAt)
- ProspectActivity(id, prospectId, authorId, type, subject, body, occurredAt, createdAt)
- Pipeline(id, organizationId, name, isDefault, timestamps, deletedAt)
- PipelineStage(id, pipelineId, name, key, order, probability, isWon, isLost, timestamps, deletedAt)
- Membership(id, organizationId, pipelineId, stageId, ownerId, memberId, planId, locationId, title, value Decimal(12,2), monthlyValue Decimal(10,2), billingCycle, status, probability, expectedCloseAt, startDate, endDate, wonAt, lostAt, cancelledAt, wonReason, cancelReason, timestamps, deletedAt)
- MembershipStageHistory(id, membershipId, fromStageId, toStageId, changedById, changedAt)
- CheckIn(id, organizationId, memberId, locationId, method, checkedInAt, durationMinutes, createdAt)
- Ticket(id, organizationId, ticketNumber, reporterName, reporterEmail, memberId, locationId, ownerId, category, priority, status, subject, description, firstResponseAt, resolvedAt, closedAt, slaDueAt, timestamps, deletedAt) — unique(organizationId, ticketNumber)
- TicketComment(id, ticketId, authorId, body, isInternal, timestamps, deletedAt)
- TicketAttachment(id, ticketCommentId, fileName, fileUrl, fileSize, mimeType, createdAt)
- Task(id, organizationId, title, type, ownerId, dueAt, reminderAt, status, relatedEntityType, relatedEntityId, timestamps, deletedAt)
- Activity(id, organizationId, actorId, type, subject, entityType, entityId, occurredAt, createdAt)
- Notification(id, organizationId, userId, type, title, body, data JSON, readAt, createdAt)
- Workflow(id, organizationId, name, trigger, condition JSON, actions JSON, isActive, timestamps)
- WorkflowExecution(id, workflowId, triggerEvent, status, input JSON, output JSON, error, timestamps)
- Subscription(id, organizationId, plan, status, currentPeriodEnd, quotaMembers, quotaStaff, timestamps)
- AuditLog(id, organizationId, userId, action, entityType, entityId, oldValues JSON, newValues JSON, ip, userAgent, createdAt)

## Indexes and constraints
- `organizationId` on every tenant-scoped table, compound with common filter columns.
- unique(slug) on Organization; unique(email) on User; unique(userId, organizationId) on TeamMembership.
- unique(organizationId, ticketNumber) on Ticket.
- CheckIn is indexed by `(organizationId, checkedInAt)` for attendance series.
- Membership indexed by pipelineId, stageId, ownerId, memberId, status.
- Prospect conversions are unique one-to-one: `convertedMemberId`, `convertedMembershipId`.
- Foreign keys with cascade/set-null per relationship.

## Soft delete
`deletedAt` is set instead of DELETE. Queries filter `deletedAt: null`; plans and locations refuse deletion while in use.

## Migration
One migration: `20261117224417_gymflow_init`. The old CRM migrations were removed and the database reset; the project ships with demo data only.
