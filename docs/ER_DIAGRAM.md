# ER DIAGRAM — SALESFLOW CRM (text)

Organization 1 —* Membership —* User (many-to-many via Membership)
Organization 1 —* Lead
Organization 1 —* Contact
Organization 1 —* Company
Organization 1 —* Pipeline
Organization 1 —* Deal
Organization 1 —* Ticket
Organization 1 —* Task
Organization 1 —* Activity
Organization 1 —* Notification
Organization 1 —* Workflow
Organization 1 —* Subscription
Organization 1 —* AuditLog
Organization 1 —* Invitation
Organization 1 —* Role

User 1 —* LeadActivity (author)
User 1 —* TicketComment (author)
User 1 —* DealStageHistory (changedBy)
User 1 —* Task (owner)
User 1 —* Activity (actor)
User 1 —* Notification (recipient)
User 1 —* AuditLog (actor)
User 1 —* Invitation (createdBy)

Lead 1 —* LeadActivity
Lead *—1 Contact (converted)
Lead *—1 Deal (converted)
Contact 1 —* Deal
Company 1 —* Deal
Company 1 —* Contact
Pipeline 1 —* PipelineStage
Pipeline 1 —* Deal
PipelineStage 1 —* Deal
Deal 1 —* DealStageHistory
Ticket 1 —* TicketComment
TicketComment 1 —* TicketAttachment
Task *—* polymorphic link (relatedEntityType/relatedEntityId) to Lead/Contact/Company/Deal/Ticket

Workflow 1 —* WorkflowExecution

Soft delete: deletedAt nullable on all tenant entities.
