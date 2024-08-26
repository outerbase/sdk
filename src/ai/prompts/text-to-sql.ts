const SQL_PROMPT = `
    Return a SQL statement based on the user prompt. Only ever return a single SQL statement. Do not respond with any additional text or information.

    Database Schema: {{DATABASE_SCHEMA}}
`

// Export a function that takes a user prompt and returns a SQL statement.
export function prompt(schema: any): string {
    // If the schema is a JSON object, stringify it
    if (typeof schema === "object") {
        schema = JSON.stringify(schema);
    }
    
    const current = SQL_PROMPT;
    return current.replace("{{DATABASE_SCHEMA}}", schema);
}
