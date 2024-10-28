import { MySQLDialect } from './mysql';
export class BigQueryDialect extends MySQLDialect {
    protected ALWAY_NO_ENFORCED_CONSTRAINT = true;

    escapeId(identifier: string): string {
        return `\`${identifier}\``;
    }
}
