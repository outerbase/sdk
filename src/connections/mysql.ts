import { type Connection, type RowDataPacket } from 'mysql2';
import { Connection as BaseConnection, QueryResult } from '.';
import { constructRawQuery, Query } from '../query';
import { QueryType } from '../query-params';
import { Constraint, Database, Table, TableColumn } from './../models/database';
import { MySQLDialect } from './../query-builder/dialects/mysql';

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

interface MySQLConstraintColumnResult {
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

        const columnObject = {
            name: column.COLUMN_NAME,
            type: column.COLUMN_TYPE,
            position: column.ORDINAL_POSITION,
            nullable: column.IS_NULLABLE === 'YES',
            default: column.COLUMN_DEFAULT,
            primary: column.COLUMN_KEY === 'PRI',
            unique: column.EXTRA === 'UNI',
            references: [],
        } as TableColumn;

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
        };

        constraintLookup[
            constraint.TABLE_SCHEMA + '.' + constraint.CONSTRAINT_NAME
        ] = constraintObject;

        table.constraints.push(constraintObject);
    }

    // Group constraint columns by constraint
    for (const constraintColumn of constraintColumnsList) {
        const constraint =
            constraintLookup[
                constraintColumn.TABLE_SCHEMA +
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
            currentColumn.references.push({
                table: constraintColumn.REFERENCED_TABLE_NAME,
                column: constraintColumn.REFERENCED_COLUMN_NAME,
            });
        }

        constraint.columns.push({
            columnName: constraintColumn.COLUMN_NAME,
        });
    }

    return result;
}

export class MySQLConnection implements BaseConnection {
    protected conn: Connection;
    public dialect = new MySQLDialect();
    queryType = QueryType.positional;

    constructor(conn: Connection) {
        this.conn = conn;
    }

    async query<T = Record<string, unknown>>(
        query: Query
    ): Promise<QueryResult<T>> {
        const rows = await new Promise<RowDataPacket[]>((r) =>
            this.conn.query(query.query, query.parameters, (_, result) => {
                if (Array.isArray(result)) {
                    r((result as RowDataPacket[]) ?? []);
                }
                return r([]);
            })
        );

        return {
            data: rows.map((r) => ({ ...r }) as T),
            error: null,
            query: constructRawQuery(query),
        };
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

    async connect(): Promise<any> {}
    async disconnect(): Promise<any> {
        this.conn.destroy();
    }
}
