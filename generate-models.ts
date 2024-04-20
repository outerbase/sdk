#!/usr/bin/env node
import { compile } from 'handlebars';
import { promises as fs } from 'fs';

const path = require('path');
const handlebars = require('handlebars');

handlebars.registerHelper('capitalize', function(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
});

handlebars.registerHelper('camelCase', function(str: string) {
    return str.replace(/[-_](.)/g, (_, c) => c.toUpperCase());
});

async function main() {
    const folderPath = process.argv[2] || './'; // Default to current directory if no argument provided
    const fullPath = path.resolve(folderPath, '');

    // const jsonData = await downloadData();
    // const tsModel = await generateTypeScriptModel(jsonData);
    // const fullPath = path.resolve(folderPath, 'generatedModel.ts');

    // fs.writeFileSync(fullPath, tsModel);
    // console.log(`Model saved to ${fullPath}`);

    try {
        // Define the schema
        const schema = {
            "tables": [
                {
                    "name": "users",
                    "columns": [
                        {"name": "id", "type": "number"},
                        {"name": "name", "type": "string"},
                        {"name": "email", "type": "string"}
                    ]
                },
                {
                    "name": "posts",
                    "columns": [
                        {"name": "id", "type": "number"},
                        {"name": "title", "type": "string"},
                        {"name": "content", "type": "string"},
                        {"name": "userId", "type": "number"}
                    ]
                },
                {
                    "name": "posts_comments",
                    "columns": [
                        {"name": "id", "type": "number"},
                        {"name": "title", "type": "string"},
                        {"name": "content", "type": "string"},
                        {"name": "users_id", "type": "number"}
                    ]
                },
                {
                    "name": "person",
                    "columns": [
                        {"name": "first_name", "type": "string"},
                        {"name": "last_name", "type": "string"},
                        {"name": "position", "type": "string"},
                        {"name": "avatar", "type": "number"}
                    ]
                }
            ]
        };
        
        // Load templates
        const modelTemplateSource = await fs.readFile('./src/generators/model-template.handlebars', 'utf-8');
        const indexTemplateSource = await fs.readFile('./src/generators/index-template.handlebars', 'utf-8');

        // Compile templates
        const modelTemplate = compile(modelTemplateSource);
        const indexTemplate = compile(indexTemplateSource);

        // Generate models
        const models = schema.tables.map((table: any) => {
            return modelTemplate(table);
        }).join('\n');

        // Generate index file
        const index = indexTemplate({ tables: schema.tables });
        const indexPath = path.resolve(folderPath, 'index.ts');

        // Write generated files
        await fs.writeFile(indexPath, index);
        // await fs.writeFile('./src/generators/models/index.ts', index);
        
        await Promise.all(schema.tables.map(async (table: any) => {
            const model = modelTemplate(table);
            const modelPath = path.resolve(folderPath, `${table.name}.ts`);
            await fs.writeFile(modelPath, model);
            // await fs.writeFile(`./src/generators/models/${table.name}.ts`, model);
        }));

        console.log('Models generated successfully');
    } catch (error) {
        console.error('Error generating models:', error);
    }
}

main();