CREATE DATABASE CinemaTaket;
GO

USE CinemaTaket;
GO


-- =========================================================================
-- Tables Creation
-- =========================================================================

-- 1. Movies Table
CREATE TABLE Movies (
    MovieID INT IDENTITY(1,1) PRIMARY KEY,
    Title NVARCHAR(150) NOT NULL,
    Description NVARCHAR(MAX),
    Genre NVARCHAR(80),
    DurationMinutes INT NOT NULL,
    Rating NVARCHAR(20),
    PosterURL NVARCHAR(500),
    BannerURL NVARCHAR(500),
    ReleaseDate DATE,
    Origin NVARCHAR(30) NULL,
    IsActive BIT NOT NULL DEFAULT 1
);
GO

-- 2. Halls Table
CREATE TABLE Halls (
    HallID INT IDENTITY(1,1) PRIMARY KEY,
    HallName NVARCHAR(80) NOT NULL,
    TotalRows INT NOT NULL,
    SeatsPerRow INT NOT NULL
);
GO

-- 3. Seats Table
CREATE TABLE Seats (
    SeatID INT IDENTITY(1,1) PRIMARY KEY,
    HallID INT NOT NULL REFERENCES Halls(HallID),
    RowLabel CHAR(1) NOT NULL,
    SeatNumber INT NOT NULL,
    SeatType NVARCHAR(20) NOT NULL DEFAULT 'Standard',
    CONSTRAINT UQ_Seat UNIQUE (HallID, RowLabel, SeatNumber)
);
GO

-- 4. Showtimes Table
CREATE TABLE Showtimes (
    ShowtimeID INT IDENTITY(1,1) PRIMARY KEY,
    MovieID INT NOT NULL REFERENCES Movies(MovieID),
    HallID INT NOT NULL REFERENCES Halls(HallID),
    StartTime DATETIME2 NOT NULL,
    TicketPrice DECIMAL(10,2) NOT NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'Scheduled',
    CONSTRAINT UQ_Showtime_Hall_Start UNIQUE (HallID, StartTime)
);
GO

-- 5. Bookings Table
CREATE TABLE Bookings (
    BookingID INT IDENTITY(1,1) PRIMARY KEY,
    BookingCode UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    CustomerName NVARCHAR(120) NOT NULL,
    CustomerEmail NVARCHAR(254) NOT NULL,
    CustomerPhone NVARCHAR(30) NULL,
    ShowtimeID INT NOT NULL REFERENCES Showtimes(ShowtimeID),
    BookingDate DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    TotalAmount DECIMAL(10,2) NOT NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'Confirmed'
);
GO

-- 6. BookingSeats Table
CREATE TABLE BookingSeats (
    BookingSeatID INT IDENTITY(1,1) PRIMARY KEY,
    BookingID INT NOT NULL REFERENCES Bookings(BookingID),
    ShowtimeID INT NOT NULL REFERENCES Showtimes(ShowtimeID),
    SeatID INT NOT NULL REFERENCES Seats(SeatID),
    TicketPrice DECIMAL(10,2) NOT NULL,
    CONSTRAINT UQ_Booked_Seat UNIQUE (ShowtimeID, SeatID)
);
GO

-- 7. Concessions Table
CREATE TABLE Concessions (
    ConcessionID INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Description NVARCHAR(300),
    Price DECIMAL(10,2) NOT NULL,
    ImageURL NVARCHAR(500),
    IsAvailable BIT NOT NULL DEFAULT 1
);
GO

-- 8. BookingConcessions Table
CREATE TABLE BookingConcessions (
    BookingConcessionID INT IDENTITY(1,1) PRIMARY KEY,
    BookingID INT NOT NULL REFERENCES Bookings(BookingID),
    ConcessionID INT NOT NULL REFERENCES Concessions(ConcessionID),
    Quantity INT NOT NULL CHECK (Quantity > 0),
    UnitPrice DECIMAL(10,2) NOT NULL
);
GO

-- 9. AdminUsers Table
CREATE TABLE dbo.AdminUsers (
    AdminID INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(80) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    DisplayName NVARCHAR(120) zNOT NULL,
    Role NVARCHAR(20) NOT NULL DEFAULT 'Admin',
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_AdminUsers_Role CHECK (Role IN ('Admin', 'Manager'))
);
GO

-- 10. Discounts Table
CREATE TABLE dbo.Discounts (
    DiscountID INT IDENTITY(1,1) PRIMARY KEY,
    Code NVARCHAR(40) NOT NULL,
    Description NVARCHAR(300) NULL,
    DiscountType NVARCHAR(10) NOT NULL,
    DiscountValue DECIMAL(10,2) NOT NULL,
    StartDate DATETIME2 NOT NULL,
    EndDate DATETIME2 NOT NULL,
    UsageLimit INT NULL,
    UsedCount INT NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT UQ_Discounts_Code UNIQUE (Code),
    CONSTRAINT CK_Discounts_Type CHECK (DiscountType IN ('Percent', 'Fixed')),
    CONSTRAINT CK_Discounts_Value CHECK (
        (DiscountType = 'Percent' AND DiscountValue > 0 AND DiscountValue <= 100)
        OR
        (DiscountType = 'Fixed' AND DiscountValue > 0)
    ),
    CONSTRAINT CK_Discounts_Dates CHECK (EndDate > StartDate),
    CONSTRAINT CK_Discounts_Usage CHECK (UsageLimit IS NULL OR UsageLimit >= 0)
);
GO

-- =========================================================================
-- Indexes
-- =========================================================================
CREATE INDEX IX_Showtimes_Movie_Start ON Showtimes(MovieID, StartTime);
CREATE INDEX IX_BookingSeats_Showtime ON BookingSeats(ShowtimeID, SeatID);
CREATE INDEX IX_Bookings_Date ON dbo.Bookings(BookingDate);
CREATE INDEX IX_Showtimes_Status_Date ON dbo.Showtimes(Status, StartTime);
GO

-- =========================================================================
-- Seed / Sample Data
-- =========================================================================

-- Sample cinema hall
INSERT INTO Halls (HallName, TotalRows, SeatsPerRow)
VALUES ('Cinema Hall 1', 8, 10);

-- Generate 80 seats: rows A-H, seats 1-10
DECLARE @HallID INT = SCOPE_IDENTITY();
DECLARE @Row INT = 0;
DECLARE @Seat INT;

WHILE @Row < 8
BEGIN
    SET @Seat = 1;
    WHILE @Seat <= 10
    BEGIN
        INSERT INTO Seats (HallID, RowLabel, SeatNumber, SeatType)
        VALUES (
            @HallID,
            CHAR(65 + @Row),
            @Seat,
            CASE WHEN @Row >= 6 THEN 'Premium' ELSE 'Standard' END
        );
        SET @Seat = @Seat + 1;
    END;
    SET @Row = @Row + 1;
END;
GO

-- Sample Movies
INSERT INTO Movies (Title, Description, Genre, DurationMinutes, Rating, ReleaseDate)
VALUES ('Sample Movie', 'A test movie description.', 'Action', 120, 'PG-13', GETDATE());
GO

-- Sample Showtimes (Fixed date addition)
INSERT INTO Showtimes (MovieID, HallID, StartTime, TicketPrice)
SELECT MovieID, 1, DATEADD(HOUR, 18, DATEADD(MINUTE, 30, CAST(CAST(DATEADD(DAY, 1, GETDATE()) AS DATE) AS DATETIME2))), 8.00
FROM Movies;
GO