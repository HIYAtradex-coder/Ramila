-- Enforce one inventory movement per (source, item) and link reversals.
CREATE UNIQUE INDEX "InventoryMovement_sourceType_sourceId_itemId_key"
ON "InventoryMovement"("sourceType", "sourceId", "itemId");

ALTER TABLE "InventoryMovement"
ADD CONSTRAINT "InventoryMovement_reversalOfId_fkey"
FOREIGN KEY ("reversalOfId") REFERENCES "InventoryMovement"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
