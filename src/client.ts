import { Connection } from './connections';
import { Query, constructRawQuery } from './query';
import { QueryParams, QueryType } from './query-params';
import { AbstractDialect, ColumnDataType } from './query-builder';

export enum QueryBuilderAction {
    SELECT = 'select',
    INSERT = 'insert',
    UPDATE = 'update',
    DELETE = 'delete',

    // Table operations
    CREATE_TABLE = 'createTable',
    UPDATE_TABLE = 'updateTable',
    DELETE_TABLE = 'deleteTable',
    TRUNCATE_TABLE = 'truncateTable',
    RENAME_TABLE = 'renameTable',
    ALTER_TABLE = 'alterTable',
    ADD_COLUMNS = 'addColumns',
    DROP_COLUMNS = 'dropColumns',
    RENAME_COLUMNS = 'renameColumns',
    UPDATE_COLUMNS = 'updateColumns',
}

export type QueryPart = [string, unknown[]];
export interface WhereCondition {
    joinType?: undefined;
    column: string;
    value: unknown;
    operator: string;
}

export interface WhereClaues {
    joinType: 'OR' | 'AND';
    conditions: (WhereCondition | WhereClaues)[];
}

export type WhereGenerator = () => WhereClaues;

export interface QueryBuilderInternal {
    action: QueryBuilderAction;
    // Sets the focused schema name, used for INSERT, UPDATE, DELETE
    schema?: string;
    // Sets the focused table name, used for INSERT, UPDATE, DELETE
    table?: string;

    selectColumns: string[];

    // Used when column names and type are required, such as CREATE TABLE
    columns: {
        default?: string;
        primaryKey?: boolean;
        nullable?: boolean;
        name?: string;
        type?: ColumnDataType | string;
        oldName?: string;
        newName?: string;
    }[];
    whereClauses: WhereClaues;
    joins?: string[];
    data?: Record<string, unknown>;
    limit?: number;
    offset?: number;
    orderBy: { columnName: string; direction: 'ASC' | 'DESC' }[];
    returning?: string[];
    asClass?: any;
    groupBy?: string;
    // In an alter state within the builder
    isAltering?: boolean;

    selectRawValue?: string;

    // General operation values, such as when renaming tables referencing the old and new name
    originalValue?: string;
    newValue?: string;
}

function buildWhereClause(args: unknown[]): WhereCondition | WhereClaues {
    if (args.length === 0) throw new Error('No arguments provided');

    if (typeof args[0] === 'string') {
        // This should be columnName, operator, and value arguments
        const columnName = args[0];
        const operator = args[1];
        const value = args[2];

        if (!operator) throw new Error("Operator can't be empty");
        if (typeof operator !== 'string')
            throw new Error('Operator must be a string');
        if (value === undefined) throw new Error("Value can't be empty");

        const whereCondition = {
            column: columnName,
            operator,
            value,
        };

        return whereCondition;
    } else if (typeof args[0] === 'object') {
        // This should be Record<string, unknown> arguments
        const conditions = args[0] as Record<string, unknown>;

        const whereClause: WhereClaues = {
            joinType: 'AND',
            conditions: [],
        };

        for (const key in conditions) {
            whereClause.conditions.push({
                column: key,
                value: conditions[key],
                operator: '=',
            });
        }

        if (whereClause.conditions.length === 1) {
            return whereClause.conditions[0];
        }
        return whereClause;
    } else if (typeof args[0] === 'function') {
        // This should be a callback function
        const callback = args[0] as WhereGenerator;
        const whereClause = callback();
        return whereClause;
    }

    throw new Error('Invalid arguments');
}

function whereImplementation(state: QueryBuilderInternal, args: unknown[]) {
    const whereClause = buildWhereClause(args);

    // If the join type is the same, we can merge it together
    if (
        whereClause.joinType &&
        state.whereClauses.joinType === whereClause.joinType
    ) {
        state.whereClauses.conditions = [
            ...state.whereClauses.conditions,
            ...whereClause.conditions,
        ];
    } else {
        state.whereClauses.conditions.push(whereClause);
    }
}

abstract class IQueryBuilder {
    abstract state: QueryBuilderInternal;

    protected connection: Connection;

    constructor(connection: Connection) {
        this.connection = connection;
    }

    toQuery(): Query {
        return buildQueryString(
            this.state,
            QueryType.named,
            this.connection.dialect
        );
    }
}

function createBlankState(action: QueryBuilderAction): QueryBuilderInternal {
    return {
        action,
        whereClauses: { joinType: 'AND', conditions: [] },
        selectColumns: [],
        orderBy: [],
        columns: [],
    };
}

class QueryBuilderSelect extends IQueryBuilder {
    state: QueryBuilderInternal = createBlankState(QueryBuilderAction.SELECT);

    constructor(connection: Connection, columnNames: string[]) {
        super(connection);
        this.state.selectColumns = columnNames;
    }

    from(tableName: string) {
        this.state.table = tableName;
        return this;
    }

    select(...columName: string[]) {
        this.state.selectColumns = [...this.state.selectColumns, ...columName];
        return this;
    }

    where(conditions: Record<string, unknown>): QueryBuilderSelect;
    where(
        columName: string,
        operator: string,
        value: unknown
    ): QueryBuilderSelect;
    where(callback: WhereGenerator): QueryBuilderSelect;
    where(...args: unknown[]) {
        whereImplementation(this.state, args);
        return this;
    }

    offset(offset: number) {
        this.state.offset = offset;
        return this;
    }

    limit(limit: number) {
        this.state.limit = limit;
        return this;
    }

