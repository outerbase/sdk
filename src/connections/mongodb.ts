import { QueryType } from '../query-params';
import { Query, constructRawQuery } from '../query';
import { Connection } from './index';
import {
    Database,
    Table,
    TableColumn,
    TableIndex,
    TableIndexType,
} from '../models/database';

import {
    MongoClient,
    Db,
    Document,
    FindCursor,
    Collection,
    ObjectId,
} from 'mongodb';
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
    client: MongoClient | undefined;
    db: Db | undefined;

    queryType = QueryType.positional;

    dialect = new PostgresDialect();

    constructor(private _: MongoDBParameters) {
        this.client = new MongoClient(_.uri, {
            auth: {
                username: _.username,
                password: _.password,
            },
            authMechanism: 'SCRAM-SHA-1',
        });
    }

    /**
     * Performs a connect action on the current Connection object.
     *
     * @returns Promise<any>
     */
    async connect(): Promise<any> {
        if (!this.client) {
            throw new Error('MongoClient not initialized.');
        }

        await this.client.connect();
        this.db = this.client.db(this._.dbName);
    }

    /**
     * Performs a disconnect action on the current Connection object.
     *
     * @returns Promise<any>
     */
    async disconnect(): Promise<any> {
        return this.client?.close();
    }

    renameColumn(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    /**
     * Triggers a query action on the current Connection object.
     *
     * The parameters object is sent along with the query to be used in the
     * query. By default if the query has parameters the SQL statement will
     * produce a string with `?::[DataType]` values that the parameters object
     * keys should map to, and will be replaced by.
     *
     * @param query - The query to be executed.
     * @returns Promise<{ data: any, error: Error | null, query: string }>
     */
    async query(
        query: Query
    ): Promise<{ data: any; error: Error | null; query: string }> {
        const db = this.db;
        if (!db) throw new Error('No MongoDB connection was found.');

        let result = null;
        let error = null;
        let rawSQL = null;

        try {
            const { res } = await this.runQuery(query.query);
            rawSQL = constructRawQuery(query);
            result = res;
        } catch (e) {
            error = e instanceof Error ? e : new Error(String(e));
            rawSQL = constructRawQuery(query);
        }

        return {
            data: result,
            error: error,
            query: rawSQL,
        };
    }

    public async fetchDatabaseSchema(): Promise<Database> {
        if (!this.db) throw new Error('No MongoDB connection was found.');

        const collections = await this.db.listCollections().toArray();

        const schemaMap: Record<string, Record<string, Table>> = {};

        for (const collectionInfo of collections) {
            const collectionName = collectionInfo.name;
            const collection = this.db.collection(collectionName);
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

            // Use the database name as the schema
            const schemaName = this._.dbName;

            if (!schemaMap[schemaName]) {
                schemaMap[schemaName] = {};
            }

            schemaMap[schemaName][collectionName] = currentTable;
        }

        return schemaMap;
    }

    runQuery = async (query: string): Promise<{ stmt: string; res: any[] }> => {
        if (!this.db) throw new Error('No MongoDB connection was found.');
        let statement = '';

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

            statement = `db.${command}`;

            // Dynamically run the command with arguments
            const commandName = command.split('(')[0];

            const result = await this.db.command({ [commandName]: parsedArgs });
            const isBatch = result?.cursor?.firstBatch;
            if (isBatch) {
                return { stmt: statement, res: result.cursor.firstBatch };
            }
            return { stmt: statement, res: [result] };
        }

        const [db, collectionNameFromQuery, ...otherCalls] = parts;
        statement = `db.${collectionNameFromQuery}`;

        if (db !== 'db') throw new Error('Query must begin with db');

        const collectionExists = (
            await this.db.listCollections().toArray()
        ).some((c) => c.name === collectionNameFromQuery);
        if (!collectionExists)
            throw new Error(
                `Collection ${collectionNameFromQuery} does not exist.`
            );
        const collection = this.db.collection(collectionNameFromQuery);

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
                statement += `.${methodName}(${processedArgs})`;
            } else {
                throw new Error(
                    `Method ${methodName} is not a valid function on the cursor.`
                );
            }
        });
        let c = cursor as any;
        try {
            const result = await c.toArray();
            return { stmt: statement, res: result };
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

            return { stmt: statement, res: result };
        }
    };
}
