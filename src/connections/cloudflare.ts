import { QueryType } from '../query-params'
import { Query, constructRawQuery } from '../query'
import { Connection, OperationResponse } from './index'
import { Database, Schema, Table, TableColumn, TableCondition, TableIndex, TableIndexType } from '../models/database';
import { equalsNumber, Outerbase } from '../client';

export type CloudflareD1ConnectionDetails = {
    apiKey: string,
    accountId: string,
    databaseId: string
};

export class CloudflareD1Connection implements Connection {
    // The Cloudflare API key with D1 access
    apiKey: string | undefined
    accountId: string | undefined
    databaseId: string | undefined

    // Default query type to positional for Cloudflare
    queryType = QueryType.positional

    /**
     * Creates a new CloudflareD1Connection object with the provided API key,
     * account ID, and database ID.
     *
     * @param apiKey - The API key to be used for authentication.
     * @param accountId - The account ID to be used for authentication.
     * @param databaseId - The database ID to be used for querying.
     */
    constructor(private _: CloudflareD1ConnectionDetails) {
        this.apiKey = _.apiKey;
        this.accountId = _.accountId;
        this.databaseId = _.databaseId;
    }

    /**
     * Performs a connect action on the current Connection object.
     * In this particular use case Cloudflare is a REST API and
     * requires an API key for authentication.
     *
     * @param details - Unused in the Cloudflare scenario.
     * @returns Promise<any>
     */
    async connect(): Promise<any> {
        return Promise.resolve();
    }

    /**
     * Performs a disconnect action on the current Connection object.
     * In this particular use case Cloudflare is a REST API and does
     * not require a disconnect action.
     *
     * @returns Promise<any>
     */
    async disconnect(): Promise<any> {
        return Promise.resolve()
    }

    /**
     * Triggers a query action on the current Connection object. The query
     * is a SQL query that will be executed on a D1 database in the Cloudflare
     * account. The query is sent to the Cloudflare API and the response
     * is returned.
     *
     * The parameters object is sent along with the query to be used in the
     * query. By default if the query has parameters the SQL statement will
     * produce a string with `:property` values that the parameters object
     * keys should map to, and will be replaced by.
     *
     * @param query - The SQL query to be executed.
     * @param parameters - An object containing the parameters to be used in the query.
     * @returns Promise<{ data: any, error: Error | null }>
     */
    async query(
        query: Query
    ): Promise<{ data: any; error: Error | null; query: string }> {
        if (!this.apiKey) throw new Error('Cloudflare API key is not set')
        if (!this.accountId) throw new Error('Cloudflare account ID is not set')
        if (!this.databaseId)
            throw new Error('Cloudflare database ID is not set')
        if (!query) throw new Error('A SQL query was not provided')

        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/query`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    sql: query.query,
                    params: query.parameters,
                }),
            }
        )

        let json = await response.json()
        let error = null
        const resultArray = (await json?.result) ?? []
        const items = (await resultArray[0]?.results) ?? []
        const rawSQL = constructRawQuery(query)

        return {
            data: items,
            error: error,
            query: rawSQL,
        }
    }

    public async fetchDatabaseSchema(): Promise<Database> {
        const exclude_tables = ['_cf_kv']

        let database: Database = []
        let schema: Schema = {
            tables: []
        }

        const { data } = await this.query({ query: `SELECT * FROM sqlite_master WHERE type='table' AND name NOT LIKE '_lite%' AND name NOT LIKE 'sqlite_%'` })

        for (const table of data) {
            // Skip excluded tables
            if (exclude_tables.includes(table.name?.toLowerCase())) continue;

            // Add tables to the schema
            if (table.type === 'table') {
                const { data: tableData } = await this.query({ query: `SELECT * FROM PRAGMA_TABLE_INFO('${table.name}')`})

                // TODO: This is not returning any data. Need to investigate why.
                const { data: indexData } = await this.query({ query: `PRAGMA index_list('${table.name}')`})

                console.log('Table: ', tableData)
                console.log('Index: ', indexData)

                let constraints: TableIndex[] = []
                let columns = tableData.map((column: any) => {
                    if (column.pk === 1) {
                        constraints.push({
                            name: column.name,
                            type: TableIndexType.PRIMARY,
                            columns: [column.name]
                        })
                    }

                    const currentColumn: TableColumn = {
                        name: column.name,
                        type: column.type,
                        position: column.cid,
                        nullable: column.notnull === 0,
                        default: column.dflt_value,
                        primary: column.pk === 1,
                        unique: column.pk === 1,
                        // TODO: Need to support foreign key references
                        references: []
                    }

                    return currentColumn
                })

                let current: Table = {
                    name: table.name,
                    columns: columns,
                    indexes: constraints
                }

                schema.tables.push(current)
            }
        }

        // Add schema to database
        database.push(schema)

        return database
    }

    // async read(conditions: TableCondition[], table: string, schema?: string): Promise<OperationResponse> {
    //     const db = Outerbase(this);

    //     let { data, error } = await db.selectFrom([
    //         { schema, table, columns: ['*'] }
    //     ])
    //     // .where([equalsNumber('id', 1)])
    //     .query()
        
    //     return {
    //         success: error === null,
    //         data: data,
    //         error: error
    //     }
    // }
}
