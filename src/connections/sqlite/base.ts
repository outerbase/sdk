import { Database, Table, TableColumn } from './../../models/database';
import { SqlConnection } from '../sql-base';
import { AbstractDialect } from './../../query-builder';
import { SqliteDialect } from './../../query-builder/dialects/sqlite-dialect';
export abstract class SqliteBaseConnection extends SqlConnection {
    dialect: AbstractDialect = new SqliteDialect();

    public async fetchDatabaseSchema(): Promise<Database> {
        const { data: tableList } = await this.query<{
            type: string;
            name: string;
            tbl_name: string;
        }>({
            query: `SELECT * FROM sqlite_master WHERE type = 'table' AND (name NOT LIKE 'sqlite_%' OR name NOT LIKE '_cf_%')`,
        });

        const { data: columnList } = await this.query<{
            cid: number;
            name: string;
            type: string;
            notnull: 0 | 1;
            dflt_value: string | null;
            pk: 0 | 1;
            tbl_name: string;
            ref_table_name: string | null;
            ref_column_name: string | null;
        }>({
            query: `WITH master AS (SELECT tbl_name FROM sqlite_master WHERE type = 'table' AND tbl_name NOT LIKE 'sqlite_%' AND tbl_name NOT LIKE '_cf_%')
SELECT columns.*, fk."table" AS ref_table_name, fk."to" AS ref_column_name 
FROM
  (SELECT fields.*, tbl_name FROM master CROSS JOIN pragma_table_info (master.tbl_name) fields) AS columns LEFT JOIN
  (SELECT fk.*, tbl_name FROM master CROSS JOIN pragma_foreign_key_list (master.tbl_name) fk) AS fk 
  ON fk."from" = columns.name AND fk.tbl_name = columns.tbl_name;`,
        });

        const tableLookup = tableList.reduce(
            (acc, table) => {
                acc[table.tbl_name] = {
                    name: table.name,
                    columns: [],
                    indexes: [],
                    constraints: [],
                };
                return acc;
            },
            {} as Record<string, Table>
        );

        for (const column of columnList) {
            if (!tableLookup[column.tbl_name]) continue;

            tableLookup[column.tbl_name].columns.push({
                name: column.name,
                position: column.cid,
                definition: {
                    type: column.type,
                    nullable: column.notnull === 0,
                    default: column.dflt_value,
                    primaryKey: column.pk === 1,
                    unique: false,
                    references:
                        column.ref_table_name && column.ref_column_name
                            ? {
                                  table: column.ref_table_name,
                                  column: column.ref_column_name,
                              }
                            : undefined,
                },
            } as TableColumn);
        }

        // Sqlite default schema is "main", since we don't support
        // ATTACH, we don't need to worry about other schemas
        return {
            main: tableLookup,
        };
    }
}
