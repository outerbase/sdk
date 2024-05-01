import { Connection } from "./connections";

interface QueryBuilder {
    action: 'select' | 'insert' | 'update' | 'delete';
    table?: string; // Used for INSERT, UPDATE, DELETE
    columnsWithTable?: { schema?: string, table: string, columns: string[] }[]; // Used for SELECT
    whereClauses?: string[];
    joins?: string[];
    data?: { [key: string]: any };
    limit?: number;
    offset?: number | null;
    orderBy?: string;
    returning?: string[];
    asClass?: any;
}

export interface OuterbaseType {
    queryBuilder: QueryBuilder;
    selectFrom: (columnsArray: { schema?: string, table: string, columns: string[] }[]) => OuterbaseType;
    where: (condition: any) => OuterbaseType;
    limit: (limit: number) => OuterbaseType;
    offset: (offset: number) => OuterbaseType;
    orderBy: (column: string, direction?: 'ASC' | 'DESC') => OuterbaseType;
    innerJoin: (table: string, condition: string, options?: any) => OuterbaseType;
    leftJoin: (table: string, condition: string, options?: any) => OuterbaseType;
    rightJoin: (table: string, condition: string, options?: any) => OuterbaseType;
    outerJoin: (table: string, condition: string, options?: any) => OuterbaseType;
    insert: (data: { [key: string]: any }) => OuterbaseType;
    update: (data: { [key: string]: any }) => OuterbaseType;
    in: (table: string) => OuterbaseType;
    deleteFrom: (table: string) => OuterbaseType;
    returning: (columns: string[]) => OuterbaseType;
    asClass: (classType: any) => OuterbaseType;
    query: () => Promise<any>;
    queryRaw: (query: string, parameters?: Record<string, any>[]) => Promise<any>;
}

