import snowflake from "snowflake-sdk";
import { Query } from "src/query";
import { QueryResult } from "..";
import { createErrorResult, transformObjectBasedResult } from "src/utils/transformer";
import { Database, TableColumn } from "src/models/database";
import { PostgreBaseConnection } from './../postgre/base';

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
                else resolve(conn)
            })
        })
    }

    async disconnect(): Promise<any> {
        await new Promise((resolve) => this.db.destroy(resolve))
    }

    async fetchDatabaseSchema(): Promise<Database> {
        return {};
    }

    createTable(
        schemaName: string | undefined,
        tableName: string,
        columns: TableColumn[]
    ): Promise<QueryResult> {
        const tempColumns = structuredClone(columns);
        for (const column of tempColumns) {
            delete column.definition.references;
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

    async query<T = Record<string, unknown>>(query: Query): Promise<QueryResult<T>> {
        try {
            const [err, rows] = await new Promise<[snowflake.SnowflakeError | undefined, Record<string, unknown>[]]>((resolve) => {
                this.db.execute({
                    sqlText: query.query,
                    binds: query.parameters as snowflake.Binds,
                    complete: (err, stmt, rows) => {
                        if (err) console.log(err.message, stmt.getSqlText());
                        resolve([err, rows as Record<string, unknown>[]]);
                    }
                });
            });

            if (err) return createErrorResult(err.message) as QueryResult<T>;
            return transformObjectBasedResult(rows) as QueryResult<T>
        } catch (e) {
            return createErrorResult('Unknown error') as QueryResult<T>;
        }
    }
}