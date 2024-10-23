import { Connection, ConnectionSelectOptions, QueryResult } from './index';
import {
    Database,
    Table,
    TableColumn,
    TableIndex,
    TableIndexType,
} from '../models/database';

import {
    Collection,
    FindCursor,
    MongoClient,
    ObjectId,
    WithId,
    Document,
} from 'mongodb';
import {
    createErrorResult,
    createOkResult,
    transformObjectBasedResult,
} from './../utils/transformer';
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

    constructor(client: any, defaultDatabase: string) {
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

    raw(query: string): Promise<QueryResult> {
        return this.runQuery(query);
    }

    async testConnection(): Promise<{ error?: string }> {
        try {
            await this.connect();
            await this.disconnect();
            return {};
        } catch {
            return { error: 'Failed to connect to MongoDB' };
        }
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

        return createOkResult();
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

        return createOkResult();
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

        return createOkResult();
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

        return createOkResult();
    }

    async delete(
        schemaName: string | undefined,
        tableName: string,
        where: Record<string, unknown>
    ): Promise<QueryResult> {
        await this.client
            .db(schemaName ?? this.defaultDatabase)
            .collection(tableName)
            .deleteMany(where);

        return createOkResult();
    }

    async dropColumn(): Promise<QueryResult> {
        return createOkResult();
    }

    async select(
        schemaName: string,
        tableName: string,
        options: ConnectionSelectOptions
    ): Promise<QueryResult> {
        // Map our condition to MongoDB's query format
        const filter = (options.where ?? []).reduce(
            (acc, condition) => {
                let value = condition.value;
                if (condition.name === '_id' && typeof value === 'string')
                    value = new ObjectId(value);

                if (condition.operator === '=') {
                    acc[condition.name] = value;
                } else if (condition.operator === '>') {
                    acc[condition.name] = { $gt: value };
                } else if (condition.operator === '<') {
                    acc[condition.name] = { $lt: value };
                } else if (condition.operator === '>=') {
                    acc[condition.name] = { $gte: value };
                } else if (condition.operator === '<=') {
                    acc[condition.name] = { $lte: value };
                }

                return acc;
            },
            {} as Record<string, unknown>
        );

        const query = this.client
            .db(schemaName ?? this.defaultDatabase)
            .collection(tableName)
            .find(filter);

        if (options.offset) {
            query.skip(options.offset);
        }

        if (options.limit) {
            query.limit(options.limit);
        }

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

        let count: number | undefined = undefined;
        if (options.includeCounting) {
            if (!options.where) {
                count = await this.client
                    .db(schemaName ?? this.defaultDatabase)
                    .collection(tableName)
                    .estimatedDocumentCount();
            }
        }

        const data = await query.toArray();
        return { ...this.transformResult(data), count };
    }

    transformResult(data: (WithId<Document> | Document)[]) {
        return {
            ...transformObjectBasedResult(
                data.map((row) => {
                    return { ...row, _id: row._id.toString() };
                })
            ),
            count: data.length,
        };
    }

    async createTable(): Promise<QueryResult> {
        // Mongodb does not have a schema, so we can't create a table
        return createOkResult();
    }

    async dropTable(
        schemaName: string | undefined,
        tableName: string
    ): Promise<QueryResult> {
        await this.client
            .db(schemaName ?? this.defaultDatabase)
            .collection(tableName)
            .drop();

        return createOkResult();
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
                        definition: {
                            type: typeof value,
                            nullable: true,
                            default: null,
                            primaryKey: fieldName === '_id',
                            unique: fieldName === '_id',
                        },
                        position: position++,
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

    async addColumn(): Promise<QueryResult> {
        // Do nothing, MongoDB does not have a schema
        return createOkResult();
    }

    async alterColumn(): Promise<QueryResult> {
        // Do nothing, MongoDB does not have a schema
        return createOkResult();
    }

    async renameTable(
        schemaName: string | undefined,
        tableName: string,
        newTableName: string
    ): Promise<QueryResult> {
        await this.client
            .db(schemaName ?? this.defaultDatabase)
            .collection(tableName)
            .rename(newTableName);

        return createOkResult();
    }

    runQuery = async (query: string): Promise<QueryResult> => {
        const currentDatabase = this.client.db(this.defaultDatabase);

        const parts = query.split('.');
        const isDBCommand = parts.length === 2;

        if (isDBCommand) {
            const [dbName, command] = parts;
            if (dbName !== 'db') throw new Error('Query must begin with db');

            // Extract the command and arguments dynamically
            const commandArgs = command.match(/\(([^)]+)\)/)?.[1] ?? '';
            const parsedArgs = commandArgs
                ? JSON.parse(`[${commandArgs}]`)
                : [];

            // Dynamically run the command with arguments
            const commandName = command.split('(')[0];

            const result = await currentDatabase.command({
                [commandName]: parsedArgs,
            });

            const isBatch = result?.cursor?.firstBatch;
            if (isBatch) {
                return createOkResult();
            }

            return this.transformResult([result]);
        }

        const [db, collectionNameFromQuery, ...otherCalls] = parts;

        if (db !== 'db') throw new Error('Query must begin with db');

        const collectionExists = (
            await currentDatabase.listCollections().toArray()
        ).some((c) => c.name === collectionNameFromQuery);

        if (!collectionExists)
            throw new Error(
                `Collection ${collectionNameFromQuery} does not exist.`
            );
        const collection = currentDatabase.collection(collectionNameFromQuery);

        let cursor = collection;

        otherCalls.forEach(async (call) => {
            const methodName = call.match(
                /^[a-zA-Z]+/
            )?.[0] as keyof Collection<Document>;
            const argsString = call.match(/\((.*)\)/)?.[1];

            // Only process string method names
            if (typeof methodName !== 'string') {
                throw new Error(
                    `${String(methodName)} is not a valid cursor method.`
                );
            }

            const actualArgs = parseArguments(argsString ?? '');

            // Convert valid ObjectId _strings_ to actual ObjectId instances
            const processedArgs = actualArgs.map((arg) =>
                convertToObjectId(arg)
            );

            if (
                methodName in cursor &&
                typeof cursor[methodName] === 'function'
            ) {
                cursor = (cursor[methodName] as any)(...processedArgs);
            } else {
                throw new Error(
                    `Method ${methodName} is not a valid function on the cursor.`
                );
            }
        });
        let c = cursor as any;
        try {
            const result = await (c as FindCursor).toArray();
            return this.transformResult(result);
        } catch {
            const result = await c;
            try {
                JSON.stringify(result);
            } catch (e) {
                // Converting circular structure to JSON -->
                // @todo, need to find a better way to handle
                // This error rather than checking here
                throw new Error('Invalid query');
            }

            return createErrorResult('Invalid query');
        }
    };
}
