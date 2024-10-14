import {
    Constraint,
    ConstraintColumn,
    TableIndex,
    TableIndexType,
    TableColumn,
    Database,
    Table,
} from 'src/models/database';
import { Connection, SqlConnection } from '..';

export abstract class SqliteBaseConnection extends SqlConnection {
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
                    type: column.type,
                    position: column.cid,
                    nullable: column.notnull === 0,
                    default: column.dflt_value,
                    primary: column.pk === 1,
                    unique: column.pk === 1,
                    references: [],
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
