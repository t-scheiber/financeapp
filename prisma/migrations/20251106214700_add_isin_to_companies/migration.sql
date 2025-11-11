-- AlterTable
ALTER TABLE `companies` ADD COLUMN `isin` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `companies_isin_key` ON `companies`(`isin`);

