# Project Rules - Plus Beta

This document outlines workspace-specific rules and instructions for coding assistants working on the Plus Beta project.

## Navigation and Pages

- **Table Registration Requirement**: Every time a new page or navigation group is added or modified in the frontend (e.g., inside `src/nav.js` or page routes), you must generate a SQL script to register/insert it into the `[PLS].[PagesAndGroups]` database table.

## Database and Tables

- **New Table Creation**: Every time a new database table is created, you must create a new standalone SQL file named after the table (e.g., `TableName.sql`) inside the `SQLScript/` directory containing its DDL scripts.

## Query Master Registry

- **Query Isolation Requirement**: You must register/create a new separate query row in the `[PLS].[QueryMaster]` table if a query (even with the same Stored Procedure or Operation) is going to be used on a different page. Never share a single Query ID/Query Master registration across multiple pages, because permissions and custom row-level filter clauses are stored per User Group and per Query ID.

## Grid Drawers and Click Events

- **Drawer Double-Click Open Rule**: All details drawers (e.g., Candidates Pool detail drawer, Hiring Request detail drawer, PO detail drawer, etc.) that display individual record details must be configured to open only on a **double-click** event on the grid row, rather than a single click. Single clicks on the grid rows are reserved solely for row selection/highlighting.


## SQL File Modification Safety Rule

Before making any modification to a SQL file, including:
* Stored procedures
* Functions
* Views
* Triggers
* Table structures
* SQL scripts

you must stop immediately and inform me about the required modification.

Clearly explain:
1. Which SQL file will be modified.
2. Which database object will be affected.
3. What change is required.
4. Why the change is necessary.
5. The possible impact of the change.

modify the SQL file and do not continue with any related implementation until I explicitly reply with:

**Continue**

After I confirm, I will apply the SQL modification and continue the remaining work.

This approval is required every time a new SQL modification is discovered. Previous approval does not apply to additional SQL changes.

## SQL Data Modification Through API Safety Rule

Do not call, execute, or test any API operation that can insert, update, delete, reset, approve, post, transfer, or otherwise modify data in the SQL database without my explicit approval.

This restriction applies even when the SQL data is changed indirectly through:
* Internal API calls
* Backend endpoints
* Stored procedure operations
* Application actions
* Automated scripts
* Testing tools
* Postman or similar tools
* Background jobs
* Service-to-service calls

Before calling such an API, you must stop and inform me of:
1. The API endpoint or operation name.
2. The parameters or request body that will be sent.
3. The SQL tables or stored procedures that may be affected.
4. The type of change: Insert, Edit, Delete, Reset, Approve, Post, or another action.
5. The expected impact on the data.

Do not execute the API call until I explicitly reply with:

**Continue**

Read-only API calls that only retrieve data and do not modify SQL data may continue without approval.

If you are not completely certain whether an API call changes SQL data, treat it as a data-modification operation, stop, and ask for approval.
