import { CloudflareD1Connection, Outerbase, NeonHttpConnection, OuterbaseConnection, equalsNumber } from '../dist/index.js';
import express from 'express';

const app = express();
const port = 4000;

app.get('/', async (req, res) => {
    // Establish connection to your provider database
    const d1 = new CloudflareD1Connection('API_KEY', 'ACCOUNT_ID', 'DATABASE_ID');
    const neon = new NeonHttpConnection({
        databaseUrl: 'postgresql://USER:PASSWORD@ep-damp-hill-a59vzq0g.us-east-2.aws.neon.tech/neondb?sslmode=require'
    });

    // Create an Outerbase instance from the data connection
    await neon.connect();
    const db = Outerbase(neon);
    
    // SELECT:
    // let { data, query } = await db.selectFrom([
    //     { table: 'playing_with_neon', columns: ['id', 'name', 'value'] }
    // ])
    // .where(equalsNumber('id', 1))
    // .query()

    let { data } = await db.queryRaw('SELECT * FROM playing_with_neon WHERE id = $1', ['1']);
    res.json(data);
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
