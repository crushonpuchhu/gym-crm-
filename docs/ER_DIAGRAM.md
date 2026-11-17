# ER DIAGRAM — GYMFLOW MEMBER CRM (text)

Organization (gym brand) 1 —* TeamMembership —* User (many-to-many via TeamMembership)
Organization 1 —* Location (club)
Organization 1 —* MembershipPlan
Organization 1 —* Prospect
Organization 1 —* Member
Organization 1 —* Membership
Organization 1 —* CheckIn
Organization 1 —* Pipeline
Organization 1 —* Ticket
Organization 1 —* Task
Organization 1 —* Activity
Organization 1 —* Notification
Organization 1 —* Workflow
Organization 1 —* Subscription
Organization 1 —* AuditLog
Organization 1 —* Invitation
Organization 1 —* Role

Location 1 —* Member

User 1 —* Prospect (owner)
User 1 —* Member (owner)
User 1 —* Membership (owner)
User 1 —* ProspectActivity (author)
User 1 —* Ticket (owner)
User 1 —* TicketComment (author)
User 1 —* MembershipStageHistory (changedBy)
User 1 —* Task (owner)
User 1 —* Activity (actor)
User 1 —* Notification (recipient)
User 1 —* AuditLog (actor)
User 1 —* Invitation (createdBy)

MembershipPlan 1 —* Membership
Member 1 —* Membership
Member 1 —* CheckIn
Member 1 —* Ticket
Member 1 —* Prospect (converted member, 1:1)

Prospect 1 —* ProspectActivity
Prospect 1 —0..1 Member (converted)
Prospect 1 —0..1 Membership (converted)

Pipeline 1 —* PipelineStage
Pipeline 1 —* Membership
PipelineStage 1 —* Membership
Stage 1 —* MembershipStageHistory (from/to)
Membership 1 —* MembershipStageHistory

Ticket 1 —* TicketComment
TicketComment 1 —* TicketAttachment

Task *—* polymorphic link (relatedEntityType/relatedEntityId) to Prospect/Member/Membership/Ticket

Workflow 1 —* WorkflowExecution

Soft delete: `deletedAt` nullable on all tenant entities.
