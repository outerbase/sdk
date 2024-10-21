import { MySQLDialect } from './mysql';
export class BigQueryDialect extends MySQLDialect {
    escapeId(identifier: string): string {
        return `\`${identifier}\``;
    }
}
