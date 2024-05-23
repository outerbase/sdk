import { OuterbaseType, equals } from "../client";
import { getColumnValueFromName, getPrimaryKeys } from "./decorators";

export class BaseTable {
    _name: string;
    _schema?: string;
    _original?: Record<string, any>;
    _connection?: OuterbaseType;

    constructor(_: {
        _name: string,
        _schema?: string,
        _original?: Record<string, any>
    }) {
        this._name = _._name;
        this._schema = _._schema;
        this._original = _._original;
    }

    attachConnection(connection: OuterbaseType) {
        this._connection = connection;
    }

    /**
     * Fetches the latest version of this model from the database.
     * When you want to make sure this model represents the latest
     * version of the data in the database, you can call this method.
     * 
     * @returns Promise<any>
     */
    async sync(): Promise<void> {
        if (!this._connection) {
            throw new Error('Connection not attached');
        }

        const primaryKeys = getPrimaryKeys(this.constructor);

        if (primaryKeys?.length === 0) {
            throw new Error('No primary keys found');
        }

        // Create WHERE clause conditions to find the record based on the available primary keys
        const conditions = primaryKeys.map((key) => {
            return equals(key, this._original?.[getColumnValueFromName(this.constructor, key)]);
        });

        let { data } = await this._connection
            .selectFrom([
                { schema: this._schema, table: this._name, columns: ['*'] },
            ])
            .where(conditions)
            .limit(1)
            // .asClass(T)
            .query()

        // Set the `data` object to the `_original` property
        this._original = data;

        return;
    }

    delete() {
        if (!this._connection) {
            throw new Error('Connection not attached');
        }

        // TODO: Implement the query builder to construct a DELETE query for this row entry
    }
}
