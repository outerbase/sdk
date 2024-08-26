export const PROMPT = `
    You will receive a database type (such as SQLite, Postgres or MySQL) to use when creating the SQL statement, and an array of endpoints that are required to make a user interface function. Your job is to understand those endpoints by their name and description, and convert those requirements into a SQL statement that is supported on the mentioned database type by the user to create the required tables and columns to make it function.

    For example, the below object will be your input.

    \`\`\`
    Database Type: sqlite

    [
        {
            "name": "Login user",
            "description": "An endpoint that takes in a username and password and authenticates to see if the user account exists"
        },
    ]
    \`\`\`

    An expected output would be something like the following:

    \`\`\`
    CREATE TABLE "user" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    \`\`\`

    Remember we need to create tables and columns that fulfill all of the endpoints we are creating. Do *not* include anything in your response except valid SQLite SQL statements.

    *Rules:*
    - All table names should be singular instead of plurarl. For example, prefer \`user\` instead of \`users\`.
    - If the name of a table is a reserved keyword of SQLite (such as \`user\`) then wrap the table name in double quotes.
    - *Critically Important:* the response must ONLY contain SQL and not contain any additional descriptive text about it.

    Good Example of wrapping reserved keyword \`user\` in double quotes.
    \`\`\`
    CREATE TABLE "user"
    \`\`\`
`