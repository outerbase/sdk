import { QueryType } from '../query-params'
import { Query, constructRawQuery } from '../query'
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
import duckDB from 'duckdb'

// TODO: Move this to be shared and reusable
// const reconstructQuery = (query: string, params: any[]): string => {
//     let i = 0
//     return query.replace(/\?/g, () => {
//         const param = params[i++]
//         if (typeof param === 'string') {
//             return `'${param.replace(/'/g, "''")}'` // Properly escape single quotes in strings
//         }
//         if (param === null) {
//             return 'NULL'
//         }
//         return param
//     })
// }

type DuckDBParameters = {
    path: string
    token: string
}

export class DuckDBConnection implements Connection {
    duckDB: duckDB.Database | undefined
    connection: duckDB.Connection | undefined

    // Default query type to positional for MotherDuck
    queryType = QueryType.positional

    // Default dialect for Cloudflare
    dialect = new DefaultDialect()

    constructor(private _: DuckDBParameters) {
        this.duckDB = new duckDB.Database(_.path, {
            motherduck_token: _.token
        })
        this.connection = this.duckDB.connect()
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
        const connection = this.connection
        if (!connection) throw new Error('No DuckDB connection was found.')

        let result = null
        let error = null

        // The `reconstructQuery` function doesn't seem to handle anything but String and NULL values. What about numbers?
        // let statement = reconstructQuery(query.query, query.parameters as any[])

        try {
            if (Array.isArray(query.parameters)) {
                const { res } = await this.runQuery(
                    connection,
                    query.query,
                    ...query.parameters
                )
                result = res
            } else {
                const { res } = await this.runQuery(
                    connection,
                    query.query
                )
                result = res
            }
        } catch (e) {
            error = e instanceof Error ? e : new Error(String(e))
        }

        const rawSQL = constructRawQuery(query)

        return {
            data: result,
            error: error,
            query: rawSQL,
        }
    }

    public async fetchDatabaseSchema(): Promise<Database> {
        let database: Database = []
    
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
    
        const schemaMap: { [key: string]: Table[] } = {}
    
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
                schema: table.schema,  // Assign schema name to the table
                columns: columns,
                indexes: constraints,
            }
    
            if (!schemaMap[table.schema]) {
                schemaMap[table.schema] = []
            }
    
            schemaMap[table.schema].push(currentTable)
        }
    
        database = Object.entries(schemaMap).map(([schemaName, tables]) => {
            return {
                [schemaName]: tables
            }
        })
    
        return database
    }    

    runQuery = async (
        connection: duckDB.Connection,
        query: string,
        ...params: any[]
    ): Promise<{ stmt: duckDB.Statement; res: any[]; }> => {
        return new Promise((resolve, reject) => {
            connection.prepare(query, (err, stmt) => {
                if (err) {
                    return reject(err)
                }
    
                stmt.all(...params, (err, res) => {
                    if (err) {
                        stmt.finalize()
                        return reject(err)
                    }
    
                    resolve({ stmt, res })
                    stmt.finalize()
                })
            })
        })
    }
}
