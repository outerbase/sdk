/**
 * A registry of metadata for classes decorated with the @Entity decorator.
 * The metadata is stored as a Map where the key is the class constructor and 
 * the value is an object with the following properties:
 * - columns: an object where the keys are property keys and the values are objects with column options
 * - primaryKey: the property key of the primary key column
 * @type {Map<Function, any>}
 */
export const metadataRegistry = new Map<Function, any>();

export function Column(options?: { 
    unique?: boolean, 
    primary?: boolean, 
    nullable?: boolean, 
    name?: string,
    relation?: any
}): PropertyDecorator {
    return function(target: any, propertyKey: string | symbol): void {
        const constructor = target.constructor;
        if (!metadataRegistry.has(constructor)) {
            metadataRegistry.set(constructor, { columns: {}, primaryKey: undefined });
        }

        const classMetadata = metadataRegistry.get(constructor);

        const columnName = options?.name || propertyKey.toString();
        const relationName = options?.relation || propertyKey.toString();

        // Initialize the column metadata if it doesn't exist
        if (!classMetadata.columns[propertyKey]) {
            classMetadata.columns[propertyKey] = {};
        }

        // Update the column metadata with new options
        classMetadata.columns[propertyKey] = {
            ...classMetadata.columns[propertyKey],
            ...options,
            name: columnName,
            relation: relationName
        };

        if (options?.primary) {
            if (classMetadata.primaryKey) {
                throw new Error(`Multiple primary keys are not allowed: ${constructor.name} already has a primary key on property '${String(classMetadata.primaryKey)}'.`);
            }
            classMetadata.primaryKey = propertyKey;
        }
    };
}

export function isColumn(targetClass: Function, propertyName: string): boolean {
    const metadata = metadataRegistry.get(targetClass);
    return metadata && metadata.columns[propertyName];
}

export function isPropertyUnique(targetClass: Function, propertyName: string): boolean {
    const metadata = metadataRegistry.get(targetClass);
    return metadata && metadata[propertyName] && metadata[propertyName].unique
}

export function isColumnNullable(targetClass: Function, propertyName: string): boolean {
    const metadata = metadataRegistry.get(targetClass);
    if (metadata && metadata.columns[propertyName] && metadata.columns[propertyName].hasOwnProperty('nullable')) {
        return metadata.columns[propertyName].nullable;
    }
    return false;
}

export function getPrimaryKeys(targetClass: Function): string[] {
    const metadata = metadataRegistry.get(targetClass);
    if (metadata) {
        // Get all the keys of the metadata object that are primary keys
        const keys = Object.keys(metadata.columns).filter((key) => metadata.columns[key].primary);

        // Return the actual column name as it is stored in the database
        return keys.map((key) => metadata.columns[key].name);
    }
    return [];
}

/**
 * Based on the column name value, however it is stored in the database, get the actual
 * key name of the property in the class.
 * @param targetClass 
 * @param columnName 
 * @returns String – the property name
 */
export function getColumnValueFromName(targetClass: Function, columnName: string): string {
    const metadata = metadataRegistry.get(targetClass);
    if (metadata) {
        for (const key in metadata.columns) {
            if (metadata.columns[key].name === columnName) {
                return key;
            }
        }
    }
    return '';
}

/**
 * Based on the actual property name, usually camel cased, get the column name value
 * that is stored in the database.
 * @param targetClass 
 * @param propertyName 
 * @returns String – the column name
 */
export function getColumnValueFromProperty(targetClass: Function, propertyName: string): string {
    const metadata = metadataRegistry.get(targetClass);
    if (metadata) {
        return metadata.columns[propertyName].name;
    }
    return '';
}