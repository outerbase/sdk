import { AbstractDialect } from './../../query-builder';
import { PostgresDialect } from './../../query-builder/dialects/postgres';
import { Database } from './../../models/database';
import { buildMySQLDatabaseSchmea } from './../mysql';
import { SqlConnection } from '../sql-base';

export abstract class PostgreBaseConnection extends SqlConnection {
    dialect: AbstractDialect = new PostgresDialect();

    async fetchDatabaseSchema(): Promise<Database> {
        // Get the list of schema first
        const { data: schemaList } = await this.query<{ schema_name: string }>({
            query: `SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast');`,
        });

        // Get the list of all tables
        const { data: tableList } = await this.query<{
            table_name: string;
            table_schema: string;
        }>({
            query: `SELECT table_name, table_schema FROM information_schema.tables WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast');`,
        });

        // Get the list of all columns
        const { data: columnList } = await this.query<{
            table_schema: string;
            table_name: string;
            column_name: string;
            data_type: string;
            is_nullable: string;
            column_default: string;
            ordinal_position: number;
        }>({
            query: `SELECT * FROM information_schema.columns WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast');`,
        });

        // Get the list of all constraints
        const { data: constraintList } = await this.query<{
            constraint_schema: string;
            constraint_name: string;
            table_name: string;
            table_schema: string;
            constraint_type: string;
        }>({
            query: `SELECT * FROM information_schema.table_constraints WHERE constraint_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast');`,
        });

        // Get the list of foreign key relation
        const { data: constraintColumnsList } = await this.query<{
            constraint_name: string;
            table_schema: string;
            table_name: string;
            column_name: string;
            reference_table_name: string;
            reference_column_name: string;
            reference_table_schema: string;
        }>({
            query: `SELECT
	kcu.constraint_name,
	kcu.table_schema,
	kcu.table_name,
	kcu.column_name,
	ccu.table_schema AS reference_table_schema,
	ccu.table_name AS reference_table_name,
	ccu.column_name AS reference_column_name
FROM
	information_schema.table_constraints AS tc
	LEFT JOIN information_schema.key_column_usage AS kcu
	ON (
		tc.table_schema = kcu.table_schema AND
		tc.table_name = kcu.table_name AND
		tc.constraint_name = kcu.constraint_name
	)
	LEFT JOIN information_schema.constraint_column_usage AS ccu
	ON (
		ccu.table_schema = kcu.table_schema AND
		ccu.constraint_name = kcu.constraint_name AND
		tc.constraint_type = 'FOREIGN KEY'
	)
WHERE
	kcu.constraint_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')`,
        });

        // Postgres structure is similar to MySQL, so we can reuse the MySQL schema builder
        // by just mapping the column names
        return buildMySQLDatabaseSchmea({
            schemaList: schemaList.map((schema) => ({
                SCHEMA_NAME: schema.schema_name,
            })),
            tableList: tableList.map((table) => ({
                TABLE_NAME: table.table_name,
                TABLE_SCHEMA: table.table_schema,
            })),
            columnList: columnList.map((column) => ({
                TABLE_NAME: column.table_name,
                COLUMN_NAME: column.column_name,
                COLUMN_TYPE: column.data_type,
                IS_NULLABLE: column.is_nullable,
                COLUMN_DEFAULT: column.column_default,
                COLUMN_KEY: '',
                EXTRA: '',
                ORDINAL_POSITION: column.ordinal_position,
                TABLE_SCHEMA: column.table_schema,
            })),
            constraintsList: constraintList.map((constraint) => ({
                CONSTRAINT_NAME: constraint.constraint_name,
                CONSTRAINT_TYPE: constraint.constraint_type,
                TABLE_NAME: constraint.table_name,
                TABLE_SCHEMA: constraint.table_schema,
            })),
            constraintColumnsList: constraintColumnsList.map((constraint) => ({
                TABLE_NAME: constraint.table_name,
                TABLE_SCHEMA: constraint.table_schema,
                COLUMN_NAME: constraint.column_name,
                CONSTRAINT_NAME: constraint.constraint_name,
                REFERENCED_TABLE_NAME: constraint.reference_table_name,
                REFERENCED_COLUMN_NAME: constraint.reference_column_name,
                REFERENCED_TABLE_SCHEMA: constraint.reference_table_schema,
            })),
        });
    }
}
