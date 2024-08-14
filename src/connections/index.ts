import { QueryType } from '../query-params'
import { Query } from '../query'
import { Schema, TableColumn, TableCondition, TableIndex, TableRecord } from 'src/models/database'

export type OperationResponse = {
    success: boolean
    data: any
    error: Error | null
}

export interface Connection {
    queryType: QueryType

    // Handles logic for securely connecting and properly disposing of the connection.
    connect: () => Promise<any>
    disconnect: () => Promise<any>

    // Raw query execution method that can be used to execute any query.
    query: (
        query: Query
    ) => Promise<{ data: any; error: Error | null; query: string }>

    // Basic CRUD methods that allow for easy interaction with the connection.
    insert?: (record: TableRecord, table: string, schema?: string) => Promise<OperationResponse>
    read?: (conditions: TableCondition[], table: string, schema?: string) => Promise<OperationResponse>
    update?: (record: TableRecord, conditions: TableCondition[], table: string, schema?: string) => Promise<OperationResponse>
    delete?: (conditions: TableCondition[], table: string, schema?: string) => Promise<OperationResponse>

    // Table operations
    createTable?: (name: string, schema?: string) => Promise<OperationResponse>
    dropTable?: (name: string, schema?: string) => Promise<OperationResponse>
    renameTable?: (name: string, original: string, schema?: string) => Promise<OperationResponse>

    // Column operations
    addColumn?: (name: string, table: string, schema?: string) => Promise<OperationResponse>
    dropColumn?: (name: string, table: string, schema?: string) => Promise<OperationResponse>
    renameColumn?: (name: string, original: string, table: string, schema?: string) => Promise<OperationResponse>
    updateColumn?: (name: string, column: TableColumn, table: string, schema?: string) => Promise<OperationResponse>

    // Index operations
    createIndex?: (index: TableIndex, table: string, schema?: string) => Promise<OperationResponse>
    dropIndex?: (name: string, table: string, schema?: string) => Promise<OperationResponse>
    renameIndex?: (name: string, original: string, table: string, schema?: string) => Promise<OperationResponse>

    // Schema operations
    createSchema?: (name: string) => Promise<OperationResponse>
    dropSchema?: (name: string) => Promise<OperationResponse>

    // Additional operations
    fetchDatabaseSchema?: () => Promise<Schema[]>
}
