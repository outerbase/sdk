import { QueryType } from '../query-params';
import { Query } from '../query';
import { QueryResult } from './index';
import { Database, Schema, Table, TableColumn } from '../models/database';
import { BigQueryDialect } from '../query-builder/dialects/bigquery';
import { BigQuery } from '@google-cloud/bigquery';
import {
    createErrorResult,
    transformObjectBasedResultFirstRow,
} from './../utils/transformer';
import { SqlConnection } from './sql-base';

export class BigQueryConnection extends SqlConnection {
    bigQuery: BigQuery;
    dialect = new BigQueryDialect();

    constructor(bigQuery: any) {
        super();
        this.bigQuery = bigQuery;
    }

    async connect(): Promise<any> {
        return Promise.resolve();
    }

    async disconnect(): Promise<any> {
        return Promise.resolve();
    }

    createTable(
        schemaName: string | undefined,
        tableName: string,
        columns: TableColumn[]
    ): Promise<QueryResult> {
        // BigQuery does not support PRIMARY KEY. We can remove if here
        const tempColumns = structuredClone(columns);
        for (const column of tempColumns) {
            delete column.definition.references;
        }

        return super.createTable(schemaName, tableName, tempColumns);
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
        const [datasetList] = await this.bigQuery.getDatasets();

        // Construct the query to get all the table in one go
        const sql = datasetList
            .map((dataset) => {
                const schemaPath = `${this.bigQuery.projectId}.${dataset.id}`;

                return `(
  SELECT
    a.table_schema,
    a.table_name,
    a.column_name,
    a.data_type,
    b.constraint_schema,
    b.constraint_name,
    c.constraint_type
  FROM \`${schemaPath}.INFORMATION_SCHEMA.COLUMNS\` AS a LEFT JOIN \`${schemaPath}.INFORMATION_SCHEMA.KEY_COLUMN_USAGE\` AS b ON (
    a.table_schema = b.table_schema AND
    a.table_name = b.table_name AND
    a.column_name = b.column_name
  ) LEFT JOIN \`${schemaPath}.INFORMATION_SCHEMA.TABLE_CONSTRAINTS\` AS c ON (
    b.constraint_schema = c.constraint_schema AND
    b.constraint_name = c.constraint_name
  )
)`;
            })
            .join(' UNION ALL ');

        const { data } = await this.query<{
            table_schema: string;
            table_name: string;
            column_name: string;
            data_type: string;
            constraint_schema: string;
            constraint_name: string;
            constraint_type: null | 'PRIMARY KEY' | 'FOREIGN KEY';
        }>({ query: sql });

        // Group the database schema by table
        const database: Database = datasetList.reduce(
            (acc, dataset) => {
                acc[dataset.id ?? ''] = {};
                return acc;
            },
            {} as Record<string, Schema>
        );

        // Group the table by database
        data.forEach((row) => {
            const schema = database[row.table_schema];
            if (!schema) {
                return;
            }

            const table = schema[row.table_name] ?? {
                name: row.table_name,
                columns: [],
                indexes: [],
                constraints: [],
            };

            if (!schema[row.table_name]) {
                schema[row.table_name] = table;
            }

            // Add the column to the table
            table.columns.push({
                name: row.column_name,
                definition: {
                    type: row.data_type,
                    primaryKey: row.constraint_type === 'PRIMARY KEY',
                },
            });

            // Add the constraint to the table
            if (row.constraint_name && row.constraint_type === 'PRIMARY KEY') {
                let constraint = table.constraints.find(
                    (c) => c.name === row.constraint_name
                );

                if (!constraint) {
                    constraint = {
                        name: row.constraint_name,
                        schema: row.constraint_schema,
                        tableName: row.table_name,
                        type: row.constraint_type,
                        columns: [],
                    };

                    table.constraints.push(constraint);
                }

                constraint.columns.push({
                    columnName: row.column_name,
                });
            }
        });

        return database;
    }
}
