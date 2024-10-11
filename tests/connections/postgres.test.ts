import { afterAll, beforeAll, describe, test } from '@jest/globals';
import { Client } from 'pg';
import { PostgreSQLConnection } from '../../src/connections/postgresql';
import { Outerbase } from '../../src';

const db = new PostgreSQLConnection(
    new Client({
        host: process.env.POSTGRES_HOST,
        port: Number(process.env.POSTGRES_PORT),
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB,
    })
);

const qb = Outerbase(db);

beforeAll(async () => {
    await db.connect();

    // It is better to cleanup here in case any previous test failed
    await qb.dropTable('persons').query();
});

afterAll(async () => {
    await db.disconnect();
});

describe('PostgreSQL Connection', () => {
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
});
