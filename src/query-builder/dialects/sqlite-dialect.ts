import { AbstractDialect } from '..';

export class SqliteDialect extends AbstractDialect {
    protected AUTO_INCREMENT_KEYWORD = 'AUTOINCREMENT';
}
