import {
    FieldPacket,
    QueryError,
    type Connection,
    type QueryResult as MySQLQueryResult,
} from 'mysql2';
import { SqlConnection } from './sql-base';
import { Query } from '../query';
import { QueryType } from '../query-params';
import {
    Constraint,
    Database,
    Table,
    TableColumn,
    TableColumnDefinition,
} from './../models/database';
import { MySQLDialect } from './../query-builder/dialects/mysql';
import {
    createErrorResult,
    transformArrayBasedResult,
} from './../utils/transformer';
import { QueryResult } from '.';
import { ColumnDataType } from '../query-builder';

interface MySQLSchemaResult {
    SCHEMA_NAME: string;
}
interface MySQLTableResult {
    TABLE_SCHEMA: string;
    TABLE_NAME: string;
}

interface MySQLColumnResult {
    TABLE_SCHEMA: string;
    TABLE_NAME: string;
    COLUMN_NAME: string;
    COLUMN_TYPE: string;
    ORDINAL_POSITION: number;
    IS_NULLABLE: string;
    COLUMN_DEFAULT: string | null;
    COLUMN_KEY: string;
    EXTRA: string;
}

interface MySQLConstraintResult {
    TABLE_SCHEMA: string;
    TABLE_NAME: string;
    CONSTRAINT_NAME: string;
    CONSTRAINT_TYPE: string;
}

export interface MySQLConstraintColumnResult {
    TABLE_SCHEMA: string;
    TABLE_NAME: string;
    COLUMN_NAME: string;
    CONSTRAINT_NAME: string;
    REFERENCED_TABLE_SCHEMA: string;
    REFERENCED_TABLE_NAME: string;
    REFERENCED_COLUMN_NAME: string;
}

// We expose this function for other drivers with similar structure
// For example: PostgreSQL has almost the same structure with MySQL
export function buildMySQLDatabaseSchmea({
    schemaList,
    tableList,
    columnList,
    constraintsList,
    constraintColumnsList,
}: {
    schemaList: MySQLSchemaResult[];
    tableList: MySQLTableResult[];
    columnList: MySQLColumnResult[];
    constraintsList: MySQLConstraintResult[];
    constraintColumnsList: MySQLConstraintColumnResult[];
}): Database {
    // Create dictionary of schema
    const result = schemaList.reduce<Database>((db, schema) => {
        db[schema.SCHEMA_NAME] = {};
        return db;
    }, {});

    // Table lookup by schema and table name
    const tableLookup: Record<string, Table> = {};

    // Group tables by schema and also build table lookup
    for (const table of tableList) {
        if (!result[table.TABLE_SCHEMA]) {
            result[table.TABLE_SCHEMA] = {};
        }

        if (!result[table.TABLE_SCHEMA][table.TABLE_NAME]) {
            const tableObject = {
                name: table.TABLE_NAME,
                columns: [],
                indexes: [],
                constraints: [],
            };

            tableLookup[table.TABLE_SCHEMA + '.' + table.TABLE_NAME] =
                tableObject;
            result[table.TABLE_SCHEMA][table.TABLE_NAME] = tableObject;
        }
    }

    // Column lookup by schema, table and column name
    const columnLookup: Record<string, TableColumn> = {};

    // Group the columns by table and also build column lookup
    for (const column of columnList) {
        const table =
            tableLookup[column.TABLE_SCHEMA + '.' + column.TABLE_NAME];

        if (!table) continue;

        const columnObject: TableColumn = {
            name: column.COLUMN_NAME,
            position: column.ORDINAL_POSITION,
            definition: {
                type: column.COLUMN_TYPE,
                nullable: column.IS_NULLABLE === 'YES',
                default: column.COLUMN_DEFAULT,
                primaryKey: column.COLUMN_KEY === 'PRI',
                unique: column.EXTRA === 'UNI',
            },
        };

        columnLookup[
            column.TABLE_SCHEMA +
                '.' +
                column.TABLE_NAME +
                '.' +
                column.COLUMN_NAME
        ] = columnObject;

        table.columns.push(columnObject);
    }

    // Constraint lookup by schema and constraint name
    const constraintLookup: Record<string, Constraint> = {};

    // Group constraints by table and also build constraint lookup
    for (const constraint of constraintsList) {
        const table =
            tableLookup[constraint.TABLE_SCHEMA + '.' + constraint.TABLE_NAME];

        if (!table) continue;

        const constraintObject = {
            name: constraint.CONSTRAINT_NAME,
            schema: constraint.TABLE_SCHEMA,
            tableName: constraint.TABLE_NAME,
            type: constraint.CONSTRAINT_TYPE,
            columns: [],
        } as Constraint;

        constraintLookup[
            constraint.TABLE_SCHEMA +
                '.' +
                constraint.TABLE_NAME +
                '.' +
                constraint.CONSTRAINT_NAME
        ] = constraintObject;

        table.constraints.push(constraintObject);
    }

    // Group constraint columns by constraint
    for (const constraintColumn of constraintColumnsList) {
        const constraint =
            constraintLookup[
                constraintColumn.TABLE_SCHEMA +
                    '.' +
                    constraintColumn.TABLE_NAME +
                    '.' +
                    constraintColumn.CONSTRAINT_NAME
            ];

        if (!constraint) continue;

        const currentColumn =
            columnLookup[
                constraintColumn.TABLE_SCHEMA +
                    '.' +
                    constraintColumn.TABLE_NAME +
                    '.' +
                    constraintColumn.COLUMN_NAME
            ];
        if (currentColumn && constraintColumn.REFERENCED_COLUMN_NAME) {
            currentColumn.definition.references = {
                table: constraintColumn.REFERENCED_TABLE_NAME,
                column: [constraintColumn.REFERENCED_COLUMN_NAME],
            };

            constraint.referenceSchema =
                constraintColumn.REFERENCED_TABLE_SCHEMA;
            constraint.referenceTableName =
                constraintColumn.REFERENCED_TABLE_NAME;
        }

        constraint.columns.push({
            columnName: constraintColumn.COLUMN_NAME,
            referenceColumnName: constraintColumn.REFERENCED_COLUMN_NAME,
        });
    }

    return result;
}

