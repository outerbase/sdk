import { CloudflareD1Connection, Outerbase, equalsNumber } from '../dist/index.js';
import express from 'express';

const app = express();
const port = 4000;

app.get('/', async (req, res) => {
    const d1 = new CloudflareD1Connection(
        'API_KEY',
        'ACCOUNT_ID',
        'DATABASE_ID'
    );
    const db = Outerbase(d1);
    
    let { data } = await db.selectFrom([
        { table: 'table_name', columns: ['id'] }
    ])
    .where(equalsNumber('id', 1))
    .query()

    res.json(data);
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