    orderBy(columnName: string, direction: 'ASC' | 'DESC' = 'ASC') {
        this.state.orderBy.push({ columnName, direction });
        return this;
    }
}

class QueryBuilderInsert extends IQueryBuilder {
    state: QueryBuilderInternal = createBlankState(QueryBuilderAction.INSERT);

    constructor(connection: Connection, data: Record<string, unknown>) {
        super(connection);
        this.state.data = data;
    }

    into(tableName: string) {
        this.state.table = tableName;
        return this;
    }
}

class QueryBuilderUpdate extends IQueryBuilder {
    state: QueryBuilderInternal = createBlankState(QueryBuilderAction.UPDATE);

    constructor(connection: Connection, data: Record<string, unknown>) {
        super(connection);
        this.state.data = data;
    }

    into(tableName: string) {
        this.state.table = tableName;
        return this;
    }

    where(conditions: Record<string, unknown>): QueryBuilderUpdate;
    where(
        columName: string,
        operator: string,
        value: unknown
    ): QueryBuilderUpdate;
    where(callback: WhereGenerator): QueryBuilderUpdate;
    where(...args: unknown[]) {
        whereImplementation(this.state, args);
        return this;
    }
}

class QueryBuilderCreateTable extends IQueryBuilder {
    state: QueryBuilderInternal = createBlankState(
        QueryBuilderAction.CREATE_TABLE
    );

    constructor(connection: Connection, tableName: string) {
        super(connection);
        this.state.table = tableName;
    }

    column(
        columnName: string,
        type: string,
        options?: { nullable?: boolean; default?: string; primaryKey?: boolean }
    ) {
        this.state.columns.push({
            name: columnName,
            type,
            nullable: true, // Most database when creating a table, the column is nullable by default
            ...options,
        });
        return this;
    }
}

class QueryBuilder {
    connection: Connection;

    constructor(connection: Connection) {
        this.connection = connection;
    }

    select(...columnName: string[]) {
        return new QueryBuilderSelect(this.connection, columnName);
    }

    insert(data: Record<string, unknown>) {
        return new QueryBuilderInsert(this.connection, data);
    }

    update(data: Record<string, unknown>) {
        return new QueryBuilderUpdate(this.connection, data);
    }

    createTable(tableName: string) {
        return new QueryBuilderCreateTable(this.connection, tableName);
    }

    or(
        ...args: (WhereClaues | WhereCondition | WhereGenerator)[]
    ): WhereGenerator {
        return () => ({
            joinType: 'OR',
            conditions: args.map((arg) => {
                if (typeof arg === 'function') {
                    return arg();
                }
                return arg;
            }),
        });
    }

    and(
        ...args: (WhereClaues | WhereCondition | WhereGenerator)[]
    ): WhereGenerator {
        return () => ({
            joinType: 'AND',
            conditions: args.map((arg) => {
                if (typeof arg === 'function') {
                    return arg();
                }
                return arg;
            }),
        });
    }

    where(conditions: Record<string, unknown>): WhereClaues | WhereCondition;
    where(columName: string, operator: string, value: unknown): WhereCondition;
    where(...args: unknown[]): WhereClaues | WhereCondition {
        return buildWhereClause(args);
    }
}

export function Outerbase(connection: Connection) {
    return new QueryBuilder(connection);
}

function buildQueryString(
    queryBuilder: QueryBuilderInternal,
    queryType: QueryType,
    dialect: AbstractDialect
): Query {
    const query: Query = {
        query: '',
        parameters: queryType === QueryType.named ? {} : [],
    };

    switch (queryBuilder.action) {
        case QueryBuilderAction.SELECT:
            return dialect.select(queryBuilder);
            break;
        case QueryBuilderAction.INSERT:
            query.query = dialect.insert(queryBuilder).query;
            query.parameters = dialect.insert(queryBuilder).parameters;
            break;
        case QueryBuilderAction.UPDATE:
            query.query = dialect.update(queryBuilder).query;
            query.parameters = dialect.update(queryBuilder).parameters;
            break;
        // case QueryBuilderAction.DELETE:
        //     query.query = dialect.delete(queryBuilder, queryType, query).query;
        //     query.parameters = dialect.delete(
        //         queryBuilder,
        //         queryType,
        //         query
        //     ).parameters;
        //     break;
        case QueryBuilderAction.CREATE_TABLE:
            return dialect.createTable(queryBuilder);
        // case QueryBuilderAction.DELETE_TABLE:
        //     query.query = dialect.dropTable(
        //         queryBuilder,
        //         queryType,
        //         query
        //     ).query;
        //     break;
        // case QueryBuilderAction.RENAME_TABLE:
        //     query.query = dialect.renameTable(
        //         queryBuilder,
        //         queryType,
        //         query
        //     ).query;
        //     break;

        // case QueryBuilderAction.ADD_COLUMNS:
        //     query.query = dialect.addColumn(
        //         queryBuilder,
        //         queryType,
        //         query
        //     ).query;
        //     break;
        // case QueryBuilderAction.DROP_COLUMNS:
        //     query.query = dialect.dropColumn(
        //         queryBuilder,
        //         queryType,
        //         query
        //     ).query;
        //     break;
        // case QueryBuilderAction.RENAME_COLUMNS:
        //     query.query = dialect.renameColumn(
        //         queryBuilder,
        //         queryType,
        //         query
        //     ).query;
        //     break;
        // case QueryBuilderAction.UPDATE_COLUMNS:
        //     query.query = dialect.updateColumn(
        //         queryBuilder,
        //         queryType,
        //         query
        //     ).query;
        //     break;
        default:
            throw new Error('Invalid action');
    }

    return query;
}
