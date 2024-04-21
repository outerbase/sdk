import express from 'express';
import { compile } from 'handlebars';
import './src/extensions/string';

import { promises as fs } from 'fs';
import outerbase from './src/client';
import { OuterbaseConnection } from './src/connections/outerbase';

// import { PostsComments } from './src/generators/models/posts_comments';
import { Person } from './src/generators/models';

const app = express();

const connection: OuterbaseConnection = new OuterbaseConnection('aqmk5c2ne3w2ah8m8kjc33j5tsqubvw9tjf87yg6t8b6m89m7kajpyk4lr7qaec7');
const db = outerbase(connection);

const handlebars = require('handlebars');

handlebars.registerHelper('capitalize', function(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
});

handlebars.registerHelper('camelCase', function(str: string) {
    return str.replace(/[-_](.)/g, (_, c) => c.toUpperCase());
});

app.get('/', async (req: any, res: any) => {
    // EXAMPLE: `.queryRaw` method mapping to `Person` class
    // let { data, error } = await db
    //     .asClass(Person)
    //     .queryRaw('SELECT * FROM person');

    // console.log('Raw Data: ', data)
    // res.json(data)


    // EXAMPLE: `.query` method mapping to `Person` class with advanced query
    let { data, error } = await db
        .selectFrom([
            { table: 'person', columns: ['first_name', 'last_name', 'position', 'avatar'] },
            { table: 'users', columns: ['email'] }
        ])
        .leftJoin('users', 'person.user'.equals('users.id'))
        .where('avatar'.equalsNumber(0))
        .where('first_name'.isNot(null))
        .where('last_name'.equals('Domino'))
        .limit(10)
        .offset(0)
        .orderBy('first_name'.descending())
        .asClass(Person)
        .query();

    console.log('New Data: ', data)
    let model = data;
    res.json(model);

    // !!!!!!!!!!!!!!!!!
    // EXAMPLE: Insert a new row using the query builder
    // !!!!!!!!!!!!!!!!!
    // TODO: INSERT is not seemingly supported by Outerbase API with EZQL token
    // [{"message":"This operation is not supported here. Please submit a SELECT query."}]
    // let { data } = await db
    //     .insert({ first_name: 'BrayBray', last_name: 'Raj', position: 'Developer', avatar: 0 })
    //     .into('person')
    //     .returning(['id'])
    //     .query();

    // console.log('Insert Data: ', data);
    // res.json(data);

    // !!!!!!!!!!!!!!!!!
    // EXAMPLE: Delete a row using the query builder
    // !!!!!!!!!!!!!!!!!
    // TODO: DELETE is not seemingly supported by Outerbase API with EZQL token
    // let { data } = await db
    //     .delete()
    //     .from('person')
    //     .where('id'.equals('9190a2cf-e6ab-4e2c-931a-f8f5e364239f'))
    //     .query();

    // console.log('Delete Data: ', data)
    // let model = data;
    // res.json(model);


    // !!!!!!!!!!!!!!!!!
    // EXAMPLE: Update a row using the query builder
    // !!!!!!!!!!!!!!!!!
    // TODO: UPDATE is not seemingly supported by Outerbase API with EZQL token
    // let { data } = await db
    //     .update({ first_name: 'Brayden' })
    //     .in('person')
    //     .where('last_name'.equals('Raj'))
    //     .query();

    // console.log('Update Data: ', data)
    // let model = data;
    // res.json(model);


    // EXAMPLE: Directly use the Outerbase connection to query with AI
    // connection.aiQuery('Show me all signups this week').then((response) => {
    //     console.log('AI Query Response: ', response);
    // })

    // !!!!!!!!!!!!!!!!!
    // EXAMPLE: Run a saved query from Outerbase
    // !!!!!!!!!!!!!!!!!
    // TODO: Saved queries are not seemingly supported by Outerbase API with EZQL token
    // connection.aiQuery('Show me all signups this week').then((response) => {
    //     console.log('AI Query Response: ', response);
    // })
});

app.get('/generate', async (req: any, res: any) => {
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

        // Write generated files
        await fs.writeFile('./src/generators/models/index.ts', index);
        await Promise.all(schema.tables.map(async (table: any) => {
            const model = modelTemplate(table);
            await fs.writeFile(`./src/generators/models/${table.name}.ts`, model);
        }));

        res.send('Models generated successfully');
    } catch (error) {
        console.error('Error generating models:', error);
        res.status(500).send('Error generating models');
    }
});

const PORT: number = process.env.PORT ? parseInt(process.env.PORT) : 4000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
