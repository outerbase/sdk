import { CloudflareD1Connection, Outerbase, OuterbaseConnection, equalsNumber } from '../dist/index.js';
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

    // const d1 = new OuterbaseConnection(
    //     'API_TOKEN'
    // );
    // const db = Outerbase(d1);
    
    // SELECT:
    // let { data } = await db.selectFrom([
    //     { table: 'table_name', columns: ['id'] }
    // ])
    // .where(equalsNumber('id', 1))
    // .query()

    // let { data } = await db
    //     .selectFrom([
    //         { table: 'person', columns: ['id'] },
    //     ])
    //     .limit(10)
    //     // .asClass(Person)
    //     .query()

    // let {data} = await db
    //     .insert({ first_name: 'Brayden', last_name: 'Wilmoth',  id: 5 })
    //     .into('person')
    //     .query()

    let data = await db
        .insert({ first_name: 'Brayden', last_name: 'Wilmoth',  id: 5 })
        .into('person')
        .toString()

    res.json(data);
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
