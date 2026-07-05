/*
  Warnings:

  - The values [manager] on the enum `Organization_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `organization` MODIFY `type` ENUM('collector', 'community', 'waste_mgmt', 'csr') NOT NULL;