export class MySQLConnection extends SqlConnection {
    protected conn: Connection;
    public dialect = new MySQLDialect();
    queryType = QueryType.positional;

    constructor(conn: any) {
        super();
        this.conn = conn;
    }

    mapDataType(dataType: string): string {
        if (dataType === ColumnDataType.STRING) return 'TEXT';
        if (dataType === ColumnDataType.NUMBER) return 'INT';
        if (dataType === ColumnDataType.ARRAY) return 'JSON';
        if (dataType === ColumnDataType.UUID) return 'TEXT';
        return super.mapDataType(dataType);
    }

    async internalQuery<T = Record<string, unknown>>(
        query: Query
    ): Promise<QueryResult<T>> {
        try {
            const { fields, rows, error } = await new Promise<{
                rows: MySQLQueryResult;
                error: QueryError | null;
                fields: FieldPacket[];
            }>((r) =>
                this.conn.query(
                    {
                        sql: query.query,
                        rowsAsArray: true,
                    },
                    query.parameters,
                    (error, result, fields) => {
                        if (Array.isArray(result)) {
                            r({
                                rows: (result as MySQLQueryResult) ?? [],
                                fields: fields,
                                error,
                            });
                        }
                        return r({ rows: [], error, fields: [] });
                    }
                )
            );

            if (error) {
                return createErrorResult(error.message) as QueryResult<T>;
            } else {
                return transformArrayBasedResult(
                    fields,
                    (header) => {
                        return {
                            name: header.name,
                            tableName: header.table,
                        };
                    },
                    rows as unknown[][]
                ) as QueryResult<T>;
            }
        } catch {
            return createErrorResult('Unknown error') as QueryResult<T>;
        }
    }

    async fetchDatabaseSchema(): Promise<Database> {
        // Get all the schema list
        const { data: schemaList } = await this.query<MySQLSchemaResult>({
            query: "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys')",
        });

        const { data: tableList } = await this.query<MySQLTableResult>({
            query: "SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE FROM information_schema.tables WHERE TABLE_SCHEMA NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys')",
        });

        const { data: columnList } = await this.query<MySQLColumnResult>({
            query: "SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, ORDINAL_POSITION, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY, EXTRA FROM information_schema.columns WHERE TABLE_SCHEMA NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys')",
        });

        const { data: constraintsList } =
            await this.query<MySQLConstraintResult>({
                query: `SELECT TABLE_SCHEMA, TABLE_NAME, CONSTRAINT_NAME, CONSTRAINT_TYPE FROM information_schema.table_constraints WHERE TABLE_SCHEMA NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys') AND CONSTRAINT_TYPE IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')`,
            });

        const { data: constraintColumnsList } =
            await this.query<MySQLConstraintColumnResult>({
                query: `SELECT CONSTRAINT_NAME, TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_SCHEMA, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM information_schema.key_column_usage WHERE TABLE_SCHEMA NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys')`,
            });

        return buildMySQLDatabaseSchmea({
            schemaList,
            tableList,
            columnList,
            constraintsList,
            constraintColumnsList,
        });
    }

    async renameTable(
        schemaName: string | undefined,
        tableName: string,
        newTableName: string
    ): Promise<QueryResult> {
        // If we don't put the schema name when rename the table,
        // it might change the schema of the table after rename.
        return super.renameTable(
            schemaName,
            tableName,
            schemaName ? `${schemaName}.${newTableName}` : newTableName
        );
    }

    async renameColumn(
        schemaName: string | undefined,
        tableName: string,
        columnName: string,
        newColumnName: string
    ): Promise<QueryResult> {
        // Check the MySQL version
        const { data: version } = await this.query<{ version: string }>({
            query: 'SELECT VERSION() AS version',
        });

        const fullTableName = this.dialect.escapeId(
            schemaName ? `${schemaName}.${tableName}` : tableName
        );

        const versionNumber = parseInt(version[0].version.split('.')[0]);
        if (versionNumber < 8) {
            // We cannot rename column in MySQL version less than 8 using RENAME COLUMN
            // We need to get the CREATE SCRIPT of the table
            const { data: createTableResponse } = await this.query<{
                'Create Table': string;
            }>({
                query: `SHOW CREATE TABLE ${fullTableName}`,
            });

            // Cannot rename column if the table does not exist
            if (createTableResponse.length === 0)
                return createErrorResult('Table does not exist');

            // Get the line of the column
            const createTable = createTableResponse[0]['Create Table'];
            const lists = createTable.split('\n');
            const columnLine = lists.find((line) =>
                line
                    .trim()
                    .toLowerCase()
                    .startsWith(this.dialect.escapeId(columnName).toLowerCase())
            );

            if (!columnLine) return createErrorResult('Column does not exist');

            const [columnNamePart, ...columnDefinitions] = columnLine
                .trim()
                .replace(/,$/, '')
                .split(' ');

            const query = `ALTER TABLE ${fullTableName} CHANGE COLUMN ${columnNamePart} ${this.dialect.escapeId(newColumnName)} ${columnDefinitions.join(' ')}`;
            return await this.query({ query });
        }

        return super.renameColumn(
            schemaName,
            tableName,
            columnName,
            newColumnName
        );
    }

    async connect(): Promise<any> {}
    async disconnect(): Promise<any> {
        this.conn.destroy();
    }
}
