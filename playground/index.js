import { CloudflareD1Connection, NeonHttpConnection, Outerbase, equalsNumber } from '../dist/index.js';
import express from 'express';

const app = express();
const port = 4000;

app.get('/', async (req, res) => {
    // Establish connection to your provider database
    const d1 = new CloudflareD1Connection('API_KEY', 'ACCOUNT_ID', 'DATABASE_ID');
    const neon = new NeonHttpConnection('postgresql://brayden:XYZ.us-east-2.aws.neon.tech/neondb?sslmode=require');

    // Create an Outerbase instance from the data connection
    await neon.connect();
    const db = Outerbase(neon);
    
    // SELECT:
    let { data } = await db.selectFrom([
        { table: 'playing_with_neon', columns: ['id', 'name', 'value'] }
    ])
    // .where(equalsNumber('id', 1))
    .query()

    res.json(data);
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
