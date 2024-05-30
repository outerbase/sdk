import { Connection } from "src/connections";
import { Outerbase, equals } from "../client";
import { getColumnValueFromName, getColumnValueFromProperty, getPrimaryKeys } from "./decorators";

const RESERVED_PROPERTIES = ['_name', '_schema', '_original', '_connection'];

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

    getCurrentValues(_: { omitPrimaryKeys: boolean }): Record<string, any> {
        if (!this._original) {
            throw new Error('Original data not found');
        }

        const columns = Object.keys(this).filter((key) => {
            if (RESERVED_PROPERTIES.includes(key)) {
                return false;
            }

            if (_.omitPrimaryKeys) {
                const primaryKeys = getPrimaryKeys(this.constructor);
                if (primaryKeys?.length > 0) {
                    return !primaryKeys.includes(key);
                }
            }

            return true;
        });

        let object: Record<string, any> = {};
        columns.forEach((key) => {
            const columnName = getColumnValueFromProperty(this.constructor, key);

            if (columnName) {
                object[columnName] = this._original?.[columnName];
                console.log(columnName + ' = ' + this._original?.[columnName])
            }
        });

        return object;
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
    async pull(): Promise<void> {
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

        // The response from the query builder call above is an array of results
        // that match the query. We only want the first result.
        this._original = data[0];

        for (let key in this._original) {
            if (typeof this._original[key] === 'function') {
                continue;
            }

            // If `key` is any of the reserved properties, we skip it.
            if (RESERVED_PROPERTIES.includes(key)) {
                continue;
            }

            const preparedKey = this.stringToCamelCase(key) ?? '';
            for (let prop in this) {
                if (prop === preparedKey) {
                    this[prop] = this._original[key];
                }
            }
        }

        return;
    }

    async delete(): Promise<any> {
        if (!this._connection) {
            throw new Error('Connection not attached');
        }

        const conditions = this.getCurrentWhereClause();
        const db = Outerbase(this._connection)

        const { data } = await db
            .deleteFrom(this._name)
            .where(conditions)
            .query()

        return data;
    }

    async update(): Promise<any> {
        if (!this._connection) {
            throw new Error('Connection not attached');
        }

        const conditions = this.getCurrentWhereClause();
        const db = Outerbase(this._connection)
        const currentValues = this.getCurrentValues({ omitPrimaryKeys: true });

        let { data } = await db
            .update(currentValues)
            .into(this._name)
            .where(conditions)
            .query();

        // Update the original data with the new data
        this._original = {
            ...this._original,
            ...currentValues
        };

        return data;
    }

    async insert(): Promise<any> {
        if (!this._connection) {
            throw new Error('Connection not attached');
        }

        const db = Outerbase(this._connection)

        let { data } = await db
            .insert(this.getCurrentValues({ omitPrimaryKeys: true }))
            .into(this._name)
            .returning(['*'])
            .query();

        return data;
    }
}
