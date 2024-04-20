function initOuterbase(apiKey) {
    const outerbase = {
        select: function (columnsArray) {
            this.queryBuilder = {
                action: 'select',
                columns: [],
                table: null,
                whereClauses: [],
                joins: []
            };
        
            // Loop through each table and its columns
            columnsArray.forEach(tableColumns => {
                const columns = tableColumns.columns.map(column => `${column}`);
                this.queryBuilder.columns = this.queryBuilder.columns.concat(columns);
            });
        
            return this;
        },
        from: function (table) {
            this.queryBuilder.table = table;
            return this;
        },
        where: function (column, operator, value) {
            let formattedValue = value;

            if (value === null) {
                formattedValue = 'NULL';
            } else if (typeof value === 'string') {
                formattedValue = `'${value}'`;
            }            

            this.queryBuilder.whereClauses.push(`${column} ${operator} ${formattedValue}`);
            return this;
        },
        limit: function (limit) {
            this.queryBuilder.limit = limit;
            return this;
        },
        offset: function (offset) {
            this.queryBuilder.offset = offset;
            return this;
        },
        orderBy: function (column, direction = 'ASC') {
            this.queryBuilder.orderByColumn = column;
            this.queryBuilder.orderByDirection = direction;
            return this;
        },
        innerJoin: function (table, condition) {
            this.queryBuilder.joins.push(`INNER JOIN ${table} ON ${condition}`);
            return this;
        },
        leftJoin: function (table, condition) {
            this.queryBuilder.joins.push(`LEFT JOIN ${table} ON ${condition}`);
            return this;
        },
        rightJoin: function (table, condition) {
            this.queryBuilder.joins.push(`RIGHT JOIN ${table} ON ${condition}`);
            return this;
        },
        outerJoin: function (table, condition) {
            this.queryBuilder.joins.push(`OUTER JOIN ${table} ON ${condition}`);
            return this;
        },
        insert: function (data) {
            this.queryBuilder = {
                action: 'insert',
                data: data,
                table: null
            };
            return this;
        },
        into: function (table) {
            this.queryBuilder.table = table;
            return this;
        },
        update: function (data) {
            this.queryBuilder = {
                action: 'update',
                data: data,
                table: null,
                whereClauses: []
            };
            return this;
        },
        in: function (table) {
            this.queryBuilder.table = table;
            return this;
        },
        delete: function () {
            this.queryBuilder = {
                action: 'delete',
                table: null,
                whereClauses: []
            };
            return this;
        },
        query: async function () {
            // Constructing the query based on the query builder
            let query = '';
            let queryParams = [];
            switch (this.queryBuilder.action) {
                case 'select':
                    const joinClauses = this.queryBuilder.joins.join(' ');
                    if (joinClauses.length > 0) {
                        query += `SELECT ${this.queryBuilder.columns.join(', ')} FROM ${this.queryBuilder.table} ${joinClauses}`;
                    } else {
                        query += `SELECT ${this.queryBuilder.columns.join(', ')} FROM ${this.queryBuilder.table}`;
                    }

                    if (this.queryBuilder.whereClauses.length > 0) {
                        query += ` WHERE ${this.queryBuilder.whereClauses.join(' AND ')}`;
                    }

                    if (this.queryBuilder.orderByColumn !== undefined) {
                        query += ` ORDER BY ${this.queryBuilder.orderByColumn} ${this.queryBuilder.orderByDirection}`;
                    }

                    if (this.queryBuilder.limit !== undefined) {
                        query += ` LIMIT ${this.queryBuilder.limit}`;
                        if (this.queryBuilder.offset !== null) {
                            query += ` OFFSET ${this.queryBuilder.offset}`;
                        }
                    }

                    break;
                case 'insert':
                    const columns = Object.keys(this.queryBuilder.data);
                    const placeholders = columns.map(column => `:${column}`).join(', ');
                    query = `INSERT INTO ${this.queryBuilder.table} (${columns.join(', ')}) VALUES (${placeholders})`;
                    queryParams.push(this.queryBuilder.data);
                    break;
                case 'update':
                    const columnsToUpdate = Object.keys(this.queryBuilder.data);
                    const setClauses = columnsToUpdate.map(column => `${column} = :${column}`).join(', ');
                    query = `UPDATE ${this.queryBuilder.table} SET ${setClauses}`;
                    if (this.queryBuilder.whereClauses.length > 0) {
                        query += ` WHERE ${this.queryBuilder.whereClauses.join(' AND ')}`;
                    }
                    queryParams.push(this.queryBuilder.data);
                    break;

                case 'delete':
                    query = `DELETE FROM ${this.queryBuilder.table}`;
                    if (this.queryBuilder.whereClauses.length > 0) {
                        query += ` WHERE ${this.queryBuilder.whereClauses.join(' AND ')}`;
                    }
                    break;
                default:
                    throw new Error('Invalid action');
            }

            // For demonstration purposes, we'll just log the query
            console.log(query)
            console.log(queryParams)
            // console.log("Executing query:", query, "with parameters:", queryParams);

            let params2 = queryParams?.length ? queryParams[0] : undefined

            // Set the below to `true` if you want to utilize the EZQL library endpoint
            let ezql = false

            if (ezql) {
                const response = await fetch('https://app.dev.outerbase.com/api/v1/ezql', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Source-Token': 'v4nhsyf63an1u3a1yuw5e6ca2zf7sp3a3fjzmzafimxq1airizarmwulcwamuwi9'
                    },
                    body: JSON.stringify({
                        query: query,
                        params: {
                            ...params2
                        },
                        run: true
                    })
                });

                return await response.json()
            } else {
                const response = await fetch('https://app.dev.outerbase.com/api/v1/workspace/-est/source/45ccf7d1-05f2-4338-9dd6-e9a61534a960/query/raw', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Auth-Token': apiKey
                    },
                    body: JSON.stringify({
                        query: query,
                        params: {
                            ...params2
                        }
                    })
                });

                return await response.json()
            }
        }
                 
    };

    return outerbase;
}