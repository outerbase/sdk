// Database consists of an array of schemas
export type Database = Schema[]

// Schema consists of a name and an array of tables
export type Schema = Record<string, Table[]>

// Table consists of a name, schema, an array of columns, and an array of indexes
export type Table = {
    name: string
    schema?: string
    columns: TableColumn[]
    indexes: TableIndex[]
    constraints: Constraint[]
}

export type ConstraintColumn = {
    columnName: string
    constraintName: string
    constraintSchema: string
    tableName: string
    tableSchema: string
}

export type Constraint = {
    name: string
    schema: string
    tableName: string
    type: string
    columns: ConstraintColumn[]
}

export type TableColumn = {
    name: string
    type: string

    position: number

    nullable: boolean
    default: any
    primary: boolean
    unique: boolean

    // expression: string
    references: TableReference[]
}

export type TableReference = {
    // Unique name of the reference key for the database to use
    name: string
    // The table that the reference is pointing to
    table: string
    // The column that the reference is pointing to
    column: string
}

export type TableRecord = Record<string, any>
export type TableCondition = {
    column: string
    value: any
    // condition: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'in' | 'nin'
}

export enum TableIndexType {
    PRIMARY = 'primary',
    UNIQUE = 'unique',
    INDEX = 'index',
}
export type TableIndex = {
    name: string
    type: TableIndexType
    columns: string[]
}
