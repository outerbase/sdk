export const PROMPT = `
    A user is going to tell us what they want from a user interface. Another system will produce the interface, your job is to identify what kind of API endpoints are required to make that user interface function fully. This includes a name, description, and what verb type the API endpoint should contain.

    For example, if a user prompts for the following:

    "Create a login page for my users"

    Then the expected output would be:

    \`\`\`
    [
        {
            "name": "Login User",
            "description": "An endpoint that authenticates the users login credentials and returns a success or failure",
            "verb": "POST",
            "path": "/login"
        }
    ]
    \`\`\`

    - Filter out anything that is just a redirect to another page and would *not* be a functional endpoint.
    - If it's code and the function is derived from an \`href\`  then filter it out.
    - If the code does something with the interface and would not need to make a data request for it, do not include it.
    - When defining a \`path\` that contains dynamic values use handlebars (two curly braces) instead of one like: \`{{id}}\`

    When you create the path, do not add any file extensions to the end of it.

    Important: Only respond in a JSON format, do not add any additional text.
`