import { AbstractDialect, ColumnDataType } from '../index';
import { QueryBuilder } from '../../client';
import { QueryType } from '../../query-params';

export class MySQLDialect extends AbstractDialect {
    mapDataType(dataType: ColumnDataType): string {
        switch (dataType.toLowerCase()) {
            case ColumnDataType.STRING:
                return 'VARCHAR(255)'; // MySQL specific VARCHAR length
            case ColumnDataType.BOOLEAN:
                return 'TINYINT(1)'; // MySQL uses TINYINT for boolean
            default:
                return super.mapDataType(dataType);
        }
    }

    // select(builder: QueryBuilder, type: QueryType): string {
    //     return `SELECT MYSQL`
    // }
}