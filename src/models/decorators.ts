/**
 * A registry of metadata for classes decorated with the @Entity decorator.
 * The metadata is stored as a Map where the key is the class constructor and 
 * the value is an object with the following properties:
 * - columns: an object where the keys are property keys and the values are objects with column options
 * - primaryKey: the property key of the primary key column
 * @type {Map<Function, any>}
 */
export const metadataRegistry = new Map<Function, any>();

export function Column(options?: { unique?: boolean, primary?: boolean, nullable?: boolean, columnName?: string }): PropertyDecorator {
    return function(target: any, propertyKey: string | symbol): void {
        const constructor = target.constructor;
        if (!metadataRegistry.has(constructor)) {
            metadataRegistry.set(constructor, { columns: {}, primaryKey: undefined });
        }

        const classMetadata = metadataRegistry.get(constructor);

        // Use the provided column name or default to the property name if not provided
        const columnName = options?.columnName || propertyKey.toString();

        // Initialize the column metadata if it doesn't exist
        if (!classMetadata.columns[propertyKey]) {
            classMetadata.columns[propertyKey] = {};
        }

        // Update the column metadata with new options
        classMetadata.columns[propertyKey] = {
            ...classMetadata.columns[propertyKey],
            ...options,
            columnName: columnName
        };

        // Handle primary key setting
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
    if (metadata && metadata.columns[propertyName]) {
        return true;
    }
    return false;
}

export function isPropertyUnique(targetClass: Function, propertyName: string): boolean {
    const metadata = metadataRegistry.get(targetClass);
    if (metadata && metadata[propertyName] && metadata[propertyName].unique) {
        return true;
    }
    return false;
}

export function isColumnNullable(targetClass: Function, propertyName: string): boolean {
    const metadata = metadataRegistry.get(targetClass);
    if (metadata && metadata.columns[propertyName] && metadata.columns[propertyName].hasOwnProperty('nullable')) {
        return metadata.columns[propertyName].nullable;
    }
    return false;
}

export function getPrimaryKey(targetClass: Function): string | symbol | undefined {
    const metadata = metadataRegistry.get(targetClass);
    if (metadata) {
        return metadata.primaryKey;
    }
    return undefined;
}