export function Outerbase(connection: Connection): OuterbaseType {
    const outerbase: OuterbaseType = {
        queryBuilder: { action: 'select' },
        selectFrom(columnsArray) {
            this.queryBuilder = {
                action: 'select',
                columnsWithTable: [],
                whereClauses: [],
                joins: []
            };

            this.queryBuilder.columnsWithTable = columnsArray;

            return this;
        },
        where(condition) {
            if (this.queryBuilder.whereClauses)
                this.queryBuilder.whereClauses.push(condition);
            return this;
        },
        limit(limit) {
            this.queryBuilder.limit = limit;
            return this;
        },
        offset(offset) {
            this.queryBuilder.offset = offset;
            return this;
        },
        orderBy(value) {
            this.queryBuilder.orderBy = value;
            return this;
        },
        innerJoin(table, condition, options) {
            let skipEscape = false;
            if (options && options.escape_single_quotes !== undefined) {
                if (options.escape_single_quotes === false) {
                    skipEscape = true;
                }
            }
            if (!skipEscape) {
                condition = condition.replace(/'/g, '');
            }

            if (this.queryBuilder.joins)
                this.queryBuilder.joins.push(`INNER JOIN ${table} ON ${condition}`);
            return this;
        },
        leftJoin(table, condition, options) {
            let skipEscape = false;
            if (options && options.escape_single_quotes !== undefined) {
                if (options.escape_single_quotes === false) {
                    skipEscape = true;
                }
            }
            if (!skipEscape) {
                condition = condition.replace(/'/g, '');
            }

            if (this.queryBuilder.joins)
                this.queryBuilder.joins.push(`LEFT JOIN ${table} ON ${condition}`);
            return this;
        },
        rightJoin(table, condition, options) {
            let skipEscape = false;
            if (options && options.escape_single_quotes !== undefined) {
                if (options.escape_single_quotes === false) {
                    skipEscape = true;
                }
            }
            if (!skipEscape) {
                condition = condition.replace(/'/g, '');
            }

            condition = condition.replace(/'/g, '');
            if (this.queryBuilder.joins)
                this.queryBuilder.joins.push(`RIGHT JOIN ${table} ON ${condition}`);
            return this;
        },
        outerJoin(table, condition, options) {
            let skipEscape = false;
            if (options && options.escape_single_quotes !== undefined) {
                if (options.escape_single_quotes === false) {
                    skipEscape = true;
                }
            }
            if (!skipEscape) {
                condition = condition.replace(/'/g, '');
            }

            if (this.queryBuilder.joins)
                this.queryBuilder.joins.push(`OUTER JOIN ${table} ON ${condition}`);
            return this;
        },
        insert(data) {
            this.queryBuilder = {
                action: 'insert',
                data: data,
                table: null
            };
            return this;
        },
        update(data) {
            this.queryBuilder = {
                action: 'update',
                data: data,
                table: null,
                whereClauses: []
            };
            return this;
        },
        in(table) {
            this.queryBuilder.table = table;
            return this;
        },
        deleteFrom(table) {
            this.queryBuilder = {
                action: 'delete',
                table: table,
                whereClauses: []
            };
            return this;
        },
        returning(columns: string[]) {
            this.queryBuilder.returning = columns;
            return this;
        },
        asClass(classType) {
            this.queryBuilder.asClass = classType;
            return this;
        },
        async query() {
            let query = '';
            let queryParams: any[] = [];

            switch (this.queryBuilder.action) {
                case 'select':
                    const joinClauses = this.queryBuilder.joins?.join(' ') || '';
                    let selectColumns = '';
                    let fromTable = '';

                    this.queryBuilder.columnsWithTable.forEach((set, index) => {
                        if (index > 0) {
                            selectColumns += ', ';
                        }

                        const schema = set.schema ? `"${set.schema}".` : '';
                        const columns = set.columns.map(column => `${schema ?? ''}${set.table}.${column}`);

                        selectColumns += columns.join(', ');

                        if (index === 0) {
                            fromTable = `${schema}${set.table}`;
                        }
                    });

                    query = `SELECT ${selectColumns} FROM ${fromTable} ${joinClauses}`;

                    if (!this || !this.queryBuilder || !this.queryBuilder.whereClauses) {
                        return;
                    }

                    if (this.queryBuilder?.whereClauses?.length > 0) {
                        query += ` WHERE ${this.queryBuilder?.whereClauses.join(' AND ')}`;
                    }

                    if (this.queryBuilder.orderBy !== undefined) {
                        query += ` ORDER BY ${this.queryBuilder.orderBy}`;
                    }

                    if (this.queryBuilder.limit !== undefined) {
                        query += ` LIMIT ${this.queryBuilder.limit}`;
                        if (this.queryBuilder.offset !== null) {
                            query += ` OFFSET ${this.queryBuilder.offset}`;
                        }
                    }

                    break;
                case 'insert':
                    const columns = Object.keys(this.queryBuilder.data || {});
                    const placeholders = columns.map(column => `:${column}`).join(', ');
                    query = `INSERT INTO ${this.queryBuilder.table || ''} (${columns.join(', ')}) VALUES (${placeholders})`;
                    queryParams.push(this.queryBuilder.data);

                    if (this.queryBuilder.returning?.length > 0) {
                        query += ` RETURNING ${this.queryBuilder.returning.join(', ')}`;
                    }

                    break;
                case 'update':
                    if (!this || !this.queryBuilder || !this.queryBuilder.whereClauses) {
                        return;
                    }

                    const columnsToUpdate = Object.keys(this.queryBuilder.data || {});
                    const setClauses = columnsToUpdate.map(column => `${column} = :${column}`).join(', ');
                    query = `UPDATE ${this.queryBuilder.table || ''} SET ${setClauses}`;
                    if (this.queryBuilder.whereClauses?.length > 0) {
                        query += ` WHERE ${this.queryBuilder.whereClauses.join(' AND ')}`;
                    }
                    queryParams.push(this.queryBuilder.data);
                    break;
                case 'delete':
                    if (!this || !this.queryBuilder || !this.queryBuilder.whereClauses) {
                        return;
                    }

                    query = `DELETE FROM ${this.queryBuilder.table || ''}`;
                    if (this.queryBuilder.whereClauses?.length > 0) {
                        query += ` WHERE ${this.queryBuilder.whereClauses.join(' AND ')}`;
                    }
                    break;
                default:
                    throw new Error('Invalid action');
            }

            // If asClass is set, map the response to the class
            if (this.queryBuilder.asClass) {
                const response = await connection.query(query, queryParams);
                let result = mapToClass(response?.data, this.queryBuilder.asClass);
                return {
                    data: result,
                    error: response.error
                };
            }

            // Otherwise, if asClass is not set, return the raw response
            return await connection.query(query, queryParams);
        },
        async queryRaw(query, parameters) {
            // If asClass is set, map the response to the class
            if (this.queryBuilder.asClass) {
                const response = await connection.query(query, parameters);
                let result = mapToClass(response?.data, this.queryBuilder.asClass);
                return {
                    data: result,
                    error: response.error
                };
            }

            // Otherwise, if asClass is not set, return the raw response
            return await connection.query(query, parameters);
        }
    };

    return outerbase;
}

function mapToClass<T>(data: any | any[], ctor: new (data: any) => T): T | T[] {
    if (Array.isArray(data)) {
        let array = data.map(item => new ctor(item));
        return array
    } else {
        return new ctor(data);
    }
}
