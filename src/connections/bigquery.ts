import { QueryType } from '../query-params'
import { Query, constructRawQuery } from '../query'
import { Connection } from './index'
import { Database, Table, TableColumn } from '../models/database'
import { DefaultDialect } from '../query-builder/dialects/default'

import { BigQuery } from '@google-cloud/bigquery'

type BigQueryParameters = {
    keyFileName: string
    region: string
}

export class BigQueryConnection implements Connection {
    bigQuery: BigQuery
    bigQueryRegion: string

    // Default query type to positional for BigQuery
    queryType = QueryType.positional

    // Default dialect for BigQuery
    dialect = new DefaultDialect()

    /**
     * Creates a new BigQuery object.
     *
     * @param keyFileName - Path to a .json, .pem, or .p12 key file.
     * @param region - Region for your dataset
     */
    constructor(private _: BigQueryParameters) {
        const bigQuery = new BigQuery({
            keyFilename: _.keyFileName,
        })

        this.bigQueryRegion = _.region
        this.bigQuery = bigQuery
    }

    /**
     * Performs a connect action on the current Connection object.
     * In this particular use case, BigQuery has no connect
     * So this is a no-op
     *
     * @param details - Unused in the BigQuery scenario.
     * @returns Promise<any>
     */
    async connect(): Promise<any> {
        return Promise.resolve()
    }

    /**
     * Performs a disconnect action on the current Connection object.
     * In this particular use case, BigQuery has no disconnect
     * So this is a no-op
     *
     * @returns Promise<any>
     */
    async disconnect(): Promise<any> {
        return Promise.resolve()
    }

    /**
     * Triggers a query action on the current Connection object.
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
        const raw = constructRawQuery(query)
        try {
            const options = {
                query: query.query,
                params: query.parameters,
                useLegacySql: false,
            }

            const [rows] = await this.bigQuery.query(options)

            return {
                data: rows,
                error: null,
                query: raw,
            }
        } catch (error) {
            if (error instanceof Error) {
                return {
                    data: null,
                    error: error,
                    query: raw,
                }
            }

            return {
                data: null,
                error: new Error('Unexpected Error'),
                query: raw,
            }
        }
    }

    public async fetchDatabaseSchema(): Promise<Database> {
        let database: Database = []

        // Fetch all datasets
        const [datasets] = await this.bigQuery.getDatasets()
        if (datasets.length === 0) {
            throw new Error('No datasets found in the project.')
        }

        for (const dataset of datasets) {
            const datasetId = dataset.id
            if (datasetId === undefined) continue
            // Fetch all tables in the dataset
            const [tables] = await dataset.getTables()

            const schemaMap: { [key: string]: Table[] } = {}

            for (const table of tables) {
                // Fetch table schema (columns)
                const [metadata] = await table.getMetadata()
                const columns = metadata.schema.fields.map(
                    (field: any, index: number) => {
                        const currentColumn: TableColumn = {
                            name: field.name,
                            type: field.type,
                            position: index,
                            nullable: field.mode === 'NULLABLE',
                            default: null, // BigQuery does not support default values in the schema metadata
                            primary: false, // BigQuery does not have a concept of primary keys
                            unique: false, // BigQuery does not have a concept of unique constraints
                            references: [], // BigQuery does not support foreign keys
                        }
                        return currentColumn
                    }
                )

                const currentTable: Table = {
                    name: table.id ?? '',
                    schema: datasetId, // Assign dataset (schema) name to the table
                    columns: columns,
                    indexes: [], // BigQuery does not support indexes
                }

                if (!schemaMap[datasetId]) {
                    schemaMap[datasetId] = []
                }

                schemaMap[datasetId].push(currentTable)
            }

            database = Object.entries(schemaMap).map(([schemaName, tables]) => {
                return {
                    [schemaName]: tables,
                }
            })
        }

        return database
    }
}
