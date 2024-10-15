import { QueryType } from '../query-params';
import { Query, constructRawQuery } from '../query';
import { Connection, ConnectionSelectOptions, QueryResult } from './index';
import {
    Database,
    Table,
    TableColumn,
    TableIndex,
    TableIndexType,
} from '../models/database';

import { MongoClient, Db, Document, Collection, ObjectId } from 'mongodb';
import { PostgresDialect } from 'src/query-builder/dialects/postgres';
// import { MongoDialect } from '../query-builder/dialects/mongo'

function isValidObjectId(value: string) {
    return /^[a-f\d]{24}$/i.test(value); // Check if it's a valid ObjectId string format
}

function convertToObjectId(obj: any): any {
    if (Array.isArray(obj)) {
        // If the value is an array, recursively convert each element
        return obj.map((item) => convertToObjectId(item));
    } else if (typeof obj === 'object' && obj !== null) {
        // If it's an object, recursively check each key-value pair
        for (const key in obj) {
            if (typeof obj[key] === 'string' && isValidObjectId(obj[key])) {
                obj[key] = new ObjectId(obj[key]); // Convert valid ObjectId strings
            } else {
                // Recursively convert nested objects/arrays
                obj[key] = convertToObjectId(obj[key]);
            }
        }
    }
    return obj;
}

type MongoDBParameters = {
    uri: string;
    username: string;
    password: string;
    dbName: string;
};

function parseArguments(args: string) {
    const balancedArgs: string[] = [];
    let bracketLevel = 0;
    let currentArg = '';

    for (let i = 0; i < args.length; i++) {
        const char = args[i];

        // Handle opening and closing brackets
        if (char === '{' || char === '[') bracketLevel++;
        if (char === '}' || char === ']') bracketLevel--;

        // Split arguments by commas, but only at the top level (bracketLevel === 0)
        if (char === ',' && bracketLevel === 0) {
            balancedArgs.push(currentArg.trim());
            currentArg = '';
        } else {
            currentArg += char;
        }
    }

    // Push the last argument if it exists
    if (currentArg.trim()) {
        balancedArgs.push(currentArg.trim());
    }

    return balancedArgs.map((arg) => JSON.parse(arg));
}
export class MongoDBConnection implements Connection {
    client: MongoClient;
    defaultDatabase: string;

    constructor(client: MongoClient, defaultDatabase: string) {
        this.client = client;
        this.defaultDatabase = defaultDatabase;
    }

    async connect(): Promise<any> {
        if (!this.client) {
            throw new Error('MongoClient not initialized.');
        }
        await this.client.connect();
    }

    async disconnect(): Promise<any> {
        return this.client.close();
    }

    async renameColumn(
        schemaName: string | undefined,
        tableName: string,
        columnName: string,
        newColumnName: string
    ): Promise<QueryResult> {
        await this.client
            .db(schemaName ?? this.defaultDatabase)
            .collection(tableName)
            .updateMany({}, { $rename: { [columnName]: newColumnName } });

        return { error: null, data: [], query: '' };
    }

    async insert(
        schemaName: string | undefined,
        tableName: string,
        data: Record<string, unknown>
    ): Promise<QueryResult> {
        await this.client
            .db(schemaName ?? this.defaultDatabase)
            .collection(tableName)
            .insertOne(data);

        return { error: null, data: [], query: '' };
    }

    async insertMany(
        schemaName: string | undefined,
        tableName: string,
        data: Record<string, unknown>[]
    ): Promise<QueryResult> {
        await this.client
            .db(schemaName ?? this.defaultDatabase)
            .collection(tableName)
            .insertMany(data);

        return { error: null, data: [], query: '' };
    }

    async update(
        schemaName: string | undefined,
        tableName: string,
        data: Record<string, unknown>,
        where: Record<string, unknown>
    ): Promise<QueryResult> {
        await this.client
            .db(schemaName ?? this.defaultDatabase)
            .collection(tableName)
            .updateMany(where, { $set: data });

        return { error: null, data: [], query: '' };
    }

    async select(
        schemaName: string,
        tableName: string,
        options: ConnectionSelectOptions
    ): Promise<QueryResult> {
        // Map our condition to MongoDB's query format
        const filter = (options.where ?? []).reduce(
            (acc, condition) => {
                if (condition.operator === '=') {
                    acc[condition.name] = condition.value;
                } else if (condition.operator === '>') {
                    acc[condition.name] = { $gt: condition.value };
                } else if (condition.operator === '<') {
                    acc[condition.name] = { $lt: condition.value };
                } else if (condition.operator === '>=') {
                    acc[condition.name] = { $gte: condition.value };
                } else if (condition.operator === '<=') {
                    acc[condition.name] = { $lte: condition.value };
                }

                return acc;
            },
            {} as Record<string, unknown>
        );

        const query = this.client
            .db(schemaName ?? this.defaultDatabase)
            .collection(tableName)
            .find(filter)
            .skip(options.offset)
            .limit(options.limit);

        if (options.orderBy) {
            const sort = options.orderBy.reduce(
                (acc, order) => {
                    if (typeof order === 'string') {
                        acc[order] = 1;
                        return acc;
                    }

                    acc[order[0]] = order[1] === 'ASC' ? 1 : -1;
                    return acc;
                },
                {} as Record<string, -1 | 1>
            );

            query.sort(sort);
        }

        const data = await query.toArray();

        return { error: null, data, query: '' };
    }

    async createTable(): Promise<QueryResult> {
        // Mongodb does not have a schema, so we can't create a table
        return { error: null, data: [], query: '' };
    }

    async dropTable(
        schemaName: string | undefined,
        tableName: string
    ): Promise<QueryResult> {
        await this.client
            .db(schemaName ?? this.defaultDatabase)
            .collection(tableName)
            .drop();

        return { error: null, data: [], query: '' };
    }

    public async fetchDatabaseSchema(): Promise<Database> {
        const collections = await this.client
            .db(this.defaultDatabase)
            .listCollections()
            .toArray();

        const tableList: Record<string, Table> = {};

        for (const collectionInfo of collections) {
            const collectionName = collectionInfo.name;

            const collection = this.client
                .db(this.defaultDatabase)
                .collection(collectionName);

            const indexes = await collection.indexes();

            // Since MongoDB is schemaless, we sample a document to infer the schema
            const sampleDocument = await collection.findOne();
            const columns: TableColumn[] = [];

            if (sampleDocument) {
                let position = 0;
                for (const [fieldName, value] of Object.entries(
                    sampleDocument
                )) {
                    const column: TableColumn = {
                        name: fieldName,
                        type: typeof value,
                        position: position++,
                        nullable: true,
                        default: null,
                        primary: fieldName === '_id',
                        unique: fieldName === '_id',
                        references: [],
                    };
                    columns.push(column);
                }
            }

            const tableIndexes: TableIndex[] = indexes.map((index) => ({
                name: index.name ?? '',
                type: index.unique
                    ? TableIndexType.UNIQUE
                    : TableIndexType.INDEX,
                columns: Object.keys(index.key),
            }));

            const currentTable: Table = {
                name: collectionName,
                columns: columns,
                indexes: tableIndexes,
                constraints: [], // Constraints are not used in MongoDB
            };

            tableList[collectionName] = currentTable;
        }

        return {
            [this.defaultDatabase]: tableList,
        };
    }
}
