import { Outerbase } from '../../src';
import createTestClient from './create-test-connection';

const { client: db, defaultSchema: DEFAULT_SCHEMA } = createTestClient();
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

    test('Check the schema', async () => {
        if (db.fetchDatabaseSchema) {
            const schemas = await db.fetchDatabaseSchema();

            // Column names are sorted for easier comparison
            const expectedSchema = {
                [DEFAULT_SCHEMA]: {
                    persons: {
                        columns: ['age', 'id', 'name'],
                    },
                },
            };

            // We only care about the columns for this test
            const actualSchema = Object.entries(schemas).reduce(
                (a, [schemaName, schemaTables]) => {
                    a[schemaName] = Object.entries(schemaTables).reduce(
                        (b, [tableName, table]) => {
                            b[tableName] = {
                                columns: table.columns
                                    .map((column) => column.name)
                                    .sort(),
                            };
                            return b;
                        },
                        {} as Record<string, { columns: string[] }>
                    );

                    return a;
                },
                {} as Record<string, Record<string, { columns: string[] }>>
            );

            expect(actualSchema).toEqual(expectedSchema);
        }

        expect(true).toBe(true);
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
