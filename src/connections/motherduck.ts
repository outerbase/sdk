import { QueryType } from '../query-params';
import { Query, constructRawQuery } from '../query';
import { Connection, QueryResult } from './index';
import {
    Database,
    Table,
    TableColumn,
    TableIndex,
    TableIndexType,
} from '../models/database';
import { DuckDbDialect } from '../query-builder/dialects/duckdb';
import duckDB from 'duckdb';

type DuckDBParameters = {
    path: string;
    token: string;
};

export class DuckDBConnection implements Connection {
    duckDB: duckDB.Database | undefined;
    connection: duckDB.Connection | undefined;

    // Default query type to positional for MotherDuck
    queryType = QueryType.positional;

    // Default dialect for MotherDuck
    dialect = new DuckDbDialect();

    constructor(private _: DuckDBParameters) {
        this.duckDB = new duckDB.Database(_.path, {
            motherduck_token: _.token,
        });
        this.connection = this.duckDB.connect();
    }

    renameColumn(): Promise<QueryResult> {
        throw new Error('Method not implemented.');
    }

    /**
     * Performs a connect action on the current Connection object.
     *
     * @param details - Unused in the Motherduck scenario.
     * @returns Promise<any>
     */
    async connect(): Promise<any> {
        return this.duckDB?.connect();
    }

    /**
     * Performs a disconnect action on the current Connection object.
     *
     * @returns Promise<any>
     */
    async disconnect(): Promise<any> {
        return this.duckDB?.close();
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
        const connection = this.connection;
        if (!connection) throw new Error('No DuckDB connection was found.');

        let result = null;
        let error = null;

        try {
            if (Array.isArray(query.parameters)) {
                const { res } = await this.runQuery(
                    connection,
                    query.query,
                    ...query.parameters
                );
                result = res;
            } else {
                const { res } = await this.runQuery(connection, query.query);
                result = res;
            }
        } catch (e) {
            error = e instanceof Error ? e : new Error(String(e));
        }

        const rawSQL = constructRawQuery(query);

        return {
            data: result,
            error: error,
            query: rawSQL,
        };
    }

    public async fetchDatabaseSchema(): Promise<Database> {
        type DuckDBTables = {
            database: string;
            schema: string;
            name: string;
            column_names: string[];
            column_types: string[];
            temporary: boolean;
        };

        type DuckDBSettingsRow = {
            name: string;
            value: string;
            description: string;
            input_type: string;
            scope: string;
        };

        type DuckDBTableInfo = {
            cid: number;
            name: string;
            type: string;
            notnull: boolean;
            dflt_value: string | null;
            pk: boolean;
        };

        const { data: currentDatabaseResponse, error: settingsError } =
            await this.query({
                query: `SELECT * FROM duckdb_settings();`,
            });

        if (settingsError || !currentDatabaseResponse) {
            throw new Error('Failed to retrieve database settings.');
        }

        const currentDatabase = (currentDatabaseResponse as DuckDBSettingsRow[])
            .find((row) => row.name === 'temp_directory')
            ?.value?.split(':')?.[1]
            ?.split('.')?.[0];

        if (!currentDatabase) {
            throw new Error('Current database could not be determined.');
        }

        const { data: result, error: tableError } = await this.query({
            query: `PRAGMA show_tables_expanded;`,
        });

        if (tableError || !result) {
            throw new Error('Failed to retrieve tables.');
        }

        const tables = result as DuckDBTables[];
        const currentTables = tables.filter(
            (table) => table.database === currentDatabase
        );

        const schemaMap: Record<string, Record<string, Table>> = {};

        for (const table of currentTables) {
            const { data: tableInfoResult, error: tableInfoError } =
                await this.query({
                    query: `PRAGMA table_info('${table.database}.${table.schema}.${table.name}')`,
                });

            if (tableInfoError || !tableInfoResult) {
                throw new Error(
                    `Failed to retrieve table info for table: ${table.name}`
                );
            }

            const tableInfo = tableInfoResult as DuckDBTableInfo[];

            const indexes: TableIndex[] = [];
            const columns: TableColumn[] = tableInfo.map((column) => {
                if (column.pk) {
                    indexes.push({
                        name: column.name,
                        type: TableIndexType.PRIMARY,
                        columns: [column.name],
                    });
                }

                return {
                    name: column.name,
                    type: column.type,
                    position: column.cid,
                    nullable: !column.notnull,
                    default: column.dflt_value,
                    primary: column.pk,
                    unique: column.pk, // Assuming PK is unique
                    references: [], // Foreign key references not supported by MotherDuck
                };
            });

            const currentTable: Table = {
                name: table.name,
                columns: columns,
                indexes: indexes,
                constraints: [], // Constraints are not available in MotherDuck
            };

            // Ensure the schema exists in the schemaMap
            if (!schemaMap[table.schema]) {
                schemaMap[table.schema] = {};
            }

            schemaMap[table.schema][table.name] = currentTable;
        }

        // Return the schema map as a properly typed Database object
        return schemaMap;
    }

    runQuery = async (
        connection: duckDB.Connection,
        query: string,
        ...params: any[]
    ): Promise<{ stmt: duckDB.Statement; res: any[] }> => {
        return new Promise((resolve, reject) => {
            connection.prepare(query, (err, stmt) => {
                if (err) {
                    return reject(err);
                }

                stmt.all(...params, (err, res) => {
                    if (err) {
                        stmt.finalize();
                        return reject(err);
                    }

                    resolve({ stmt, res });
                    stmt.finalize();
                });
            });
        });
    };
}
