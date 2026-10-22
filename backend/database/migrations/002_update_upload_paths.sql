/* CinemaTaket database migration
   Uploads moved from /CinemaTaket/public/uploads/ to /CinemaTaket/backend/public/uploads/
   (Optional: the frontend already rewrites old paths on the fly.)
*/

USE CinemaTaket;
GO

UPDATE dbo.Movies
SET PosterURL = REPLACE(PosterURL, '/CinemaTaket/public/uploads/', '/CinemaTaket/backend/public/uploads/'),
    BannerURL = REPLACE(BannerURL, '/CinemaTaket/public/uploads/', '/CinemaTaket/backend/public/uploads/');
GO

UPDATE dbo.Concessions
SET ImageURL = REPLACE(ImageURL, '/CinemaTaket/public/uploads/', '/CinemaTaket/backend/public/uploads/');
GO
