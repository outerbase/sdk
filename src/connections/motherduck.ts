import { QueryType } from '../query-params'
import { Query } from '../query'
import { Connection } from './index'
import {
    Database,
    Schema,
    Table,
    TableColumn,
    TableIndex,
    TableIndexType,
} from '../models/database'
import { DefaultDialect } from '../query-builder/dialects/default'
import duckDB, { Callback, DuckDbError } from 'duckdb'

const runQuery = async (
    connection: duckDB.Connection,
    query: string,
    ...params: any[]
) => {
    return new Promise((resolve, reject) => {
        console.log(query, ...params)
        connection.all(query, ...params, (err, res) => {
            if (err) {
                reject(err)
            } else {
                resolve(res)
            }
        })
    })
}

export class DuckDBConnection implements Connection {
    queryType = QueryType.positional

    dialect = new DefaultDialect()
    duckDB: duckDB.Database | undefined

    constructor(
        path: string,
        accessMode?: number | Record<string, string>,
        callback?: Callback<any>
    ) {
        this.duckDB = new duckDB.Database(path, accessMode, callback)
    }

    /**
     * Performs a connect action on the current Connection object.
     *
     * @param details - Unused in the Motherduck scenario.
     * @returns Promise<any>
     */
    async connect(): Promise<any> {
        return this.duckDB?.connect()
    }

    /**
     * Performs a disconnect action on the current Connection object.
     *
     * @returns Promise<any>
     */
    async disconnect(): Promise<any> {
        return this.duckDB?.close()
    }

    /**
     * Triggers a query action on the current Connection object.
     *
     * The parameters object is sent along with the query to be used in the
     * query. By default if the query has parameters the SQL statement will
     * produce a string with `?::[DataType]` values that the parameters object
     * keys should map to, and will be replaced by.
     *
     * @param query - The SQL query to be executed.
     * @param parameters - An object containing the parameters to be used in the query.
     * @returns Promise<{ data: any, error: Error | null }>
     */
    async query(
        query: Query
    ): Promise<{ data: any; error: Error | null; query: string }> {
        const connection = await this.connect()
        try {
            let result
            if (Array.isArray(query.parameters)) {
                result = await runQuery(
                    connection,
                    query.query,
                    ...query.parameters
                )
            } else {
                result = await runQuery(connection, query.query)
            }

            return {
                data: result,
                error: null,
                query: query.query,
            }
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e))
            return {
                data: null,
                error: error,
                query: query.query,
            }
        } finally {
            await this.disconnect()
        }
    }

    public async fetchDatabaseSchema(): Promise<Database> {
        let database: Database = []
        let schema: Schema = {
            tables: [],
        }

        type DuckDBTables = {
            database: string
            schema: string
            name: string
            column_names: string[]
            column_types: string[]
            temporary: boolean
        }

        const result = await this.query({
            query: `PRAGMA show_tables_expanded;`,
        })

        const tables = result.data as DuckDBTables[]

        for (const table of tables) {
            type DuckDBTableInfo = {
                cid: number
                name: string
                type: string
                notnull: boolean
                dflt_value: string | null
                pk: boolean
            }
            const tableInfoResult = await this.query({
                query: `PRAGMA table_info('${table.database}.${table.schema}.${table.name}')`,
            })

            const tableInfo = tableInfoResult.data as DuckDBTableInfo[]

            const constraints: TableIndex[] = []
            const columns = tableInfo.map((column) => {
                if (column.pk) {
                    constraints.push({
                        name: column.name,
                        type: TableIndexType.PRIMARY,
                        columns: [column.name],
                    })
                }

                const currentColumn: TableColumn = {
                    name: column.name,
                    type: column.type,
                    position: column.cid,
                    nullable: column.notnull,
                    default: column.dflt_value,
                    primary: column.pk,
                    unique: column.pk,
                    references: [], // DuckDB currently doesn't have a pragma for foreign keys
                }

                return currentColumn
            })

            const currentTable: Table = {
                name: table.name,
                columns: columns,
                indexes: constraints,
            }

            schema.tables.push(currentTable)
        }

        database.push(schema)

        return database
    }
}
