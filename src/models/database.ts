type SchemaName = string;
export type Database = Record<SchemaName, Schema>;

type TableName = string;
export type Schema = Record<TableName, Table>;

export type Table = {
    name: string;
    columns: TableColumn[];
    indexes: TableIndex[];
    constraints: Constraint[];
};

export type ConstraintColumn = {
    columnName: string;
    referenceColumnName?: string;
};

export type Constraint = {
    name: string;
    schema: string;
    tableName: string;
    type: string;
    referenceTableName?: string;
    referenceSchema?: string;
    columns: ConstraintColumn[];
};

export interface TableColumn {
    name: string;
    position?: number;
    definition: TableColumnDefinition;
}

export type TableReference = {
    table: string;
    column: string;
};

export type TableRecord = Record<string, any>;
export type TableCondition = {
    column: string;
    value: any;
    // condition: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'in' | 'nin'
};

export enum TableIndexType {
    PRIMARY = 'primary',
    UNIQUE = 'unique',
    INDEX = 'index',
}
export type TableIndex = {
    name: string;
    type: TableIndexType;
    columns: string[];
};

// This definition is trying to fit all database providers
// - MySQL:      https://dev.mysql.com/doc/refman/8.4/en/create-table.html
// - Sqlite:     https://www.sqlite.org/lang_createtable.html
// - PostgreSQL: https://www.postgresql.org/docs/current/sql-createtable.html
// - Motherduck: https://duckdb.org/docs/sql/statements/create_table.html
// - SQL Server: https://learn.microsoft.com/en-us/sql/t-sql/statements/create-table-transact-sql?view=sql-server-ver16
export interface TableColumnDefinition extends TableColumnConstraint {
    type: string;

    // An invisible column is normally hidden to queries,
    // but can be accessed if explicitly referenced
    // Supported: MySQL
    invisible?: boolean;

    // In MySQL: DISK, MEMORY
    // In PostgreSQL: PLAIN, EXTERNAL, EXTENDED, MAIN, DEFAULT
    storage?: boolean;

    // PostgreSQL: pglz, lz4, default
    compression?: string;

    // Other
    collate?: string;
    comment?: string;
}

export interface TableColumnConstraint {
    nullable?: boolean;
    nullConflict?: string;

    // Default value
    default?: string | null;
    defaultExpression?: string;
    autoIncrement?: boolean;

    // Column Constraints
    constraintName?: string;

    unique?: boolean;
    uniqueConflict?: string;

    primaryKey?: boolean;
    primaryKeyConflict?: string;
    primaryKeyOrder?: string;

    references?: TableReferenceDefinition;
    checkExpression?: string;

    // Generative columns
    generatedExpression?: string;
    generatedType?: 'VIRTUAL' | 'STORED';
}

export interface TableReferenceDefinition {
    table: string;
    column: string[];
    match?: string;
    onDelete?: string;
    onUpdate?: string;
}
