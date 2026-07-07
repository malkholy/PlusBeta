USE ERPMega
GO

-- Create PLS schema if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'PLS')
BEGIN
    EXEC('CREATE SCHEMA PLS')
END
GO

-- Create [PLS].[UserPagePermissions] Table
IF OBJECT_ID('PLS.UserPagePermissions', 'U') IS NULL
BEGIN
    CREATE TABLE [PLS].[UserPagePermissions] (
        [PermissionID] INT IDENTITY(1,1) PRIMARY KEY,
        [Username] VARCHAR(100) NOT NULL,
        [PageGroupID] VARCHAR(50) NOT NULL,
        [CanView] BIT NOT NULL DEFAULT 1,
        [GrantedBy] NVARCHAR(100) NULL,
        [GrantedDate] DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_UserPagePermissions_PagesAndGroups FOREIGN KEY ([PageGroupID]) REFERENCES [PLS].[PagesAndGroups]([PageGroupID])
    );

    CREATE NONCLUSTERED INDEX IX_UserPagePermissions_User ON [PLS].[UserPagePermissions] (Username);
END
GO
