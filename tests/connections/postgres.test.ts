import createTestClient from './create-test-connection';
const { client: db, defaultSchema: DEFAULT_SCHEMA } = createTestClient();

beforeAll(async () => {
    if (process.env.CONNECTION_TYPE !== 'postgres') return;
    await db.connect();
});

afterAll(async () => {
    if (process.env.CONNECTION_TYPE !== 'postgres') return;
    await db.disconnect();
});

describe("Postgres Specified Tests", () => {
    test("Test timestamp data type", async () => {
        if (process.env.CONNECTION_TYPE !== 'postgres') return;

        await db.raw(`CREATE TABLE table_ts(
            id SERIAL PRIMARY KEY,
            ts TIMESTAMP,
            date_column DATE
        )`)

        await db.insert(DEFAULT_SCHEMA, 'table_ts', {
            id: 123,
            ts: '2022-10-10 11:30:30',
            date_column: '2022-10-10 00:00:00'
        });

        await db.insert(DEFAULT_SCHEMA, 'table_ts', {
            id: 124,
            ts: null,
            date_column: null
        });

        const rows = await db.select(DEFAULT_SCHEMA, 'table_ts', {});

        expect(rows.data.find(row => row.id === 123)).toEqual({
            id: 123,
            date_column: '2022-10-10',
            ts:
                '2022-10-10 11:30:30'
        });

        expect(rows.data.find(row => row.id === 124)).toEqual({
            id: 124,
            date_column: null,
            ts: null
        });
    });

    test("Test JSON data type", async () => {
        if (process.env.CONNECTION_TYPE !== 'postgres') return;

        await db.raw(`CREATE TABLE table_json(
            id SERIAL PRIMARY KEY,
            data_json JSON
        )`)

        const jsonData = JSON.stringify({
            name: 'Outerbase',
            age: 1000
        })

        await db.insert(DEFAULT_SCHEMA, 'table_json', {
            id: 123,
            data_json: jsonData
        });

        await db.insert(DEFAULT_SCHEMA, 'table_json', {
            id: 124,
            data_json: null
        });

        const rows = await db.select(DEFAULT_SCHEMA, 'table_json', {});

        expect(rows.data.find(row => row.id === 123)).toEqual({
            id: 123,
            data_json: jsonData
        });

        expect(rows.data.find(row => row.id === 124)).toEqual({
            id: 124,
            data_json: null,
        });
    });
})