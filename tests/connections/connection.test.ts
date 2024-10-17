import createTestClient from './create-test-connection';
const { client: db, defaultSchema: DEFAULT_SCHEMA } = createTestClient();

beforeAll(async () => {
    await db.connect();

    // It is better to cleanup here in case any previous test failed
    await db.dropTable(DEFAULT_SCHEMA, 'people');
});

afterAll(async () => {
    await db.disconnect();
});

function cleanup(data: Record<string, unknown>[]) {
    // Remove some database specified fields
    return data.map((d) => {
        const { _id, ...rest } = d;
        return rest;
    });
}

describe('Database Connection', () => {
    test('Create table', async () => {
        // Create testing table
        await db.createTable(DEFAULT_SCHEMA, 'persons', [
            { name: 'id', definition: { type: 'INTEGER' } },
            {
                name: 'name',
                definition: {
                    type:
                        process.env.CONNECTION_TYPE === 'bigquery'
                            ? 'STRING'
                            : 'VARCHAR(255)',
                },
            },
            { name: 'age', definition: { type: 'INTEGER' } },
        ]);
    });

    test('Insert data', async () => {
        await db.insertMany(DEFAULT_SCHEMA, 'persons', [
            { id: 1, name: 'Visal', age: 25 },
            { id: 2, name: 'Outerbase', age: 30 },
        ]);
    });

    // Check schema must be done AFTER insert data
    // because some NoSQL database does not have schema
    // their schema is based on the data in the collection
    test('Check the schema', async () => {
        if (db.fetchDatabaseSchema) {
            const schemas = await db.fetchDatabaseSchema();

            // Column names are sorted for easier comparison
            const expectedSchema = {
                [DEFAULT_SCHEMA]: {
                    persons: {
                        columns: [
                            // MongoDB comes with _id by default
                            process.env.CONNECTION_TYPE === 'mongodb'
                                ? '_id'
                                : undefined,

                            // Actual columns
                            'age',
                            'id',
                            'name',
                        ].filter(Boolean),
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

    test('Select data', async () => {
        const { data } = await db.select(DEFAULT_SCHEMA, 'persons', {
            orderBy: ['id'],
            limit: 1000,
            offset: 0,
        });

        expect(cleanup(data)).toEqual([
            { id: 1, name: 'Visal', age: 25 },
            { id: 2, name: 'Outerbase', age: 30 },
        ]);
    });

    test('Select from non-existing table should return error', async () => {
        // MongoDB does not show error when selecting from non-existing collection
        if (process.env.CONNECTION_TYPE === 'mongodb') return;

        const { error } = await db.select(
            DEFAULT_SCHEMA,
            'non_existing_table',
            { limit: 1000, offset: 0 }
        );

        expect(error).toBeTruthy();

        // It should contain friendly text error message, instead of just
        // some generic error message
        expect(error?.message).toContain('non_existing_table');
    });

    test('Update data', async () => {
        await db.update(
            DEFAULT_SCHEMA,
            'persons',
            { name: 'Visal In' },
            { id: 1 }
        );

        const { data } = await db.select(DEFAULT_SCHEMA, 'persons', {
            orderBy: ['id'],
            limit: 1000,
            offset: 0,
        });

        expect(cleanup(data)).toEqual([
            { id: 1, name: 'Visal In', age: 25 },
            { id: 2, name: 'Outerbase', age: 30 },
        ]);
    });

    test('Rename table column', async () => {
        const { error } = await db.renameColumn(
            DEFAULT_SCHEMA,
            'persons',
            'name',
            'full_name'
        );

        expect(error).not.toBeTruthy();

        const { data } = await db.select(DEFAULT_SCHEMA, 'persons', {
            orderBy: ['id'],
            limit: 1000,
            offset: 0,
        });

        expect(cleanup(data)).toEqual([
            { id: 1, full_name: 'Visal In', age: 25 },
            { id: 2, full_name: 'Outerbase', age: 30 },
        ]);
    });

    test('Add table column', async () => {
        const { error } = await db.addColumn(
            DEFAULT_SCHEMA,
            'persons',
            'email',
            {
                type:
                    process.env.CONNECTION_TYPE === 'bigquery'
                        ? 'STRING'
                        : 'VARCHAR(255)',
            }
        );

        expect(error).not.toBeTruthy();

        // Need to update email because MongoDB does not have schema
        await db.update(
            DEFAULT_SCHEMA,
            'persons',
            {
                email: 'test@outerbase.com',
            },
            {}
        );

        const { data } = await db.select(DEFAULT_SCHEMA, 'persons', {
            orderBy: ['id'],
            limit: 1000,
            offset: 0,
        });

        expect(cleanup(data)).toEqual([
            {
                id: 1,
                full_name: 'Visal In',
                age: 25,
                email: 'test@outerbase.com',
            },
            {
                id: 2,
                full_name: 'Outerbase',
                age: 30,
                email: 'test@outerbase.com',
            },
        ]);
    });

    test('Rename table name', async () => {
        const { error } = await db.renameTable(
            DEFAULT_SCHEMA,
            'persons',
            'people'
        );

        expect(error).not.toBeTruthy();

        const { data } = await db.select(DEFAULT_SCHEMA, 'people', {
            orderBy: ['id'],
            limit: 1000,
            offset: 0,
        });

        expect(cleanup(data).length).toEqual(2);
    });

    test('Delete a row', async () => {
        await db.delete(DEFAULT_SCHEMA, 'people', { id: 1 });

        const { data } = await db.select(DEFAULT_SCHEMA, 'people', {
            orderBy: ['id'],
            limit: 1000,
            offset: 0,
        });

        expect(cleanup(data)).toEqual([
            { id: 2, full_name: 'Outerbase', age: 30 },
        ]);
    });
});
