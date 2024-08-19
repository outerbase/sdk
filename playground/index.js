import { CloudflareD1Connection, Outerbase, NeonHttpConnection, OuterbaseConnection, equalsNumber } from '../dist/index.js';
import express from 'express';

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

    const dbSchema = await d1.fetchDatabaseSchema()
    // console.log("dbSchema", JSON.stringify(dbSchema))

    // const testRead = await d1.read([], 'test2', null)
    // console.log("testRead", JSON.stringify(testRead))

    const { data } = await db.selectFrom([
        { table: 'test2', columns: ['*'] }
    ]).query()

    // let { data } = await db.queryRaw('SELECT * FROM playing_with_neon WHERE id = $1', ['1']);
    res.json(data);
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
