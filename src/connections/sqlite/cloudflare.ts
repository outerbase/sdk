import { QueryType } from '../../query-params';
import { Query, constructRawQuery } from '../../query';
import { DefaultDialect } from '../../query-builder/dialects/default';
import { SqliteBaseConnection } from './base';
import {
    Constraint,
    ConstraintColumn,
    Database,
    Table,
    TableColumn,
    TableIndex,
    TableIndexType,
} from 'src/models/database';
import { transformArrayBasedResult } from 'src/utils/transformer';

interface CloudflareResult {
    results: {
        columns: string[];
        rows: unknown[][];
    };

    meta: {
        duration: number;
        changes: number;
        last_row_id: number;
        rows_read: number;
        rows_written: number;
    };
}

interface CloudflareResponse {
    success?: boolean;
    result: CloudflareResult[];
    error?: string;
    errors?: string[];
}

export type CloudflareD1ConnectionDetails = {
    apiKey: string;
    accountId: string;
    databaseId: string;
};

export class CloudflareD1Connection extends SqliteBaseConnection {
    // The Cloudflare API key with D1 access
    apiKey: string | undefined;
    accountId: string | undefined;
    databaseId: string | undefined;

    // Default query type to positional for Cloudflare
    queryType = QueryType.positional;

    // Default dialect for Cloudflare
    dialect = new DefaultDialect();

    /**
     * Creates a new CloudflareD1Connection object with the provided API key,
     * account ID, and database ID.
     *
     * @param apiKey - The API key to be used for authentication.
     * @param accountId - The account ID to be used for authentication.
     * @param databaseId - The database ID to be used for querying.
     */
    constructor(private _: CloudflareD1ConnectionDetails) {
        super();
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
        return Promise.resolve();
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
        if (!this.apiKey) throw new Error('Cloudflare API key is not set');
        if (!this.accountId)
            throw new Error('Cloudflare account ID is not set');
        if (!this.databaseId)
            throw new Error('Cloudflare database ID is not set');
        if (!query) throw new Error('A SQL query was not provided');

        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/raw`,
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
        );

        const json: CloudflareResponse = await response.json();

        if (json.success) {
            const items = json.result[0].results;
            const rawSQL = constructRawQuery(query);

            return {
                data: transformArrayBasedResult(
                    items.columns,
                    (column) => ({ name: column }),
                    items.rows
                ),
                error: null,
                query: rawSQL,
                // There's additional metadata here we could pass in the future
                // meta: json.meta,
            };
        } else {
        }

        const rawSQL = constructRawQuery(query);

        return {
            data: [],
            error: new Error(json.error ?? json.errors?.join(', ')),
            query: rawSQL,
        };
    }

    // For some reason, Cloudflare D1 does not support
    // cross join with pragma_table_info, so we have to
    // to expensive loops to get the same data
    public async fetchDatabaseSchema(): Promise<Database> {
        const exclude_tables = [
            '_cf_kv',
            'sqlite_schema',
            'sqlite_temp_schema',
        ];

        const schemaMap: Record<string, Record<string, Table>> = {};

        const { data } = await this.query({
            query: `PRAGMA table_list`,
        });

        const allTables = (
            data as {
                schema: string;
                name: string;
                type: string;
            }[]
        ).filter(
            (row) =>
                !row.name.startsWith('_lite') &&
                !row.name.startsWith('sqlite_') &&
                !exclude_tables.includes(row.name?.toLowerCase())
        );

        for (const table of allTables) {
            if (exclude_tables.includes(table.name?.toLowerCase())) continue;

            const { data: pragmaData } = await this.query({
                query: `PRAGMA table_info('${table.name}')`,
            });

            const tableData = pragmaData as {
                cid: number;
                name: string;
                type: string;
                notnull: 0 | 1;
                dflt_value: string | null;
                pk: 0 | 1;
            }[];

            const { data: fkConstraintResponse } = await this.query({
                query: `PRAGMA foreign_key_list('${table.name}')`,
            });

            const fkConstraintData = (
                fkConstraintResponse as {
                    id: number;
                    seq: number;
                    table: string;
                    from: string;
                    to: string;
                    on_update: 'NO ACTION' | unknown;
                    on_delete: 'NO ACTION' | unknown;
                    match: 'NONE' | unknown;
                }[]
            ).filter(
                (row) =>
                    !row.table.startsWith('_lite') &&
                    !row.table.startsWith('sqlite_')
            );

            const constraints: Constraint[] = [];

            if (fkConstraintData.length > 0) {
                const fkConstraints: Constraint = {
                    name: 'FOREIGN KEY',
                    schema: table.schema,
                    tableName: table.name,
                    type: 'FOREIGN KEY',
                    columns: [],
                };

                fkConstraintData.forEach((fkConstraint) => {
                    const currentConstraint: ConstraintColumn = {
                        columnName: fkConstraint.from,
                    };
                    fkConstraints.columns.push(currentConstraint);
                });
                constraints.push(fkConstraints);
            }

            const indexes: TableIndex[] = [];
            const columns = tableData.map((column) => {
                // Primary keys are ALWAYS considered indexes
                if (column.pk === 1) {
                    indexes.push({
                        name: column.name,
                        type: TableIndexType.PRIMARY,
                        columns: [column.name],
                    });
                }

                const currentColumn: TableColumn = {
                    name: column.name,
                    position: column.cid,
                    definition: {
                        type: column.type,
                        nullable: column.notnull === 0,
                        default: column.dflt_value,
                        primaryKey: column.pk === 1,
                        unique: column.pk === 1,
                    },
                };

                return currentColumn;
            });

            const currentTable: Table = {
                name: table.name,
                columns: columns,
                indexes: indexes,
                constraints: constraints,
            };

            if (!schemaMap[table.schema]) {
                schemaMap[table.schema] = {};
            }

            schemaMap[table.schema][table.name] = currentTable;
        }

        return schemaMap;
    }
}
