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

    /**
     * Attaches a connection object to the model. This enables the model to perform
     * actions on the database utilizing the query builder. See `pull`, `update`, 
     * `insert`, and `delete` methods for examples.
     * 
     * @param connection 
     */
    attachConnection(connection: Connection) {
        this._connection = connection;
    }

    /**
     * Constructs the where clause for the current model based on the primary keys.
     * This WHERE clause is used to uniquely map to this specific model in the database.
     * 
     * @returns string[]
     */
    getCurrentWhereClause(): string[] {
        if (!this._original) {
            throw new Error('Original data not found');
        }

        const primaryKeys = getPrimaryKeys(this.constructor);

        if (primaryKeys?.length === 0) {
            throw new Error('No primary keys found');
        }

        return primaryKeys.map((key) => {
            const columnValue = getColumnValueFromName(this.constructor, key)
            if (columnValue === null) return '';

            return equals(key, this._original?.[columnValue]);
        });
    }

    /**
     * Returns the current values of the model. If `omitPrimaryKeys` is true, the primary
     * keys will be omitted from the returned object. Use this to get the current values
     * of the model to be used in an update query.
     * 
     * @param _ An object with a boolean value to omit primary keys from the current values.
     * @returns Record<string, any>
     */
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

    /**
     * Converts a string to camel case. For most of the model properties, the column
     * names are usually stored in snake case in the database. This method converts
     * the snake case column names to camel case for use in the model.
     * 
     * @param str 
     * @returns string
     */
    stringToCamelCase(str: string) {
        return str?.replace(/[-_](.)/g, (_, c) => c?.toUpperCase())
    }

    /**
     * Fetches the latest version of this model from the database.
     * When you want to make sure this model represents the latest
     * version of the data in the database, you can call this method.
     * 
     * @returns Promise<void>
     */
    async pull(): Promise<void> {
        if (!this._connection) {
            throw new Error('Connection not attached');
        }

        const conditions = this.getCurrentWhereClause();
        const db = Outerbase(this._connection)

        let { data, error } = await db
            .selectFrom([
                { schema: this._schema, table: this._name, columns: ['*'] },
            ])
            .where(conditions)
            .limit(1)
            .query()

        // If an error occurs, exit early.
        if (error) return

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

    /**
     * Deletes the current model from the database. This method will delete the
     * model from the database based on the primary keys of the model.
     * 
     * @returns Promise<any>
     */
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

    /**
     * Updates the current model in the database. This method will update the
     * model in the database based on the primary keys of the model.
     * 
     * @returns Promise<any>
     */
    async update(): Promise<any> {
        if (!this._connection) {
            throw new Error('Connection not attached');
        }

        const conditions = this.getCurrentWhereClause();
        const db = Outerbase(this._connection)
        const currentValues = this.getCurrentValues({ omitPrimaryKeys: true });

        let { data, error } = await db
            .update(currentValues)
            .into(this._name)
            .where(conditions)
            .query();

        // Update the original data with the new data
        if (!error) {
            this._original = {
                ...this._original,
                ...currentValues
            };
        }

        return data;
    }

    /**
     * Inserts the current model into the database. This method will insert the
     * model into the database.
     * 
     * @returns Promise<any>
     */
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
