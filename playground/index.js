import { CloudflareD1Connection, Outerbase, NeonHttpConnection, OuterbaseConnection, equalsNumber, equals } from '../dist/index.js';
import express from 'express';
import { ColumnDataType } from '../dist/query-builder/index.js';

const app = express();
const port = 4000;

// app.get('/', async (req, res) => {
//     // Establish connection to your provider database
//     const d1 = new CloudflareD1Connection('API_KEY', 'ACCOUNT_ID', 'DATABASE_ID');
//     const neon = new NeonHttpConnection({
//         databaseUrl: 'postgresql://USER:PASSWORD@ep-damp-hill-a59vzq0g.us-east-2.aws.neon.tech/neondb?sslmode=require'
//     });

//     // Create an Outerbase instance from the data connection
//     await neon.connect();
//     const db = Outerbase(neon);
    
//     // SELECT:
//     // let { data, query } = await db.selectFrom([
//     //     { table: 'playing_with_neon', columns: ['id', 'name', 'value'] }
//     // ])
//     // .where(equalsNumber('id', 1))
//     // .query()

//     let { data } = await db.queryRaw('SELECT * FROM playing_with_neon WHERE id = $1', ['1']);
//     res.json(data);
// });

app.get('/test/cloudflare', async (req, res) => {
    // Establish connection to your provider database
    const d1 = new CloudflareD1Connection({
        apiKey: '3_e_AAps3LFAtuaeIVeyc-P70I33jNEsuZnTwxK6',
        accountId: '68599e3cad89422e9c74bd9b829754bd',
        databaseId: '1f4583f6-9853-4a05-be16-f1ff71be14b8'
    });

    const db = Outerbase(d1);
    // const dbSchema = await d1.fetchDatabaseSchema()

    // const { data, query } = await db.selectFrom([
    //     { table: 'test2', columns: ['*'] }
    // ]).query()

    // let { data, query } = await db
    //     .insert({ fname: 'John' })
    //     .into('test2')
    //     .returning(['id'])
    //     .query();

    // let { data, query } = await db
    //     .update({ fname: 'Johnny' })
    //     .into('test2')
    //     .where(equals('id', '3', d1.dialect))
    //     .query();

    // let { data, query } = await db
    //     .deleteFrom('test2')
    //     .where(equals('id', '3'))
    //     .query();

    let data = {}
    let query = await db
        .createTable('test3')
        .schema('public')
        .columns([
            { name: 'id', type: ColumnDataType.NUMBER, primaryKey: true },
            { name: 'fname', type: ColumnDataType.STRING }
        ])
        .toString();

    // let data = {}
    // let query = await db
    //     .renameTable('test3', 'test4')
    //     .toString();

    // let data = {}
    // let query = await db
    //     .dropTable('test4')
    //     .toString();

    console.log('Running Query: ', query)

    // db.
    // - ACTION
    // - CONDITIONS
    // - RETURNING
    // - query() / toString()

    // let { data } = await db.queryRaw('SELECT * FROM playing_with_neon WHERE id = $1', ['1']);
    res.json(data);
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
