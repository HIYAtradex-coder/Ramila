-- Optional opaque attachment id for bank-statement / document ingest (no FK; attachment model owned elsewhere)
ALTER TABLE "OperatingExpense" ADD COLUMN "attachmentId" UUID;
