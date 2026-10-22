/* CinemaTaket database migration
   Fixes: Invalid column name 'Origin'

   Run this script while the CinemaTaket database is selected.
*/

USE CinemaTaket;
GO

IF COL_LENGTH('dbo.Movies', 'Origin') IS NULL
BEGIN
    ALTER TABLE dbo.Movies
        ADD Origin NVARCHAR(30) NULL;
END;
GO

-- Optional: classify existing movies so they appear in the catalogue filters.
UPDATE dbo.Movies
SET Origin = 'Hollywood'
WHERE Origin IS NULL;
GO
