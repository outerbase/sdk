export type Schema = {
    name: string
    tables: Table[]
}

export type Table = {
    name: string
    schema: string
    columns: TableColumn[]
    indexes: {
        name: string
        type: 'unique' | 'primary' | 'index'
        columns: string[]
    }[]
}

export type TableColumn = {
    name: string
    type: string
    nullable: boolean
    default: any
    primary: boolean
    unique: boolean
    expression: string
    references: TableIndex[]
}

export type TableRecord = Record<string, any>
export type TableCondition = {
    column: string
    value: any
    condition: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'in' | 'nin'
}

export type TableIndex = {
    name: string
    type: 'unique' | 'primary' | 'index'
    columns: string[]
}