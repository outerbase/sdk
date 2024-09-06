import { AbstractDialect } from '../index';

export class BigQueryDialect extends AbstractDialect {
    formatSchemaAndTable(schema: string | undefined, table: string): string {
        if (schema) {
            return `\`${schema}.${table}\``;
        }
        return `\`${table}\``;
    }

    formatFromSchemaAndTable(schema: string | undefined, table: string): string {
        if (schema) {
            return `\`${schema}.${table}\``;
        }
        return `\`${table}\``;
    }
}