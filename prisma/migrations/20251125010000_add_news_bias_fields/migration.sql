-- Add bias detection fields to news articles
ALTER TABLE `news` ADD COLUMN `biasLevel` VARCHAR(20) NULL;
ALTER TABLE `news` ADD COLUMN `biasType` VARCHAR(30) NULL;
ALTER TABLE `news` ADD COLUMN `biasWarning` VARCHAR(255) NULL;

