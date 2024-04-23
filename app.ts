import express from 'express';
import './src/extensions/string';

import outerbase from './src/client';
import { OuterbaseConnection } from './src/connections/outerbase';

const app = express();

const connection: OuterbaseConnection = new OuterbaseConnection('API_KEY');
const db = outerbase(connection);


app.get('/', async (req: any, res: any) => {
    // EXAMPLE: `.queryRaw` method mapping to `Person` class
    // let { data, error } = await db
    //     .asClass(Person)
    //     .queryRaw('SELECT * FROM person');

    // console.log('Raw Data: ', data)
    // res.json(data)

    // EXAMPLE: `.query` method mapping to `Person` class with advanced query
    // let { data, error } = await db
    //     .selectFrom([
    //         { table: 'person', columns: ['first_name', 'last_name', 'position', 'avatar'] },
    //         { table: 'users', columns: ['email'] }
    //     ])
    //     .leftJoin('users', 'person.user'.equals('users.id'))
    //     .where('avatar'.equalsNumber(0))
    //     .where('first_name'.isNot(null))
    //     .where('last_name'.equals('Domino'))
    //     .limit(10)
    //     .offset(0)
    //     .orderBy('first_name'.descending())
    //     .asClass(Person)
    //     .query();

    // console.log('New Data: ', data)
    // let model = data;
    // res.json(model);

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

const PORT: number = process.env.PORT ? parseInt(process.env.PORT) : 4000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
