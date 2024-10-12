import { Client as PgClient } from 'pg';
import { BigQuery } from '@google-cloud/bigquery';
import { createConnection as createMySqlConnection } from 'mysql2';
import {
    Connection,
    Outerbase,
    PostgreSQLConnection,
    MySQLConnection,
    BigQueryConnection,
} from '../../src';

let DEFAULT_SCHEMA = '';

function createClient(): Connection {
    if (process.env.CONNECTION_TYPE === 'postgres') {
        DEFAULT_SCHEMA = process.env.POSTGRES_DEFAULT_SCHEMA || 'public';
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
        DEFAULT_SCHEMA = process.env.MYSQL_DEFAULT_SCHEMA || 'public';
        return new MySQLConnection(
            createMySqlConnection({
                host: process.env.MYSQL_HOST,
                port: Number(process.env.MYSQL_PORT),
                user: process.env.MYSQL_USER,
                password: process.env.MYSQL_PASSWORD,
                database: process.env.MYSQL_DB,
            })
        );
    } else if (process.env.CONNECTION_TYPE === 'bigquery') {
        DEFAULT_SCHEMA = process.env.BIGQUERY_DEFAULT_SCHEMA || 'public';
        return new BigQueryConnection(
            new BigQuery({
                projectId: process.env.BIGQUERY_PROJECT_ID,
                credentials: {
                    client_email: process.env.BIGQUERY_CLIENT_EMAIL,
                    private_key: process.env.BIGQUERY_PRIVATE_KEY,
                },
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
    await qb.dropTable(`${DEFAULT_SCHEMA}.persons`).query();
});

afterAll(async () => {
    await db.disconnect();
});

describe('Database Connection', () => {
    test('Create table', async () => {
        // Create testing table
        await qb
            .createTable(`${DEFAULT_SCHEMA}.persons`)
            .column('id', 'INTEGER')
            .column(
                'name',
                process.env.CONNECTION_TYPE === 'bigquery'
                    ? 'STRING'
                    : 'VARCHAR(255)'
            )
            .column('age', 'INTEGER')
            .query();
    });

    test('Insert data', async () => {
        // Insert data
        await qb
            .insert({ id: 1, name: 'Visal', age: 25 })
            .into(`${DEFAULT_SCHEMA}.persons`)
            .query();

        await qb
            .insert({ id: 2, name: 'Outerbase', age: 30 })
            .into(`${DEFAULT_SCHEMA}.persons`)
            .query();
    });

    test('Select data', async () => {
        const { data } = await qb
            .select()
            .from(`${DEFAULT_SCHEMA}.persons`)
            .orderBy('id')
            .query();

        expect(data).toEqual([
            { id: 1, name: 'Visal', age: 25 },
            { id: 2, name: 'Outerbase', age: 30 },
        ]);
    });

    test('Update data', async () => {
        await qb
            .update({ name: 'Visal In' })
            .into(`${DEFAULT_SCHEMA}.persons`)
            .where({ id: 1 })
            .query();

        const { data } = await qb
            .select()
            .from(`${DEFAULT_SCHEMA}.persons`)
            .orderBy('id')
            .query();

        expect(data).toEqual([
            { id: 1, name: 'Visal In', age: 25 },
            { id: 2, name: 'Outerbase', age: 30 },
        ]);
    });

    // test('Rename table column', async () => {
    //     await qb
    //         .alterTable(`${DEFAULT_SCHEMA}.persons`)
    //         .renameColumn('name', 'full_name')
    //         .query();

    //     const { data } = await qb
    //         .select()
    //         .from(`${DEFAULT_SCHEMA}.persons`)
    //         .orderBy('id')
    //         .query();

    //     expect(data).toEqual([
    //         { id: 1, full_name: 'Visal In', age: 25 },
    //         { id: 2, full_name: 'Outerbase', age: 30 },
    //     ]);
    // });
});
