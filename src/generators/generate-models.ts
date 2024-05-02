#!/usr/bin/env node
import pkg from 'handlebars';
const { compile } = pkg;
import { promises as fs } from 'fs';

const path = require('path');
const handlebars = require('handlebars');

handlebars.registerHelper('capitalize', function(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
});

handlebars.registerHelper('camelCase', function(str: string) {
    return str.replace(/[-_](.)/g, (_, c) => c.toUpperCase());
});

function parseArgs(args): { API_KEY?: string, PATH?: string } {
    const argsMap = {};
    args.slice(2).forEach(arg => {
        const [key, value] = arg.split('=');
        argsMap[key] = value;
    });

    return argsMap;
}

async function main() {
    const args = parseArgs(process.argv);
    const apiKey = args.API_KEY || '';
    const folderPath = args.PATH || './';

    try {
        await fs.mkdir(folderPath, { recursive: true });

        // Load templates
        const modelTemplateSource = await fs.readFile(path.resolve(__dirname, 'model-template.handlebars'), 'utf-8');
        const indexTemplateSource = await fs.readFile(path.resolve(__dirname, 'index-template.handlebars'), 'utf-8');

        // Compile templates
        const modelTemplate = compile(modelTemplateSource);
        const indexTemplate = compile(indexTemplateSource);

        const response = await fetch(`https://app.outerbase.com/api/v1/ezql/schema`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Source-Token': apiKey
            }
        });

        let json = await response.json();
        let schemaResponse = json.response;
        let tables: Array<any> = []

        for (let key in schemaResponse) {
            let isPublic = key.toLowerCase() === 'public';

            if (Array.isArray(schemaResponse[key])) {
                for (let table of schemaResponse[key]) {
                    if (table.type !== 'table') continue;

                    // Loop through all columns in the table
                    for (let column of table.columns) {
                        console.log('Column:', column);
                        
                        let currentType = column.type?.toLowerCase();

                        // Convert `currentType` from database column types to TypeScript types
                        switch (column.type?.toLowerCase()) {
                            case 'int':
                            case 'integer':
                            case 'smallint':
                            case 'tinyint':
                            case 'mediumint':
                            case 'bigint':
                                currentType = (column.type?.toLowerCase() === 'bigint') ? 'bigint' : 'number';
                                break;
                            case 'decimal':
                            case 'numeric':
                            case 'float':
                            case 'double':
                            case 'real':
                                currentType = 'number';
                                break;
                            case 'varchar':
                            case 'char':
                            case 'character varying':
                            case 'text':
                            case 'tinytext':
                            case 'mediumtext':
                            case 'longtext':
                                currentType = 'string';
                                break;
                            case 'timestamp':
                            case 'datetime':
                            case 'date':
                            case 'time':
                                currentType = 'Date';
                                break;
                            case 'boolean':
                                currentType = 'boolean';
                                break;
                            case 'json':
                            case 'jsonb':
                                currentType = 'Record<string, any>';
                                break;
                            case 'binary':
                            case 'varbinary':
                            case 'blob':
                            case 'tinyblob':
                            case 'mediumblob':
                            case 'longblob':
                                currentType = 'Blob';
                                break;
                            case 'enum':
                            case 'set':
                                currentType = 'string';
                                break;
                            case 'uuid':
                                currentType = 'string';
                                break;
                            case 'bit':
                                currentType = 'number';
                                break;
                            case 'array':
                                currentType = 'any[]';
                                break;
                            case 'geometry':
                            case 'geography':
                                currentType = 'GeoJSON.Geometry';
                                break;
                            default:
                                currentType = 'any';
                                break;
                        }                
                        
                        column.type = currentType;
                    }

                    const currentFolderPath = folderPath + `${isPublic ? '' : '/' + key}`;
                    const model = modelTemplate(table);
                    const modelPath = path.resolve(currentFolderPath, `${table.name}.ts`);
                    await fs.mkdir(currentFolderPath, { recursive: true });
                    await fs.writeFile(modelPath, model);

                    tables.push({
                        name: isPublic ? table.name : `${key}/${table.name}`,
                    });
                }
            }
        }

        // Generate index file
        const index = indexTemplate({ tables: tables });
        const indexPath = path.resolve(folderPath, 'index.ts');

        // Write generated files
        await fs.writeFile(indexPath, index);

        console.log('Models generated successfully');
    } catch (error) {
        console.error('Error generating models:', error);
    }
}

main();