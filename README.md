<div align="center">
    <h1>Outerbase SDK</h1>
    <a href="https://www.npmjs.com/package/@outerbase/sdk"><img src="https://img.shields.io/npm/v/@outerbase/sdk.svg?style=flat" /></a>
    <a href="https://github.com/outerbase/sdk/blob/main/CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" /></a>
    <a href="https://github.com/"><img src="https://img.shields.io/badge/license-MIT-blue" /></a>
    <a href="https://discord.gg/4M6AXzGG84"><img alt="Discord" src="https://img.shields.io/discord/1123612147704934400?label=Discord"></a>
    <br />
    <br />
    <a href="https://www.outerbase.com/">Website</a>
    <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
    <a href="https://docs.outerbase.com/">Docs</a>
    <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
    <a href="https://www.outerbase.com/blog/">Blog</a>
    <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
    <a href="https://discord.gg/4M6AXzGG84">Discord</a>
    <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
    <a href="https://twitter.com/outerbase">Twitter</a>
    <br />
    <hr />
</div>

## What is Outerbase SDK?

The Outerbase SDK is like a building block for creating custom database GUIs. It standardizes the connection interface, making it straightforward and easy to use.


## Install with a package manager

**npm**
```
npm i @outerbase/sdk
```

**pnpm**
```
pnpm add @outerbase/sdk
```


## Connection



The Outerbase SDK supports Postgres, MySQL, SQLite, Motherduck, BigQuery, and MongoDB. It wraps, not manages, your connections, providing a unified interface for easy interaction.

#### Postgres

```typescript
import { PostgreSQLConnection } from "@outerbase/sdk";
import { Client } from 'pg';

const db = new PostgreSQLConnection(
    new PgClient({
        host: "localhost",
        user: "postgres",
        password: "postgres",
        database: "postgres",
        port: 5432
    })
);
```

#### MySQL

```typescript
import { MySQLConnection } from "@outerbase/sdk";
import { createConnection } from 'mysql2';

const db = new MySQLConnection(
    createConnection({
        host: "localhost",
        user: "root",
        password: "123456",
        database: "chinook",
        port: 3306,
    })
);
```
## Connection Interface

### Get Schema

```typescript
import { PostgreSQLConnection } from "@outerbase/sdk";
import { Client } from 'pg';

const db = new PostgreSQLConnection(new PgClient({...}));
await db.connect();

// Get database schema
await db.fetchDatabaseSchema();

await db.disconnect();
```

### Create Table

```typescript
await db.createTable("public", "users", [
    { name: "id", definition: { type: "INTEGER", primaryKey: true } },
    { name: "name", definition: { type: "STRING" } },
    {
        name: "referral_id",
        definition: {
            type: "INTEGER",
            references: { // Foreign Key
                column: ["id"],
                table: "users"
            }
        }
    }
]);
```

### Drop Table

```typescript
await db.dropTable("public", "users");
```

### Rename Table

```typescript
await db.renameTable("public", "users", "people");
```

### Add Column

### Drop Column

### Rename Column

### Select

```typescript
const { data, headers } = await db.select("public", "persons");
console.log(data);
/*
[
  { "id": 1, "name": "Brayden" },
  { "id": 2, "name": "Brandon" }
]
*/

console.log(headers);
/*
[
  { "name": "id", "displayName": "id" },
  { "name": "name", "displayName": "name" },
]
*/
```


The select comes with several limited options

```typescript
const { data } = await db.select("public", "persons", {
    where: { name: "id", operator: ">", value: 10 },
    orderBy: "id",
    limit: 20,
    offset: 10
});
```

### Delete

```typescript
await db.delete("public", "users", { id: 1 });
```

### Insert

```typescript
await db.insert("public", "users", { id: 1, name: "Brayden" });
```

### Update

```typescript
await db.insert(
    "public", "users",
    { name: "Brayden Junior" },
    { id: 1 }
);
```

### Raw

```typescript
const { data, headers } = await db.raw("SELECT 1 AS a, 2 AS a;");

console.log(data);
/*
Outerbase SQL detect header name collision and rename to other
[
  { "a": 1, "a1": 2 }
]
*/

console.log(headers);
/*
[
  { "name": "a", displayName: "a" },
  { "name": "a1", displayName: "a" }
]
*/
```

## Query Builder

Our connection interface offers a streamlined, unified API across database drivers. For complex query construction, you can use `raw` SQL or wrap your connection with our query builder.

```typescript
import { PostgreSQLConnection, Outerbase } from "@outerbase/sdk";
import { Client } from 'pg';

const db = new PostgreSQLConnection(new PgClient({...}));
await db.connect();

// Using our query builder
const qb = Outerbase(db);

const builder = qb.createTable('persons')
    .column('id', { type: 'SERIAL', primaryKey: true })
    .column('first_name', { type: 'VARCHAR(50)' })
    .column('last_name', { type: 'VARCHAR(50)' });

// If you want to preview your SQL query
console.log(builder.toQuery());
// { query: 'CREATE TABLE IF NOT EXISTS "persons" ("id" SERIAL PRIMARY KEY, "first_name" VARCHAR(50), "last_name" VARCHAR(50))' }

// Or you can directly execute it
await builder.query();
```

More Examples:

```typescript
// Insert
await qb.insert({
    last_name: 'Visal',
    first_name: 'In' 
}).into('persons').query();

// Select
const { data } = await qb
    .select('id', 'name')
    .from('users')
    .where({ name: 'Brayden' });

const { data } = await qb
    .select('id', 'name')
    .from('users')
    .where('name', 'LIKE', '%Bray%')
    .limit(10)
    .offset(5)
    .query();

qb.select('id', 'name')
    .from('users')
    .where(
        q.or(
            q.where('age', '>', 18),
            q.where('gender', '=', 'female'),
            q.and(q.where('active', '=', 1), q.where('deleted', '=', 0))
        )
    )
    .toQuery();

/*
{
    'query': 'SELECT "id", "name" FROM "users" WHERE "age" > ? OR "gender" = ? OR ("active" = ? AND "deleted" = ?)'
    'parameters': [18, 'female', 1, 0]
} 
*/

// Update
await qb()
    .update({ last_name: 'Visal', first_name: 'In' })
    .into('persons').
    .where({
        id: 123,
        active: 1,
    }).query();
```

## Contributing

If you want to add contributions to this repository, please follow the instructions [here](contributing.md).

## Support

For support join our community on [Discord](https://discord.gg/4M6AXzGG84). For enterprise solutions contact us at [support@outerbase.com](mailto:support@outerbase.com)

## License

This project is licensed under the MIT license. See the [LICENSE](./LICENSE.txt) file for more info.

## Our Contributors

<img align="left" src="https://contributors-img.web.app/image?repo=outerbase/sdk"/>