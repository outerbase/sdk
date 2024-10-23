import { AbstractDialect, ColumnDataType } from '../index';

export class MySQLDialect extends AbstractDialect {
    escapeId(identifier: string): string {
        return identifier
            .split('.')
            .map((str) => {
                if (str === '*') return '*';
                return '`' + str.replace(/`/g, '``') + '`';
            })
            .join('.');
    }
}
