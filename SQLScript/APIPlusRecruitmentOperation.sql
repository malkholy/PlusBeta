USE [HR]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =========================================================================
-- Author:      Plus Beta Developer
-- Create date: 2026-07-14
-- Description: Stored procedure handling all recruitment pipeline stages.
-- =========================================================================
CREATE OR ALTER PROCEDURE [PLS].[APIPlusRecruitmentOperation]
    @Operation VARCHAR(100),
    @LineData NVARCHAR(MAX) = '',
    @User           nvarchar(100) = '',
    @FireBaseToken  nvarchar(500) = '',
    @AppVersionWeb  nvarchar(50)  = '',
    @AppVersionAndroid nvarchar(50) = '',
    @AppVersionIos  nvarchar(50)  = '',
    @AppVersionDesktop nvarchar(50) = '',
    @PlatForm       nvarchar(50)  = '',
    @SqlStatement   nvarchar(max) = '',
    @State          int            output,
    @Message        nvarchar(500)  output
AS
BEGIN
    SET NOCOUNT ON;
    SET ANSI_WARNINGS OFF;

    SET @State = 0;
    SET @Message = 'Success';

    -- ---------------------------------------------------------------------
    -- Operation: Get Hiring Requests
    -- ---------------------------------------------------------------------
    IF @Operation = 'Get Hiring Requests'
    BEGIN
        SELECT 
            r.*,
            (SELECT COUNT(*) FROM [PLS].[Candidate] c WHERE c.RequestID = r.RequestID) AS TotalCandidates,
            (SELECT COUNT(*) FROM [PLS].[Candidate] c WHERE c.RequestID = r.RequestID AND c.CandidateState = 6) AS HiredCount,
            (
                SELECT TOP 1 Comments 
                FROM [PLS].[HiringRequestApproval] 
                WHERE RequestID = r.RequestID AND ApprovalState = 3 
                ORDER BY ActionDate DESC
            ) AS ReturnComments
        FROM [PLS].[HiringRequest] r
        ORDER BY r.CreatedDate DESC;
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Save Hiring Request
    -- ---------------------------------------------------------------------
    IF @Operation = 'Save Hiring Request'
    BEGIN
        DECLARE @RequestID INT = NULLIF(JSON_VALUE(@LineData, '$.RequestID'), '');
        DECLARE @PositionTitle NVARCHAR(150) = JSON_VALUE(@LineData, '$.PositionTitle');
        DECLARE @Department NVARCHAR(100) = JSON_VALUE(@LineData, '$.Department');
        DECLARE @Headcount INT = COALESCE(NULLIF(JSON_VALUE(@LineData, '$.Headcount'), ''), 1);
        DECLARE @Reason NVARCHAR(50) = JSON_VALUE(@LineData, '$.Reason');
        DECLARE @JobDescription NVARCHAR(MAX) = JSON_VALUE(@LineData, '$.JobDescription');
        DECLARE @RequiredSkills NVARCHAR(MAX) = JSON_VALUE(@LineData, '$.RequiredSkills');
        DECLARE @SalaryMin DECIMAL(18,2) = NULLIF(JSON_VALUE(@LineData, '$.SalaryMin'), '');
        DECLARE @SalaryMax DECIMAL(18,2) = NULLIF(JSON_VALUE(@LineData, '$.SalaryMax'), '');
        DECLARE @Urgency NVARCHAR(50) = JSON_VALUE(@LineData, '$.Urgency');
        DECLARE @TargetStartDate DATE = NULLIF(JSON_VALUE(@LineData, '$.TargetStartDate'), '');

        IF @PositionTitle IS NULL OR @Department IS NULL OR @Reason IS NULL OR @Urgency IS NULL
        BEGIN
            SET @State = 1;
            SET @Message = 'Required request fields are missing.';
            RETURN;
        END

        IF @RequestID IS NULL
        BEGIN
            INSERT INTO [PLS].[HiringRequest] (
                [PositionTitle], [Department], [Headcount], [Reason], [JobDescription], 
                [RequiredSkills], [SalaryMin], [SalaryMax], [Urgency], [TargetStartDate], 
                [RequestState], [CreatedBy], [CreatedDate]
            )
            VALUES (
                @PositionTitle, @Department, @Headcount, @Reason, @JobDescription, 
                @RequiredSkills, @SalaryMin, @SalaryMax, @Urgency, @TargetStartDate, 
                0, @User, GETDATE()
            );
            SET @Message = 'Hiring request drafted successfully.';
        END
        ELSE
        BEGIN
            UPDATE [PLS].[HiringRequest]
            SET [PositionTitle] = @PositionTitle,
                [Department] = @Department,
                [Headcount] = @Headcount,
                [Reason] = @Reason,
                [JobDescription] = @JobDescription,
                [RequiredSkills] = @RequiredSkills,
                [SalaryMin] = @SalaryMin,
                [SalaryMax] = @SalaryMax,
                [Urgency] = @Urgency,
                [TargetStartDate] = @TargetStartDate,
                [LastMaintBy] = @User,
                [LastMaintDate] = GETDATE()
            WHERE [RequestID] = @RequestID;
            SET @Message = 'Hiring request updated successfully.';
        END
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Submit Hiring Request
    -- ---------------------------------------------------------------------
    IF @Operation = 'Submit Hiring Request'
    BEGIN
        DECLARE @SubmitID INT = JSON_VALUE(@LineData, '$.RequestID');

        IF NOT EXISTS (SELECT 1 FROM [PLS].[HiringRequest] WHERE [RequestID] = @SubmitID)
        BEGIN
            SET @State = 1;
            SET @Message = 'Hiring request not found.';
            RETURN;
        END

        -- Archive previous Approvals cycle
        UPDATE [PLS].[HiringRequestApproval] 
        SET [IsActive] = 0 
        WHERE [RequestID] = @SubmitID;

        -- Initialize new active Approvals Chain (Step 1: Department Head, Step 2: HR Manager)
        INSERT INTO [PLS].[HiringRequestApproval] ([RequestID], [ApproverUser], [StepNumber], [ApprovalState], [IsActive])
        VALUES (@SubmitID, 'DeptHead', 1, 0, 1),
               (@SubmitID, 'HRManager', 2, 0, 1);

        UPDATE [PLS].[HiringRequest]
        SET [RequestState] = 1 -- Pending Approval
        WHERE [RequestID] = @SubmitID;

        SET @Message = 'Hiring request submitted for approvals.';
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Get Pending Approvals
    -- ---------------------------------------------------------------------
    IF @Operation = 'Get Pending Approvals'
    BEGIN
        SELECT 
            ap.*,
            r.PositionTitle,
            r.Department,
            r.Headcount,
            r.Reason,
            r.Urgency,
            r.TargetStartDate
        FROM [PLS].[HiringRequestApproval] ap
        JOIN [PLS].[HiringRequest] r ON ap.RequestID = r.RequestID
        WHERE ap.ApprovalState = 0 -- Pending
          AND ap.ApproverUser = @User
          AND ap.IsActive = 1;
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Approve Reject Request
    -- ---------------------------------------------------------------------
    IF @Operation = 'Approve Reject Request'
    BEGIN
        DECLARE @AppID INT = NULLIF(JSON_VALUE(@LineData, '$.ApprovalID'), '');
        DECLARE @ReqID INT = NULLIF(JSON_VALUE(@LineData, '$.RequestID'), '');
        DECLARE @Decision INT = JSON_VALUE(@LineData, '$.Decision'); -- 1: Approve, 2: Reject, 3: Return
        DECLARE @Comments NVARCHAR(500) = JSON_VALUE(@LineData, '$.Comments');

        IF @AppID IS NULL AND @ReqID IS NOT NULL
        BEGIN
            SELECT TOP 1 @AppID = ApprovalID 
            FROM [PLS].[HiringRequestApproval] 
            WHERE RequestID = @ReqID AND ApprovalState = 0 AND IsActive = 1
            ORDER BY StepNumber ASC;
        END

        IF @AppID IS NULL
        BEGIN
            SET @State = 1;
            SET @Message = 'No active pending approval step found for this request.';
            RETURN;
        END

        UPDATE [PLS].[HiringRequestApproval]
        SET [ApprovalState] = @Decision,
            [Comments] = @Comments,
            [ActionDate] = GETDATE()
        WHERE [ApprovalID] = @AppID;

        SET @ReqID = (SELECT RequestID FROM [PLS].[HiringRequestApproval] WHERE [ApprovalID] = @AppID);

        IF @Decision = 2 -- Rejected
        BEGIN
            UPDATE [PLS].[HiringRequest] SET [RequestState] = 3 WHERE [RequestID] = @ReqID; -- Rejected
        END
        ELSE IF @Decision = 3 -- Returned
        BEGIN
            UPDATE [PLS].[HiringRequest] SET [RequestState] = 4 WHERE [RequestID] = @ReqID; -- Returned for edits
        END
        ELSE IF @Decision = 1 -- Approved
        BEGIN
            -- Check if all steps in the current active cycle are approved
            IF NOT EXISTS (SELECT 1 FROM [PLS].[HiringRequestApproval] WHERE [RequestID] = @ReqID AND [ApprovalState] <> 1 AND [IsActive] = 1)
            BEGIN
                UPDATE [PLS].[HiringRequest] SET [RequestState] = 5 WHERE [RequestID] = @ReqID; -- Open for Sourcing
            END
        END

        SET @Message = 'Approval decision submitted successfully.';
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Get Candidates
    -- ---------------------------------------------------------------------
    IF @Operation = 'Get Candidates'
    BEGIN
        DECLARE @FilterRequestID INT = NULLIF(JSON_VALUE(@LineData, '$.RequestID'), '');

        SELECT 
            c.*,
            r.PositionTitle,
            r.Department
        FROM [PLS].[Candidate] c
        JOIN [PLS].[HiringRequest] r ON c.RequestID = r.RequestID
        WHERE (@FilterRequestID IS NULL OR c.RequestID = @FilterRequestID)
        ORDER BY c.CreatedDate DESC;
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Save Candidate
    -- ---------------------------------------------------------------------
    IF @Operation = 'Save Candidate'
    BEGIN
        DECLARE @CandidateID INT = NULLIF(JSON_VALUE(@LineData, '$.CandidateID'), '');
        DECLARE @CandReqID INT = JSON_VALUE(@LineData, '$.RequestID');
        DECLARE @FullName NVARCHAR(150) = JSON_VALUE(@LineData, '$.FullName');
        DECLARE @Email NVARCHAR(150) = JSON_VALUE(@LineData, '$.Email');
        DECLARE @Phone NVARCHAR(50) = JSON_VALUE(@LineData, '$.Phone');
        DECLARE @CVFileName NVARCHAR(250) = JSON_VALUE(@LineData, '$.CVFileName');
        DECLARE @CVFileContent NVARCHAR(MAX) = JSON_VALUE(@LineData, '$.CVFileContent');
        DECLARE @CandSource NVARCHAR(50) = JSON_VALUE(@LineData, '$.Source');

        IF @CandReqID IS NULL OR @FullName IS NULL OR @Email IS NULL OR @CandSource IS NULL
        BEGIN
            SET @State = 1;
            SET @Message = 'Required candidate fields are missing.';
            RETURN;
        END

        IF @CandidateID IS NULL
        BEGIN
            INSERT INTO [PLS].[Candidate] (
                [RequestID], [FullName], [Email], [Phone], [CVFileName], [CVFileContent], 
                [Source], [CandidateState], [CreatedBy], [CreatedDate]
            )
            VALUES (
                @CandReqID, @FullName, @Email, @Phone, @CVFileName, @CVFileContent, 
                @CandSource, 0, @User, GETDATE()
            );
            SET @Message = 'Candidate registered successfully.';
        END
        ELSE
        BEGIN
            UPDATE [PLS].[Candidate]
            SET [FullName] = @FullName,
                [Email] = @Email,
                [Phone] = @Phone,
                [CVFileName] = COALESCE(@CVFileName, [CVFileName]),
                [CVFileContent] = COALESCE(@CVFileContent, [CVFileContent]),
                [Source] = @CandSource
            WHERE [CandidateID] = @CandidateID;
            SET @Message = 'Candidate details updated.';
        END
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Screen Candidate
    -- ---------------------------------------------------------------------
    IF @Operation = 'Screen Candidate'
    BEGIN
        DECLARE @ScrCandID INT = JSON_VALUE(@LineData, '$.CandidateID');
        DECLARE @ScrState INT = JSON_VALUE(@LineData, '$.CandidateState'); -- 1: Shortlisted, 2: Rejected
        DECLARE @RejReason NVARCHAR(300) = JSON_VALUE(@LineData, '$.RejectionReason');

        UPDATE [PLS].[Candidate]
        SET [CandidateState] = @ScrState,
            [RejectionReason] = @RejReason
        WHERE [CandidateID] = @ScrCandID;

        SET @Message = 'Candidate screening status updated.';
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Get Interviews
    -- ---------------------------------------------------------------------
    IF @Operation = 'Get Interviews'
    BEGIN
        DECLARE @IntFilterCandID INT = NULLIF(JSON_VALUE(@LineData, '$.CandidateID'), '');

        SELECT 
            i.*,
            c.FullName,
            r.PositionTitle
        FROM [PLS].[CandidateInterview] i
        JOIN [PLS].[Candidate] c ON i.CandidateID = c.CandidateID
        JOIN [PLS].[HiringRequest] r ON c.RequestID = r.RequestID
        WHERE (@IntFilterCandID IS NULL OR i.CandidateID = @IntFilterCandID)
        ORDER BY i.ScheduledDate DESC;
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Schedule Interview
    -- ---------------------------------------------------------------------
    IF @Operation = 'Schedule Interview'
    BEGIN
        DECLARE @SchedCandID INT = JSON_VALUE(@LineData, '$.CandidateID');
        DECLARE @RoundNumber INT = JSON_VALUE(@LineData, '$.RoundNumber');
        DECLARE @Interviewer NVARCHAR(100) = JSON_VALUE(@LineData, '$.InterviewerUser');
        DECLARE @SchedDate DATETIME = JSON_VALUE(@LineData, '$.ScheduledDate');

        IF @SchedCandID IS NULL OR @RoundNumber IS NULL OR @Interviewer IS NULL OR @SchedDate IS NULL
        BEGIN
            SET @State = 1;
            SET @Message = 'Required interview fields are missing.';
            RETURN;
        END

        INSERT INTO [PLS].[CandidateInterview] ([CandidateID], [RoundNumber], [InterviewerUser], [ScheduledDate], [InterviewState])
        VALUES (@SchedCandID, @RoundNumber, @Interviewer, @SchedDate, 0);

        UPDATE [PLS].[Candidate] SET [CandidateState] = 3 WHERE [CandidateID] = @SchedCandID; -- Interviewing

        SET @Message = 'Interview scheduled successfully.';
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Submit Feedback
    -- ---------------------------------------------------------------------
    IF @Operation = 'Submit Feedback'
    BEGIN
        DECLARE @IntID INT = JSON_VALUE(@LineData, '$.InterviewID');
        DECLARE @Rating INT = JSON_VALUE(@LineData, '$.Rating');
        DECLARE @FeedbackComments NVARCHAR(MAX) = JSON_VALUE(@LineData, '$.FeedbackComments');
        DECLARE @Rec INT = JSON_VALUE(@LineData, '$.Recommendation'); -- 0: Proceed, 1: Reject, 2: Hold

        IF NOT EXISTS (SELECT 1 FROM [PLS].[CandidateInterview] WHERE [InterviewID] = @IntID)
        BEGIN
            SET @State = 1;
            SET @Message = 'Interview record not found.';
            RETURN;
        END

        UPDATE [PLS].[CandidateInterview]
        SET [Rating] = @Rating,
            [FeedbackComments] = @FeedbackComments,
            [Recommendation] = @Rec,
            [InterviewState] = 1 -- Completed
        WHERE [InterviewID] = @IntID;

        DECLARE @FeedbackCandID INT = (SELECT CandidateID FROM [PLS].[CandidateInterview] WHERE [InterviewID] = @IntID);

        IF @Rec = 1 -- Reject Candidate
        BEGIN
            UPDATE [PLS].[Candidate] SET [CandidateState] = 2, [RejectionReason] = 'Failed interview round' WHERE [CandidateID] = @FeedbackCandID;
        END
        ELSE IF @Rec = 0 -- Passed round
        BEGIN
            UPDATE [PLS].[CandidateInterview] SET [InterviewState] = 2 WHERE [InterviewID] = @IntID; -- Passed
            -- Set candidate state to Selected if it's the final round or user flags Selected
            UPDATE [PLS].[Candidate] SET [CandidateState] = 4 WHERE [CandidateID] = @FeedbackCandID;
        END

        SET @Message = 'Interview feedback submitted.';
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Get Job Offers
    -- ---------------------------------------------------------------------
    IF @Operation = 'Get Job Offers'
    BEGIN
        SELECT 
            jo.*,
            c.FullName,
            c.Email,
            r.PositionTitle,
            r.SalaryMax
        FROM [PLS].[JobOffer] jo
        JOIN [PLS].[Candidate] c ON jo.CandidateID = c.CandidateID
        JOIN [PLS].[HiringRequest] r ON c.RequestID = r.RequestID;
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Save Job Offer
    -- ---------------------------------------------------------------------
    IF @Operation = 'Save Job Offer'
    BEGIN
        DECLARE @OfferID INT = NULLIF(JSON_VALUE(@LineData, '$.OfferID'), '');
        DECLARE @OffCandID INT = JSON_VALUE(@LineData, '$.CandidateID');
        DECLARE @Salary DECIMAL(18,2) = JSON_VALUE(@LineData, '$.ProposedSalary');
        DECLARE @StartDate DATE = JSON_VALUE(@LineData, '$.ProposedStartDate');
        DECLARE @Terms NVARCHAR(MAX) = JSON_VALUE(@LineData, '$.OfferTerms');

        IF @OffCandID IS NULL OR @Salary IS NULL OR @StartDate IS NULL
        BEGIN
            SET @State = 1;
            SET @Message = 'Required offer fields are missing.';
            RETURN;
        END

        -- Set default onboarding checklist JSON
        DECLARE @Checks NVARCHAR(MAX) = '[{"item":"Submit Documents","done":false},{"item":"Create IT Access","done":false},{"item":"Office Seat Assign","done":false}]';

        IF @OfferID IS NULL
        BEGIN
            INSERT INTO [PLS].[JobOffer] ([CandidateID], [ProposedSalary], [ProposedStartDate], [OfferTerms], [OfferState], [OnboardingChecked])
            VALUES (@OffCandID, @Salary, @StartDate, @Terms, 0, @Checks);
            SET @Message = 'Job offer drafted successfully.';
        END
        ELSE
        BEGIN
            UPDATE [PLS].[JobOffer]
            SET [ProposedSalary] = @Salary,
                [ProposedStartDate] = @StartDate,
                [OfferTerms] = @Terms
            WHERE [OfferID] = @OfferID;
            SET @Message = 'Job offer details updated.';
        END
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Update Offer Status
    -- ---------------------------------------------------------------------
    IF @Operation = 'Update Offer Status'
    BEGIN
        DECLARE @UpOfferID INT = JSON_VALUE(@LineData, '$.OfferID');
        DECLARE @NewOfferState INT = JSON_VALUE(@LineData, '$.OfferState'); -- 2: Sent, 3: Accepted, 4: Declined

        UPDATE [PLS].[JobOffer]
        SET [OfferState] = @NewOfferState
        WHERE [OfferID] = @UpOfferID;

        DECLARE @UpCandID INT = (SELECT CandidateID FROM [PLS].[JobOffer] WHERE [OfferID] = @UpOfferID);

        IF @NewOfferState = 3 -- Accepted
        BEGIN
            UPDATE [PLS].[Candidate] SET [CandidateState] = 6 WHERE [CandidateID] = @UpCandID; -- Hired
            
            -- Close Request if headcount met
            DECLARE @ReqToClose INT = (SELECT RequestID FROM [PLS].[Candidate] WHERE [CandidateID] = @UpCandID);
            DECLARE @ReqHeadcount INT = (SELECT Headcount FROM [PLS].[HiringRequest] WHERE [RequestID] = @ReqToClose);
            DECLARE @HiredCount INT = (SELECT COUNT(*) FROM [PLS].[Candidate] WHERE [RequestID] = @ReqToClose AND [CandidateState] = 6);

            IF @HiredCount >= @ReqHeadcount
            BEGIN
                UPDATE [PLS].[HiringRequest] SET [RequestState] = 6 WHERE [RequestID] = @ReqToClose; -- Fulfilled
            END
        END
        ELSE IF @NewOfferState = 4 -- Declined
        BEGIN
            UPDATE [PLS].[Candidate] SET [CandidateState] = 5 WHERE [CandidateID] = @UpCandID; -- On Hold / Declined
        END

        SET @Message = 'Offer status updated.';
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Update Onboarding Checklist
    -- ---------------------------------------------------------------------
    IF @Operation = 'Update Onboarding Checklist'
    BEGIN
        DECLARE @ChkOfferID INT = JSON_VALUE(@LineData, '$.OfferID');
        DECLARE @ChecklistJson NVARCHAR(MAX) = JSON_VALUE(@LineData, '$.OnboardingChecked');

        UPDATE [PLS].[JobOffer]
        SET [OnboardingChecked] = @ChecklistJson
        WHERE [OfferID] = @ChkOfferID;

        SET @Message = 'Onboarding checklist updated.';
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- ---------------------------------------------------------------------
    -- Operation: Get Request Approval History
    -- ---------------------------------------------------------------------
    IF @Operation = 'Get Request Approval History'
    BEGIN
        DECLARE @HistReqID INT = JSON_VALUE(@LineData, '$.RequestID');
        SELECT 
            ap.*,
            CASE ap.ApprovalState
                WHEN 0 THEN 'Pending'
                WHEN 1 THEN 'Approved'
                WHEN 2 THEN 'Rejected'
                WHEN 3 THEN 'Returned for Edits'
                ELSE 'Unknown'
            END AS StateText
        FROM [PLS].[HiringRequestApproval] ap
        WHERE ap.RequestID = @HistReqID
        ORDER BY ap.StepNumber ASC, ap.ActionDate ASC;
        RETURN;
    END
    -- ---------------------------------------------------------------------
    -- Operation: Get Departments
    -- ---------------------------------------------------------------------
    IF @Operation = 'Get Departments'
    BEGIN
        SELECT DepartmentID, DepartmentName FROM Department;
        RETURN;
    END
END
GO
