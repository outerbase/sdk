// import { CloudflareD1Connection, Outerbase, NeonHttpConnection, OuterbaseConnection, equalsNumber, equals } from '../dist/index.js';
// import express from 'express';
// import { ColumnDataType } from '../dist/query-builder/index.js';

// const app = express();
// const port = 4000;

// app.get('/test/cloudflare', async (req, res) => {
//     // Establish connection to your provider database
//     const d1 = new CloudflareD1Connection({
//         apiKey: '',
//         accountId: '',
//         databaseId: ''
//     });

//     const db = Outerbase(d1);
//     // const dbSchema = await d1.fetchDatabaseSchema()

//     // const { data, query } = await db.selectFrom([
//     //     { table: 'test2', columns: ['*'] }
//     // ]).query()

//     // let { data, query } = await db
//     //     .insert({ fname: 'John' })
//     //     .into('test2')
//     //     .returning(['id'])
//     //     .query();

//     // let { data, query } = await db
//     //     .update({ fname: 'Johnny' })
//     //     .into('test2')
//     //     .where(equals('id', '3', d1.dialect))
//     //     .query();

//     // let { data, query } = await db
//     //     .deleteFrom('test2')
//     //     .where(equals('id', '3'))
//     //     .query();

//     let data = {}
//     let query = await db
//         .createTable('test3')
//         .schema('public')
//         .columns([
//             { name: 'id', type: ColumnDataType.NUMBER, primaryKey: true },
//             { name: 'fname', type: ColumnDataType.STRING }
//         ])
//         .toString();

//     // let data = {}
//     // let query = await db
//     //     .renameTable('test3', 'test4')
//     //     .toString();

//     // let data = {}
//     // let query = await db
//     //     .dropTable('test4')
//     //     .toString();

//     console.log('Running Query: ', query)

//     // db.
//     // - ACTION
//     // - CONDITIONS
//     // - RETURNING
//     // - query() / toString()

//     // let { data } = await db.queryRaw('SELECT * FROM playing_with_neon WHERE id = $1', ['1']);
//     res.json(data);
// });

// app.listen(port, () => {
//     console.log(`Server is running on http://localhost:${port}`);
// });

import { DuckDBConnection, CloudflareD1Connection, Outerbase, equals } from '../dist/index.js';

(async () => {
    const connection = new DuckDBConnection({
        path: 'md:my_db',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImNhbGViQG91dGVyYmFzZS5jb20iLCJzZXNzaW9uIjoiY2FsZWIub3V0ZXJiYXNlLmNvbSIsInBhdCI6IjR3b2dqTEQ0RDFoU3hnV01iRXhFR29Qc1d0QjU0X0UyRmRFNUJuektwYUkiLCJ1c2VySWQiOiI5YjU4Mjc5Mi0zY2IwLTRmNzMtODg2ZC1jMTA5ZGE1YzU1ZmIiLCJpc3MiOiJtZF9wYXQiLCJpYXQiOjE3MjQ3MDM3MTh9.OVv8UU5yA5AHYLz44UiAn3UXQJUV4Chg3sTCC5oVVK8'
    })
    // const response = await connection.query({query: 'SELECT ?::INTEGER AS fortytwo', parameters: [52]})
    const db = Outerbase(connection);
    // const { data, query, error } = await db.selectFrom([
    //     { table: 'sample_data.nyc.rideshare', columns: ['bcf'] }
    // ]).limit(5).query()

    // const schema = await connection.fetchDatabaseSchema()
    // console.log('Schema: ', JSON.stringify(schema))

    const { data, query, error } = await db
        .selectFrom([
            { table: 'sample_data.hn.hacker_news', columns: ['text', 'by', 'type'] }
        ])
        .limit(5)
        .query()

    // const { data, query, error } = await db
    //     .insert({ text: 'My own post into HN', by: 'Brayden', type: 'comment' })
    //     .into('sample_data.hn.hacker_news')
    //     .returning(['text'])
    //     .query();

    // const d1 = new CloudflareD1Connection({
    //     apiKey: '3_e_AAps3LFAtuaeIVeyc-P70I33jNEsuZnTwxK6',
    //     accountId: '68599e3cad89422e9c74bd9b829754bd',
    //     databaseId: '1f4583f6-9853-4a05-be16-f1ff71be14b8'
    // });
    // const db = Outerbase(d1);
    // const { data, query, error } = await db.queryRaw({
    //     query: 'SELECT ?::INTEGER AS fortytwo',
    //     parameters: [52]
    // })

    // const { data:a, query:b, error:c } = await db.selectFrom([
    //     { table: 'users', columns: ['name'] }
    // ]).limit(5).query()

    // console.log({a, b, c})

    // let { data, query, error } = await db
    //     .insert({ id: 1, name: 'Caleb' })
    //     .into('users')
    //     .returning(['bcf'])
    //     .query();

    // let { data, query, error } = await db
    //     .update({ name: 'Brayden' })
    //     .into('users')
    //     .where(equals('id', '1'))
    //     .query();

    // let { data, query, error } = await db
    //     .deleteFrom('users')
    //     .where(equals('id', '1'))
    //     .query();
        // console.table({data, query, error})

    console.log(data, query, error)
})()