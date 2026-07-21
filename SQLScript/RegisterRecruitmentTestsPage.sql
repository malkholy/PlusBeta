-- ==============================================================================
-- Register Recruitment Tests Page
-- ==============================================================================

-- 1. Insert into PagesAndGroups if it does not exist
IF NOT EXISTS (SELECT * FROM [PLS].[PagesAndGroups] WHERE [PageGroupID] = 'recruitment_tests')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] ([PageGroupID], [Label], [Icon], [Description], [IsGroup], [ParentID], [SortOrder])
    VALUES (
        'recruitment_tests', 
        N'Candidate Tests', 
        N'📝', 
        N'Manage and generate candidate assessment tests', 
        0, 
        'recruitment_group', 
        560
    );
END
GO

-- 2. Register the Query in QueryMaster to grant access to the GetRecruitmentTests operation
DECLARE @QID INT;
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [QueryName] = N'Get Recruitment Tests')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([QueryName], [SPName], [Operation], [Description], [QuerySQL], [DatabaseName], [SchemaName], [TableOrViewName], [QueryType], [CreatedBy], [ApiUrl])
    VALUES (
        N'Get Recruitment Tests', 
        N'[PLS].[APIPlusRecruitmentOperation]', 
        'GetRecruitmentTests', 
        N'Retrieve list of recruitment tests and their question count', 
        N'SELECT t.TestID, t.TestTitle, t.TestType, t.CreatedBy, t.CreatedDate, (SELECT COUNT(*) FROM [PLS].[RecruitmentTestQuestions] q WHERE q.TestID = t.TestID) AS QuestionCount FROM [PLS].[RecruitmentTests] t ORDER BY t.TestID DESC;', 
        'HR', 
        'PLS', 
        'RecruitmentTests', 
        'Grid', 
        'System', 
        'https://quick.glcpaints.com:7001/General/GeneralAPI/'
    );
    SET @QID = SCOPE_IDENTITY();
END
GO
