type SchemaName = string
export type Database = Record<SchemaName, Schema>

type TableName = string
export type Schema = Record<TableName, Table>

export type Table = {
    name: string
    columns: TableColumn[]
    indexes: TableIndex[]
    constraints: Constraint[]
}

export type ConstraintColumn = {
    columnName: string
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
    default: string | null
    primary: boolean
    unique: boolean
    references: TableReference[]
}

export type TableReference = {
    table: string
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
