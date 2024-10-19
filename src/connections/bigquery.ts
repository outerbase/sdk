import { QueryType } from '../query-params';
import { Query } from '../query';
import { QueryResult } from './index';
import { Database, Table, TableColumn } from '../models/database';
import { BigQueryDialect } from '../query-builder/dialects/bigquery';
import { BigQuery } from '@google-cloud/bigquery';
import {
    createErrorResult,
    transformObjectBasedResultFirstRow,
} from './../utils/transformer';
import { SqlConnection } from './sql-base';

export class BigQueryConnection extends SqlConnection {
    bigQuery: BigQuery;

    // Default query type to positional for BigQuery
    queryType = QueryType.positional;

    // Default dialect for BigQuery
    dialect = new BigQueryDialect();

    /**
     * Creates a new BigQuery object.
     *
     * @param keyFileName - Path to a .json, .pem, or .p12 key file.
     * @param region - Region for your dataset
     */
    constructor(bigQuery: BigQuery) {
        super();
        this.bigQuery = bigQuery;
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
        return Promise.resolve();
    }

    /**
     * Performs a disconnect action on the current Connection object.
     * In this particular use case, BigQuery has no disconnect
     * So this is a no-op
     *
     * @returns Promise<any>
     */
    async disconnect(): Promise<any> {
        return Promise.resolve();
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
    async query<T = Record<string, unknown>>(
        query: Query
    ): Promise<QueryResult<T>> {
        try {
            const options = {
                query: query.query,
                params: query.parameters,
                useLegacySql: false,
            };

            const [rows] = await this.bigQuery.query(options);
            return transformObjectBasedResultFirstRow(rows) as QueryResult<T>;
        } catch (error) {
            if (error instanceof Error) {
                return createErrorResult(error.message) as QueryResult<T>;
            }

            return createErrorResult('Unexpected Error') as QueryResult<T>;
        }
    }

    public async fetchDatabaseSchema(): Promise<Database> {
        const database: Database = {};

        // Fetch all datasets
        const [datasets] = await this.bigQuery.getDatasets();
        if (datasets.length === 0) {
            throw new Error('No datasets found in the project.');
        }

        // Iterate over each dataset
        for (const dataset of datasets) {
            const datasetId = dataset.id;
            if (!datasetId) continue;

            const [tables] = await dataset.getTables();

            if (!database[datasetId]) {
                database[datasetId] = {}; // Initialize schema in the database
            }

            for (const table of tables) {
                const [metadata] = await table.getMetadata();

                const columns = metadata.schema.fields.map(
                    (field: any, index: number): TableColumn => {
                        return {
                            name: field.name,
                            position: index,
                            definition: {
                                type: field.type,
                                nullable: field.mode === 'NULLABLE',
                                default: null, // BigQuery does not support default values in the schema metadata
                                primaryKey: false, // BigQuery does not have a concept of primary keys
                                unique: false, // BigQuery does not have a concept of unique constraints
                            },
                        };
                    }
                );

                const currentTable: Table = {
                    name: table.id ?? '',
                    columns: columns,
                    indexes: [], // BigQuery does not support indexes
                    constraints: [], // BigQuery does not support primary keys, foreign keys, or unique constraints
                };

                database[datasetId][table.id ?? ''] = currentTable;
            }
        }

        return database;
    }
}
