-- Activate FleetGate tenant
UPDATE "Tenant" 
SET "isActive" = true 
WHERE "code" = 'FLEETGATE';
