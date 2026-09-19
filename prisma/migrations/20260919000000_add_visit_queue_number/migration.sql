ALTER TABLE "ClinicVisit" ADD COLUMN "queueNumber" INTEGER;

CREATE INDEX "ClinicVisit_queueNumber_idx" ON "ClinicVisit"("queueNumber");
