import { QueryType } from '../query-params'
import { Query, constructRawQuery } from '../query'
import { Connection, OperationResponse } from './index'
import {
    Constraint,
    ConstraintColumn,
    Database,
    Table,
    TableColumn,
    TableIndex,
    TableIndexType,
} from '../models/database'
import { DefaultDialect } from '../query-builder/dialects/default'

export type StarbaseConnectionDetails = {
    url: string
    apiKey: string
}

export class StarbaseConnection implements Connection {
    // The Starbase API key with
    url: string | undefined
    apiKey: string | undefined

    // Default query type to positional for Starbase
    queryType = QueryType.positional

    // Default dialect for Starbase
    dialect = new DefaultDialect()

    /**
     * Creates a new StarbaseConnection object with the provided API key,
     * account ID, and database ID.
     *
     * @param apiKey - The API key to be used for authentication.
     * @param accountId - The account ID to be used for authentication.
     * @param databaseId - The database ID to be used for querying.
     */
    constructor(private _: StarbaseConnectionDetails) {
        this.url = _.url
        this.apiKey = _.apiKey
    }

    /**
     * Performs a connect action on the current Connection object.
     * In this particular use case Starbase is a REST API and
     * requires an API key for authentication.
     *
     * @param details - Unused in the Starbase scenario.
     * @returns Promise<any>
     */
    async connect(): Promise<any> {
        return Promise.resolve()
    }

    /**
     * Performs a disconnect action on the current Connection object.
     * In this particular use case Starbase is a REST API and does
     * not require a disconnect action.
     *
     * @returns Promise<any>
     */
    async disconnect(): Promise<any> {
        return Promise.resolve()
    }

    /**
     * Triggers a query action on the current Connection object. The query
     * is a SQL query that will be executed on a Starbase durable object
     * database. The query is sent to the Starbase API and the response
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
        if (!this.url) throw new Error('Starbase URL is not set')
        if (!this.apiKey) throw new Error('Starbase API key is not set')
        if (!query) throw new Error('A SQL query was not provided')

        const response = await fetch(
            this.url,
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

        const json = await response.json()
        const rawSQL = constructRawQuery(query)

        if (json.result) {
            const items = json.result

            return {
                data: items,
                error: null,
                query: rawSQL,
            }
        }

        return {
            data: [],
            error: Error('Unknown operation error'),
            query: rawSQL,
        }
    }

    public async fetchDatabaseSchema(): Promise<Database> {
        const exclude_tables = ['_cf_kv', 'sqlite_schema', 'sqlite_temp_schema']

        const schemaMap: Record<string, Record<string, Table>> = {}

        const { data } = await this.query({
            query: `PRAGMA table_list`,
        })

        const allTables = (
            data as {
                schema: string
                name: string
                type: string
            }[]
        ).filter(
            (row) =>
                !row.name.startsWith('_lite') &&
                !row.name.startsWith('sqlite_') &&
                !exclude_tables.includes(row.name?.toLowerCase())
        )

        for (const table of allTables) {
            if (exclude_tables.includes(table.name?.toLowerCase())) continue

            const { data: pragmaData } = await this.query({
                query: `PRAGMA table_info('${table.name}')`,
            })

            const tableData = pragmaData as {
                cid: number
                name: string
                type: string
                notnull: 0 | 1
                dflt_value: string | null
                pk: 0 | 1
            }[]

            const { data: fkConstraintResponse } = await this.query({
                query: `PRAGMA foreign_key_list('${table.name}')`,
            })

            const fkConstraintData = (
                fkConstraintResponse as {
                    id: number
                    seq: number
                    table: string
                    from: string
                    to: string
                    on_update: 'NO ACTION' | unknown
                    on_delete: 'NO ACTION' | unknown
                    match: 'NONE' | unknown
                }[]
            ).filter(
                (row) =>
                    !row.table.startsWith('_lite') &&
                    !row.table.startsWith('sqlite_')
            )

            const constraints: Constraint[] = []

            if (fkConstraintData.length > 0) {
                const fkConstraints: Constraint = {
                    name: 'FOREIGN KEY',
                    schema: table.schema,
                    tableName: table.name,
                    type: 'FOREIGN KEY',
                    columns: [],
                }

                fkConstraintData.forEach((fkConstraint) => {
                    const currentConstraint: ConstraintColumn = {
                        columnName: fkConstraint.from,
                    }
                    fkConstraints.columns.push(currentConstraint)
                })
                constraints.push(fkConstraints)
            }

            const indexes: TableIndex[] = []
            const columns = tableData.map((column) => {
                // Primary keys are ALWAYS considered indexes
                if (column.pk === 1) {
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
                    nullable: column.notnull === 0,
                    default: column.dflt_value,
                    primary: column.pk === 1,
                    unique: column.pk === 1,
                    references: [],
                }

                return currentColumn
            })

            const currentTable: Table = {
                name: table.name,
                columns: columns,
                indexes: indexes,
                constraints: constraints,
            }

            if (!schemaMap[table.schema]) {
                schemaMap[table.schema] = {}
            }

            schemaMap[table.schema][table.name] = currentTable
        }

        return schemaMap
    }
}
