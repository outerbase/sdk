import { Client as PgClient } from 'pg';
import { createConnection as createMySqlConnection } from 'mysql2';
import {
    Connection,
    Outerbase,
    PostgreSQLConnection,
    MySQLConnection,
} from '../../src';

function createClient(): Connection {
    if (process.env.CONNECTION_TYPE === 'postgres') {
        return new PostgreSQLConnection(
            new PgClient({
                host: process.env.POSTGRES_HOST,
                port: Number(process.env.POSTGRES_PORT),
                user: process.env.POSTGRES_USER,
                password: process.env.POSTGRES_PASSWORD,
                database: process.env.POSTGRES_DB,
            })
        );
    } else if (process.env.CONNECTION_TYPE === 'mysql') {
        return new MySQLConnection(
            createMySqlConnection({
                host: process.env.MYSQL_HOST,
                port: Number(process.env.MYSQL_PORT),
                user: process.env.MYSQL_USER,
                password: process.env.MYSQL_PASSWORD,
                database: process.env.MYSQL_DB,
            })
        );
    }

    throw new Error('Invalid connection type');
}

const db = createClient();
const qb = Outerbase(db);

beforeAll(async () => {
    await db.connect();

    // It is better to cleanup here in case any previous test failed
    await qb.dropTable('persons').query();
});

afterAll(async () => {
    await db.disconnect();
});

describe('Database Connection', () => {
    test('Create table', async () => {
        // Create testing table
        await qb
            .createTable('persons')
            .column('id', 'SERIAL', { primaryKey: true })
            .column('name', 'VARCHAR(255)')
            .column('age', 'INT')
            .query();
    });

    test('Insert data', async () => {
        // Insert data
        await qb
            .insert({ id: 1, name: 'Visal', age: 25 })
            .into('persons')
            .query();

        await qb
            .insert({ id: 2, name: 'Outerbase', age: 30 })
            .into('persons')
            .query();
    });

    test('Select data', async () => {
        const { data } = await qb.select().from('persons').query();
        expect(data).toEqual([
            { id: 1, name: 'Visal', age: 25 },
            { id: 2, name: 'Outerbase', age: 30 },
        ]);
    });

    test('Update data', async () => {
        await qb
            .update({ name: 'Visal In' })
            .into('persons')
            .where({ id: 1 })
            .query();

        const { data } = await qb.select().from('persons').query();

        expect(data).toEqual([
            { id: 1, name: 'Visal In', age: 25 },
            { id: 2, name: 'Outerbase', age: 30 },
        ]);
    });
});
