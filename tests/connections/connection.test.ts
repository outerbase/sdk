import { ColumnDataType } from '../../src/query-builder';
import createTestClient from './create-test-connection';
const { client: db, defaultSchema: DEFAULT_SCHEMA } = createTestClient();

// Some drivers are just too slow such as Cloudflare and BigQuery
jest.setTimeout(10000);

beforeAll(async () => {
    await db.connect();

    // It is better to cleanup here in case any previous test failed
    await db.dropTable(DEFAULT_SCHEMA, 'persons');
    await db.dropTable(DEFAULT_SCHEMA, 'people');
    await db.dropTable(DEFAULT_SCHEMA, 'teams');
});

afterAll(async () => {
    await db.disconnect();
});

afterEach(async () => {
    if (
        ['cloudflare', 'bigquery'].includes(process.env.CONNECTION_TYPE ?? '')
    ) {
        // 3 seconds delay on each operation
        await new Promise((r) => setTimeout(r, 3000));
    }
});

function cleanup(data: Record<string, unknown>[]) {
    // Remove some database specified fields
    return data.map((d) => {
        const { _id, ...rest } = d;
        return rest;
    });
}

describe('Database Connection', () => {
    test('Support named parameters', async () => {
        if (process.env.CONNECTION_TYPE === 'mongodb') return;

        const sql =
            process.env.CONNECTION_TYPE === 'mysql'
                ? 'SELECT CONCAT(:hello, :world) AS testing_word'
                : 'SELECT (:hello || :world) AS testing_word';

        const { data } = await db.raw(sql, {
            hello: 'hello ',
            world: 'world',
        });

        expect(data).toEqual([{ testing_word: 'hello world' }]);
    });

    test('Support positional placeholder', async () => {
        if (process.env.CONNECTION_TYPE === 'mongo') return;

        const sql =
            process.env.CONNECTION_TYPE === 'mysql'
                ? 'SELECT CONCAT(?, ?) AS testing_word'
                : 'SELECT (? || ?) AS testing_word';

        const { data } = await db.raw(sql, ['hello ', 'world']);
        expect(data).toEqual([{ testing_word: 'hello world' }]);
    });

    test('Create table', async () => {
        const { error: createTableTeamError } = await db.createTable(
            DEFAULT_SCHEMA,
            'teams',
            [
                {
                    name: 'id',
                    definition: {
                        type: ColumnDataType.NUMBER,
                        primaryKey: true,
                    },
                },
                {
                    name: 'name',
                    definition: {
                        type: ColumnDataType.STRING,
                    },
                },
            ]
        );

        const { error: createTablePersonError } = await db.createTable(
            DEFAULT_SCHEMA,
            'persons',
            [
                {
                    name: 'id',
                    definition: {
                        type: ColumnDataType.NUMBER,
                        primaryKey: true,
                    },
                },
                {
                    name: 'name',
                    definition: {
                        type: ColumnDataType.STRING,
                    },
                },
                { name: 'age', definition: { type: ColumnDataType.NUMBER } },
                {
                    name: 'team_id',
                    definition: {
                        type: ColumnDataType.NUMBER,
                        references: {
                            column: ['id'],
                            table: 'teams',
                        },
                    },
                },
            ]
        );

        expect(createTableTeamError).not.toBeTruthy();
        expect(createTablePersonError).not.toBeTruthy();
    });

    test('Insert data', async () => {
        const { error: insertError } = await db.insertMany(
            DEFAULT_SCHEMA,
            'teams',
            [{ id: 1, name: 'Avenger' }]
        );

        const { error: insertError2 } = await db.insertMany(
            DEFAULT_SCHEMA,
            'persons',
            [
                { id: 1, name: 'Visal', age: 25, team_id: 1 },
                { id: 2, name: 'Outerbase', age: 30, team_id: 1 },
            ]
        );

        expect(insertError).not.toBeTruthy();
        expect(insertError2).not.toBeTruthy();
    }, 20000);

    // Check schema must be done AFTER insert data
    // because some NoSQL database does not have schema
    // their schema is based on the data in the collection
    test('Check the schema', async () => {
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
                        'team_id',
                    ].filter(Boolean),
                },
                teams: {
                    columns: [
                        process.env.CONNECTION_TYPE === 'mongodb'
                            ? '_id'
                            : undefined,
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

        // Check teams and persons table reference
        if (
            !['bigquery', 'mongodb', 'motherduck'].includes(
                process.env.CONNECTION_TYPE!
            )
        ) {
            expect(
                schemas[DEFAULT_SCHEMA].persons!.columns!.find(
                    (c) => c.name === 'team_id'
                )!.definition.references
            ).toEqual({
                column: ['id'],
                table: 'teams',
            });

            // This is to make sure it works with Outerbase ERD
            const fkConstraint = schemas[
                DEFAULT_SCHEMA
            ].persons.constraints.find((c) => c.type === 'FOREIGN KEY');
            expect(fkConstraint).toBeTruthy();

            expect(fkConstraint!.columns[0].columnName).toBe('team_id');
            expect(fkConstraint!.referenceTableName).toBe('teams');
            expect(fkConstraint!.columns[0].referenceColumnName).toBe('id');
        }

        // Check the primary key
        if (process.env.CONNECTION_TYPE !== 'mongodb') {
            const pkList = Object.values(schemas[DEFAULT_SCHEMA])
                .map((c) => c.constraints)
                .flat()
                .filter((c) => c.type === 'PRIMARY KEY')
                .map((constraint) =>
                    constraint.columns.map(
                        (column) =>
                            `${constraint.tableName}.${column.columnName}`
                    )
                )
                .flat()
                .sort();

            expect(pkList).toEqual(['persons.id', 'teams.id']);
        }
    });

    test('Select data', async () => {
        const { data, count } = await db.select(DEFAULT_SCHEMA, 'persons', {
            orderBy: ['id'],
        });

        expect(cleanup(data)).toEqual([
            { id: 1, name: 'Visal', age: 25, team_id: 1 },
            { id: 2, name: 'Outerbase', age: 30, team_id: 1 },
        ]);

        // For mongodb, there is _id column. It should be string
        if (process.env.CONNECTION_TYPE === 'mongodb') {
            expect(typeof data[0]._id).toBe('string');

            // We should able to select data via _id
            const { data: dataById } = await db.select(
                DEFAULT_SCHEMA,
                'persons',
                {
                    where: [{ name: '_id', operator: '=', value: data[0]._id }],
                }
            );

            expect(dataById).toEqual([data[0]]);
        }

        expect(count).toBeUndefined();
    });

    test('[Mongodb] Execute raw query', async () => {
        if (process.env.CONNECTION_TYPE !== 'mongodb') return;

        const { data } = await db.raw('db.persons.find()');
        expect(cleanup(data)).toEqual([
            { id: 1, name: 'Visal', age: 25, team_id: 1 },
            { id: 2, name: 'Outerbase', age: 30, team_id: 1 },
        ]);
    });

    test('Select data with count', async () => {
        const { count } = await db.select(DEFAULT_SCHEMA, 'persons', {
            includeCounting: true,
        });
        expect(count).toEqual(2);
    }, 10000);

    test('Select from non-existing table should return error', async () => {
        // MongoDB does not show error when selecting from non-existing collection
        if (process.env.CONNECTION_TYPE === 'mongodb') return;

        const { error } = await db.select(
            DEFAULT_SCHEMA,
            'non_existing_table',
            {}
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
            { id: 1, name: 'Visal In', age: 25, team_id: 1 },
            { id: 2, name: 'Outerbase', age: 30, team_id: 1 },
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
            { id: 1, full_name: 'Visal In', age: 25, team_id: 1 },
            { id: 2, full_name: 'Outerbase', age: 30, team_id: 1 },
        ]);
    });

    test('Add and drop table column', async () => {
        // Skip Mongodb because it does not have schema
        if (process.env.CONNECTION_TYPE === 'mongodb') return;

        const { error } = await db.addColumn(
            DEFAULT_SCHEMA,
            'persons',
            'email',
            {
                type: ColumnDataType.STRING,
            }
        );

        expect(error).not.toBeTruthy();

        const { data } = await db.select(DEFAULT_SCHEMA, 'persons', {
            orderBy: ['id'],
        });

        expect(cleanup(data)).toEqual([
            {
                id: 1,
                full_name: 'Visal In',
                age: 25,
                email: null,
                team_id: 1,
            },
            {
                id: 2,
                full_name: 'Outerbase',
                age: 30,
                email: null,
                team_id: 1,
            },
        ]);

        // Remove the column
        await db.dropColumn(DEFAULT_SCHEMA, 'persons', 'email');

        const { data: data2 } = await db.select(DEFAULT_SCHEMA, 'persons', {
            orderBy: ['id'],
        });

        expect(cleanup(data2)).toEqual([
            {
                id: 1,
                full_name: 'Visal In',
                age: 25,
                team_id: 1,
            },
            {
                id: 2,
                full_name: 'Outerbase',
                age: 30,
                team_id: 1,
            },
        ]);
    });

    test('Rename table name', async () => {
        // Skip BigQuery because you cannot rename table with
        // primary key column
        if (process.env.CONNECTION_TYPE === 'bigquery') return;

        const { error } = await db.renameTable(
            DEFAULT_SCHEMA,
            'persons',
            'people'
        );

        expect(error).not.toBeTruthy();

        const { data } = await db.select(DEFAULT_SCHEMA, 'people', {
            orderBy: ['id'],
        });

        expect(cleanup(data).length).toEqual(2);

        // Revert the operation back
        await db.renameTable(DEFAULT_SCHEMA, 'people', 'persons');
    });

    test('Delete a row', async () => {
        await db.delete(DEFAULT_SCHEMA, 'persons', { id: 1 });

        const { data } = await db.select(DEFAULT_SCHEMA, 'persons', {
            orderBy: ['id'],
        });

        expect(cleanup(data)).toEqual([
            {
                id: 2,
                full_name: 'Outerbase',
                age: 30,
                team_id: 1,
            },
        ]);
    });
});
