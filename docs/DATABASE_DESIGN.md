# DATABASE DESIGN — SALESFLOW CRM

## Tenant model
Organization is the tenant root. User belongs to Organization via Membership (many-to-many with role). Every record has `organizationId` and is soft-deleted (`deletedAt`).

## Core entities
- Organization(id, name, slug, plan, status, createdAt, updatedAt, deletedAt)
- User(id, email, passwordHash, name, avatarUrl, emailVerified, createdAt, updatedAt, deletedAt)
- Membership(id, userId, organizationId, role, createdAt, updatedAt, deletedAt) — unique(userId, organizationId)
- Role(id, organizationId, name, key, permissions JSON, createdAt, updatedAt)
- Permission(id, key, description)
- RolePermission(roleId, permissionId)
- Invitation(id, organizationId, email, role, token, expiresAt, acceptedAt, createdById)
- Lead(id, organizationId, ownerId, source, status, priority, score, firstName, lastName, email, phone, company, value, followUpAt, convertedToContactId, convertedToDealId, createdAt, updatedAt, deletedAt)
- LeadActivity(id, leadId, userId, type, subject, body, occurredAt, createdAt)
- Contact(id, organizationId, ownerId, firstName, lastName, email, phone, position, companyId, address, notes, createdAt, updatedAt, deletedAt)
- Company(id, organizationId, name, industry, website, employees, revenueRange, address, createdAt, updatedAt, deletedAt)
- Pipeline(id, organizationId, name, isDefault, createdAt, updatedAt, deletedAt)
- PipelineStage(id, pipelineId, name, key, order, probability, isWon, isLost, createdAt, updatedAt, deletedAt)
- Deal(id, organizationId, pipelineId, stageId, ownerId, contactId, companyId, title, value, probability, expectedCloseAt, wonAt, lostAt, wonReason, lostReason, createdAt, updatedAt, deletedAt)
- DealStageHistory(id, dealId, fromStageId, toStageId, changedById, changedAt)
- Ticket(id, organizationId, ticketNumber, customerEmail, customerName, ownerId, priority, status, subject, description, firstResponseAt, resolvedAt, closedAt, slaDueAt, createdAt, updatedAt, deletedAt)
- TicketComment(id, ticketId, authorId, body, isInternal, createdAt, updatedAt, deletedAt)
- TicketAttachment(id, ticketCommentId, fileName, fileUrl, fileSize, mimeType, createdAt)
- Task(id, organizationId, title, type, ownerId, dueAt, reminderAt, status, relatedEntityType, relatedEntityId, createdAt, updatedAt, deletedAt)
- Activity(id, organizationId, actorId, type, subject, entityType, entityId, occurredAt, createdAt)
- Notification(id, organizationId, userId, type, title, body, data JSON, readAt, createdAt)
- Workflow(id, organizationId, name, trigger, condition JSON, actions JSON, isActive, createdAt, updatedAt)
- WorkflowExecution(id, workflowId, triggerEvent, status, input JSON, output JSON, error, createdAt, updatedAt)
- Subscription(id, organizationId, plan, status, currentPeriodEnd, quotaLeads, quotaUsers, createdAt, updatedAt)
- AuditLog(id, organizationId, userId, action, entityType, entityId, oldValues JSON, newValues JSON, ip, userAgent, createdAt)

## Indexes
- organizationId on every tenant-scoped table (compound with common filter columns)
- unique(slug) on Organization
- unique(email) on User
- unique(userId, organizationId) on Membership
- unique(token) on Invitation
- unique(ticketNumber) per organization on Ticket
- foreign keys with cascade/restrict per relationship

## Soft delete
DeletedAt set instead of DELETE. Queries filter `deletedAt: null`.
