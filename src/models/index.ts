import { Connection } from "src/connections";
import { Outerbase, OuterbaseType, equals } from "../client";
import { getColumnValueFromName, getPrimaryKeys } from "./decorators";

export class BaseTable {
    _name: string;
    _schema?: string;
    _original?: Record<string, any>;
    _connection?: Connection;

    constructor(_: {
        _name: string,
        _schema?: string,
        _original?: Record<string, any>
    }) {
        this._name = _._name;
        this._schema = _._schema;
        this._original = _._original;
    }

    attachConnection(connection: Connection) {
        this._connection = connection;
    }

    getCurrentWhereClause(): string[] {
        if (!this._original) {
            throw new Error('Original data not found');
        }

        const primaryKeys = getPrimaryKeys(this.constructor);

        if (primaryKeys?.length === 0) {
            throw new Error('No primary keys found');
        }

        return primaryKeys.map((key) => {
            return equals(key, this._original?.[getColumnValueFromName(this.constructor, key)]);
        });
    }

    stringToCamelCase(str: string) {
        return str?.replace(/[-_](.)/g, (_, c) => c?.toUpperCase())
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

        const conditions = this.getCurrentWhereClause();
        const db = Outerbase(this._connection)

        let { data } = await db
            .selectFrom([
                { schema: this._schema, table: this._name, columns: ['*'] },
            ])
            .where(conditions)
            .limit(1)
            .query()
        
        data = data[0]

        // Set the `data` object to the `_original` property
        this._original = data;

        // TODO: Set all the properties of the `data` object to the current instance
        // Set all the properties of the `data` object to the current instance
        // Object.assign(this, data);

        // Iterate through all properties of this class
        for (let key in this) {
            // If the property is a function, skip
            if (typeof this[key] === 'function') {
                continue;
            }

            if (key === '_name' || key === '_schema' || key === '_original' || key === '_connection') {
                continue;
            }

            // If the property is not in the data object, skip
            // if (!data[key]) {
            //     continue;
            // }

            // Set the property to the value from the data object
            // console.log('Data: ', data)
            // console.log('Setting', key, 'to', data[this.stringToCamelCase(key)])
            this[key] = data[this.stringToCamelCase(key)];
        }

        console.log('This: ', this)

        return;
    }

    async delete() {
        if (!this._connection) {
            throw new Error('Connection not attached');
        }

        const conditions = this.getCurrentWhereClause();
        const db = Outerbase(this._connection)

        const { data } = await db
            .deleteFrom(this._name)
            .where(conditions)
            .query()
    }
}
