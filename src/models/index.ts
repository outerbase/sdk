import { OuterbaseType, equals, equalsNumber } from "../client";
import { getPrimaryKey, isColumn, metadataRegistry } from "./decorators";

export class BaseTable {
    _name: string;
    _schema?: string;

    constructor(_: {
        _name: string,
        _schema?: string
    }) {
        this._name = _._name;
        this._schema = _._schema;
    }

    async insert(connection: OuterbaseType) {
        const metadata = metadataRegistry.get(this.constructor);
        if (!metadata) {
            throw new Error('Metadata not found for class');
        }

        const columns = metadata.columns;

        let valueMap: Record<string, any> = {};

        for (const column in columns) {
            if (this.hasOwnProperty(column) && isColumn(this.constructor, column)) {
                valueMap[columns[column].name] = this[column];
            }
        }

        // TODO: Needs to support schemas
        const { data } = await connection
            .insert(valueMap)
            .in(this._name)
            .query();

        return data
    }

    async delete(connection: OuterbaseType) {
        let whereClause = this.createWhereClauses()

        let { data } = await connection
            .deleteFrom(this._name)
            .where(whereClause)
            .query();

        return data
    }

    protected createWhereClauses() {
        let primaryKey = getPrimaryKey(this.constructor)

        // TODO: Currently a limitation of the system that a primary key
        // must exist to delete a record. In the future we should allow
        // for when no primary key columns exist, to instead construct a 
        // WHERE clause that includes all of the columns and their existing
        // values of this object.
        if (!primaryKey) {
            throw new Error('Primary key is required to delete a record')
        }

        let whereClause = equals(primaryKey, this[primaryKey])
        if (typeof this[primaryKey] === 'number') {
            whereClause = equalsNumber(primaryKey, this[primaryKey])
        }

        return whereClause
    }
}
