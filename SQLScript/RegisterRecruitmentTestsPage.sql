-- ==============================================================================
-- Register Recruitment Tests Page
-- ==============================================================================

-- 1. Insert into PagesAndGroups if it does not exist
IF NOT EXISTS (SELECT * FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'recruitment_tests')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentGroupID, SystemID, NodeTitle, NodeDescription)
    VALUES (
        'recruitment_tests',
        'recruitment_group',
        'plus',
        'Candidate Assessments & Tests',
        'Manage and generate IQ, English, and other candidate tests'
    );
END
GO

-- 2. Register the Query in QueryMaster to grant access to the GetRecruitmentTests operation
IF NOT EXISTS (SELECT * FROM [PLS].[QueryMaster] WHERE QueryID = 'Q_RecruitmentTestsGrid')
BEGIN
    INSERT INTO [PLS].[QueryMaster] (QueryID, OperationName, Description, SystemID)
    VALUES (
        'Q_RecruitmentTestsGrid',
        'GetRecruitmentTests',
        'Grid data for recruitment tests',
        'plus'
    );
END
GO
