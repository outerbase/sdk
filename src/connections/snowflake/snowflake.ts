import snowflake from 'snowflake-sdk';
import { Query } from '../../query';
import { QueryResult } from '..';
import {
    createErrorResult,
    transformFromSdkTransform,
} from '../../utils/transformer';
import { Database, TableColumn } from '../../models/database';
import { PostgreBaseConnection } from './../postgre/base';
import {
    buildMySQLDatabaseSchmea,
    MySQLConstraintColumnResult,
} from '../mysql';

import { transformArrayBasedResult } from '@outerbase/sdk-transform';

export class SnowflakeConnection extends PostgreBaseConnection {
    protected db: snowflake.Connection;

    constructor(db: any) {
        super();
        this.db = db;
    }

    async connect(): Promise<any> {
        await new Promise((resolve, reject) => {
            this.db.connectAsync((err, conn) => {
                if (err) reject(err.message);
                else resolve(conn);
            });
        });
    }

    async disconnect(): Promise<any> {
        await new Promise((resolve) => this.db.destroy(resolve));
    }

    async testConnection(): Promise<{ error?: string }> {
        try {
            await this.connect();
            const { data } = await this.query({
                query: 'SELECT CURRENT_DATABASE() AS DBNAME;',
            });

            await this.disconnect();
            if (!data[0].DBNAME) return { error: 'Database does not exist' };

            return {};
        } catch (e) {
            if (e instanceof Error) return { error: e.message };
            return { error: 'Unknown error' };
        }
    }

    async fetchDatabaseSchema(): Promise<Database> {
        // Get the list of schema first
        const { data: schemaList } = await this.query<{ SCHEMA_NAME: string }>({
            query: `SELECT SCHEMA_NAME FROM information_schema.schemata WHERE schema_name NOT IN ('INFORMATION_SCHEMA');`,
        });

        // Get the list of all tables
        const { data: tableList } = await this.query<{
            TABLE_NAME: string;
            TABLE_SCHEMA: string;
        }>({
            query: `SELECT TABLE_NAME, TABLE_SCHEMA FROM information_schema.tables WHERE table_schema NOT IN ('INFORMATION_SCHEMA');`,
        });

        // Get the list of all columns
        const { data: columnList } = await this.query<{
            TABLE_SCHEMA: string;
            TABLE_NAME: string;
            COLUMN_NAME: string;
            DATA_TYPE: string;
            IS_NULLABLE: string;
            COLUMN_DEFAULT: string;
            ORDINAL_POSITION: number;
        }>({
            query: `SELECT * FROM information_schema.columns WHERE table_schema NOT IN ('INFORMATION_SCHEMA');`,
        });

        // Get the list of all constraints
        const { data: constraintsList } = await this.query<{
            CONSTRAINT_SCHEMA: string;
            CONSTRAINT_NAME: string;
            TABLE_NAME: string;
            TABLE_SCHEMA: string;
            CONSTRAINT_TYPE: string;
        }>({
            query: `SELECT * FROM information_schema.table_constraints WHERE CONSTRAINT_SCHEMA NOT IN ('INFORMATION_SCHEMA') AND CONSTRAINT_TYPE IN ('FOREIGN KEY', 'PRIMARY KEY', 'UNIQUE');`,
        });

        // Mamic the key usages table using SHOW PRIMARY KEY and SHOW FOREIGN KEYS
        const { data: primaryKeyConstraint } = await this.query<{
            schema_name: string;
            table_name: string;
            column_name: string;
            constraint_name: string;
        }>({ query: `SHOW PRIMARY KEYS;` });

        const { data: foreignKeyConstraint } = await this.query<{
            pk_schema_name: string;
            pk_table_name: string;
            pk_column_name: string;
            fk_schema_name: string;
            fk_table_name: string;
            fk_column_name: string;
            fk_name: string;
        }>({ query: `SHOW IMPORTED KEYS;` });

        // Postgres structure is similar to MySQL, so we can reuse the MySQL schema builder
        // by just mapping the column names
        return buildMySQLDatabaseSchmea({
            schemaList,
            tableList,
            columnList: columnList.map((column) => ({
                COLUMN_TYPE: column.DATA_TYPE,
                ...column,
                COLUMN_KEY: '',
                EXTRA: '',
            })),
            constraintsList,
            constraintColumnsList: [
                ...primaryKeyConstraint.map(
                    (constraint): MySQLConstraintColumnResult => ({
                        TABLE_SCHEMA: constraint.schema_name,
                        TABLE_NAME: constraint.table_name,
                        COLUMN_NAME: constraint.column_name,
                        CONSTRAINT_NAME: constraint.constraint_name,
                        REFERENCED_TABLE_SCHEMA: '',
                        REFERENCED_TABLE_NAME: '',
                        REFERENCED_COLUMN_NAME: '',
                    })
                ),
                ...foreignKeyConstraint.map(
                    (constraint): MySQLConstraintColumnResult => ({
                        TABLE_SCHEMA: constraint.fk_schema_name,
                        TABLE_NAME: constraint.fk_table_name,
                        COLUMN_NAME: constraint.fk_column_name,
                        CONSTRAINT_NAME: constraint.fk_name,
                        REFERENCED_TABLE_SCHEMA: constraint.pk_schema_name,
                        REFERENCED_TABLE_NAME: constraint.pk_table_name,
                        REFERENCED_COLUMN_NAME: constraint.pk_column_name,
                    })
                ),
            ],
        });
    }

    createTable(
        schemaName: string | undefined,
        tableName: string,
        columns: TableColumn[]
    ): Promise<QueryResult> {
        const tempColumns = structuredClone(columns);
        for (const column of tempColumns) {
            if (column.definition.references) {
                column.definition.references.table = schemaName
                    ? `${schemaName}.${column.definition.references.table}`
                    : column.definition.references.table;
            }
        }

        return super.createTable(schemaName, tableName, tempColumns);
    }

    async renameTable(
        schemaName: string | undefined,
        tableName: string,
        newTableName: string
    ): Promise<QueryResult> {
        // Schema is required for rename
        return super.renameTable(
            schemaName,
            tableName,
            schemaName ? `${schemaName}.${newTableName}` : newTableName
        );
    }

    async internalQuery<T = Record<string, unknown>>(
        query: Query
    ): Promise<QueryResult<T>> {
        try {
            const [err, headers, rows] = await new Promise<
                [snowflake.SnowflakeError | undefined, string[], unknown[][]]
            >((resolve) => {
                this.db.execute({
                    sqlText: query.query,
                    binds: query.parameters as snowflake.Binds,
                    rowMode: 'array',
                    complete: (err, stmt, rows) => {
                        resolve([
                            err,
                            err
                                ? []
                                : stmt.getColumns().map((col) => col.getName()),
                            rows as unknown[][],
                        ]);
                    },
                });
            });

            if (err) return createErrorResult(err.message) as QueryResult<T>;
            return transformFromSdkTransform({
                ...transformArrayBasedResult({
                    headers,
                    rows,
                    headersMapper: (header) => ({
                        name: header,
                        displayName: header,
                        originalType: null,
                    }),
                }),
                stat: {
                    queryDurationMs: 0,
                    rowsAffected: 0,
                    rowsRead: 0,
                    rowsWritten: 0,
                },
            }) as QueryResult<T>;
        } catch (e) {
            return createErrorResult('Unknown error') as QueryResult<T>;
        }
    }
}

/*
                 headers,
                    (header) => ({
                        name: header,
                        displayName: header,
                        originalType: null,
                    }),
                    rows
*/
