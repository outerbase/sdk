import { AbstractDialect, ColumnDataType } from '../index';

export class MySQLDialect extends AbstractDialect {
    mapDataType(dataType: ColumnDataType): string {
        switch (dataType.toLowerCase()) {
            case ColumnDataType.STRING:
                return 'VARCHAR(255)';
            case ColumnDataType.BOOLEAN:
                return 'TINYINT(1)';
            default:
                return super.mapDataType(dataType);
        }
    }
}