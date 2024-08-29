import { QueryBuilder } from 'src/client';
import { Query } from 'src/query';
import { QueryType } from 'src/query-params';
import { AbstractDialect } from '../index';

export class DuckDbDialect extends AbstractDialect {
    formatSchemaAndTable(schema: string | undefined, table: string): string {
        return table;
    }
}