import { QueryType } from '../query-params'
import { Query, constructRawQuery } from '../query'
import { Connection } from './index'
import {
    Database,
    Table,
    TableColumn,
    TableIndex,
    TableIndexType,
} from '../models/database'
import { DuckDbDialect } from '../query-builder/dialects/duckdb'
import duckDB from 'duckdb'

type DuckDBParameters = {
    path: string
    token: string
}

export class DuckDBConnection implements Connection {
    duckDB: duckDB.Database | undefined
    connection: duckDB.Connection | undefined

    // Default query type to positional for MotherDuck
    queryType = QueryType.positional

    // Default dialect for MotherDuck
    dialect = new DuckDbDialect()

    constructor(private _: DuckDBParameters) {
        this.duckDB = new duckDB.Database(_.path, {
            motherduck_token: _.token,
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

        try {
            if (Array.isArray(query.parameters)) {
                const { res } = await this.runQuery(
                    connection,
                    query.query,
                    ...query.parameters
                )
                result = res
            } else {
                const { res } = await this.runQuery(connection, query.query)
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
        type DuckDBTables = {
            database: string
            schema: string
            name: string
            column_names: string[]
            column_types: string[]
            temporary: boolean
        }

        type DuckDBSettingsRow = {
            name: string
            value: string
            description: string
            input_type: string
            scope: string
        }

        type DuckDBTableInfo = {
            cid: number
            name: string
            type: string
            notnull: boolean
            dflt_value: string | null
            pk: boolean
        }

        type DuckDBConstraintInfo = {
            database_name: string
            database_oid: string
            schema_name: string
            schema_oid: string
            table_name: string
            table_oid: string
            constraint_index: number
            constraint_type:
                | 'CHECK'
                | 'NOT NULL'
                | 'PRIMARY KEY'
                | 'UNIQUE'
                | 'FOREIGN KEY'
            constraint_text: string
            expression: string | null
            // These will exist if you use DuckDB. Just not MotherDuck
            constraint_column_indexes: number[] // Assuming this is an array of column indexes
            constraint_column_names: string[] // Assuming this is an array of column names
        }

        const { data: currentDatabaseResponse, error } = await this.query({
            query: `SELECT * FROM duckdb_settings();`,
        })

        // This seems so fragile.
        const currentDatabase = (currentDatabaseResponse as DuckDBSettingsRow[])
            .find((row) => row.name === 'temp_directory')
            ?.value.split(':')[1]
            .split('.')[0]

        const result = await this.query({
            query: `PRAGMA show_tables_expanded;`,
        })

        const tables = result.data as DuckDBTables[]
        const currentTables = tables.filter(
            (table) => table.database === currentDatabase
        )

        const schemaMap: { [key: string]: Table[] } = {}

        for (const table of currentTables) {
            const tableInfoResult = await this.query({
                query: `PRAGMA table_info('${table.database}.${table.schema}.${table.name}')`,
            })

            const tableInfo = tableInfoResult.data as DuckDBTableInfo[]

            // You can't use information schema because motherduck doesn't support this
            // Not sure if we can get which columns have the constraint on them
            // const constraintResponse = await this.query({
            //     query: `SELECT * FROM duckdb_constraints() WHERE database_name = '${table.database}' AND table_name = '${table.name}' AND schema_name = '${table.schema}';`,
            // })
            // const constraintInfo =
            //     constraintResponse.data as DuckDBConstraintInfo[]

            const indexes: TableIndex[] = []

            const columns = tableInfo.map((column) => {
                if (column.pk) {
                    indexes.push({
                        name: column.name,
                        type: TableIndexType.PRIMARY,
                        columns: [column.name],
                    })
                }

                const currentColumn: TableColumn = {
                    name: column.name,
                    type: column.type,
                    position: column.cid,
                    nullable: !column.notnull, // Flip this because 'notnull' is true when it's NOT nullable
                    default: column.dflt_value,
                    primary: column.pk,
                    unique: column.pk, // Assuming if it's a PK, it's unique as well
                    references: [], // MotherDuck currently doesn't have pragma for foreign keys
                }

                return currentColumn
            })

            // You can't use information schema because motherduck doesn't support this
            // Not sure if we can get which columns have the constraint on them
            // const tableConstraints: Constraint[] = constraintInfo.map(
            //     (constraint) => {
            //         return {
            //             name:
            //                 constraint.constraint_text ||
            //                 `${table.name}_constraint_${constraint.constraint_index}`,
            //             schema: table.schema,
            //             tableName: table.name,
            //             type: constraint.constraint_type,
            //             columns: constraint.constraint_column_names.map(
            //                 (columnName) => {
            //                     return {
            //                         columnName,
            //                         constraintName:
            //                             constraint.constraint_text ||
            //                             `${table.name}_constraint_${constraint.constraint_index}`,
            //                         constraintSchema: table.schema,
            //                         tableName: table.name,
            //                         tableSchema: table.schema,
            //                     }
            //                 }
            //             ),
            //         }
            //     }
            // )

            const currentTable: Table = {
                name: table.name,
                schema: table.schema,
                columns: columns,
                indexes: indexes,
                constraints: [], // Add processed constraints
            }

            if (!schemaMap[table.schema]) {
                schemaMap[table.schema] = []
            }

            schemaMap[table.schema].push(currentTable)
        }

        // Map schemaMap to Database format
        const database = Object.entries(schemaMap).map(
            ([schemaName, tables]) => {
                return {
                    [schemaName]: tables,
                }
            }
        )

        return database
    }

    runQuery = async (
        connection: duckDB.Connection,
        query: string,
        ...params: any[]
    ): Promise<{ stmt: duckDB.Statement; res: any[] }> => {
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
