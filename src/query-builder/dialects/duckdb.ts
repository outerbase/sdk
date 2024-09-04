import { AbstractDialect } from '../index';

export class DuckDbDialect extends AbstractDialect {
    formatSchemaAndTable(schema: string | undefined, table: string): string {
        return table;
    }
}