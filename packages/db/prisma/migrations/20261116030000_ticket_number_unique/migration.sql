-- Unique ticket numbers per organization.
CREATE UNIQUE INDEX "Ticket_organizationId_ticketNumber_key" ON "Ticket"("organizationId", "ticketNumber");
