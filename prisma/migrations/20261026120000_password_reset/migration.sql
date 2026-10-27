-- CreateEnum
CREATE TYPE "VerificationPurpose" AS ENUM ('SIGNUP', 'PASSWORD_RESET');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'PASSWORD_RESET_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE 'PASSWORD_RESET';

-- AlterTable
ALTER TABLE "VerificationCode" ADD COLUMN     "purpose" "VerificationPurpose" NOT NULL DEFAULT 'SIGNUP';
