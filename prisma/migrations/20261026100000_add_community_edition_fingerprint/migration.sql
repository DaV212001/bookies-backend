-- AlterTable
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='communities' AND column_name='canonicalFingerprint'
    ) THEN
        ALTER TABLE "communities" ADD COLUMN "canonicalFingerprint" TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='communities' AND column_name='editionTitle'
    ) THEN
        ALTER TABLE "communities" ADD COLUMN "editionTitle" TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='communities' AND column_name='downloadUrl'
    ) THEN
        ALTER TABLE "communities" ADD COLUMN "downloadUrl" TEXT;
    END IF;
END $$;
