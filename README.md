![Banner Image]

<div align="center">
    <h1>Outerbase Query Builder</h1>
    <a href="https://www.npmjs.com/package/@outerbase/query-builder"><img src="https://img.shields.io/npm/v/@outerbase/query-builder.svg?style=flat" /></a>
    <a href="https://github.com/outerbase/query-builder/blob/main/CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" /></a>
    <a href="https://github.com/"><img src="https://img.shields.io/badge/license-MIT-blue" /></a>
    <a href="https://discord.gg/4M6AXzGG84"><img alt="Discord" src="https://img.shields.io/discord/1123612147704934400?label=Discord"></a>
    <br />
    <br />
    <a href="https://www.outerbase.com/">Website</a>
    <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
    <a href="https://www.docs.outerbase.com/">Docs</a>
    <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
    <a href="https://www.outerbase.com/blog/">Blog</a>
    <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
    <a href="https://discord.gg/4M6AXzGG84">Discord</a>
    <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
    <a href="https://twitter.com/outerbase">Twitter</a>
    <br />
    <hr />
</div>

## What is Query Builder?

Outerbase Query Builder is a way to interact with your database in a SQL-like manner. This library contains the following primary features:

- [**Query Builder**](#chaining-query-operations): Execute queries on your database easily.
- [**Saved Queries**](#run-saved-outerbase-queries): Run any saved queries from Outerbase in one line.
- [**Database Model Generator**](#generate-models-from-your-database): Create Typescript models from your database schema.

## Usage

### Initialize a connection to your database

This library currently supports connecting to Outerbase connections, which supports **Postgres**, **MySQL**, **SQLite**, **SQL Server**, **Clickhouse** and more with direct integrations with platforms such as [DigitalOcean](https://digitalocean.com), [Neon](https://neon.tech), and [Turso](https://turso.tech).

First we start by creating a connection object which is intended to be extensible where contributors can create a variety of connection types to other databases or additional third party tools to interact with. In this example we use the included `OuterbaseConnection` class.

With a connection object instantiated we can create a new database instance to interact with that connection interface.

```
const connection: OuterbaseConnection = new OuterbaseConnection('INSERT_API_TOKEN');
const db = outerbase(connection);
```

#### How to create an Outerbase Connection token

When using the `OuterbaseConnection` class, you are required to provide an API token from Outerbase.

1. Create an account on [Outerbase](https://app.outerbase.com/)
2. Attach the database you want to use
3. Open your Base and click on _Base Settings_ on the left menu
4. Select the _General_ section
5. Underneath the _API Token_ section you will see a button to "Generate API Key". Click that and copy your API token to use it in declaring a new `OuterbaseConnection` object.

### Chaining query operations

Instead of writing SQL directly in your code you can chain commands together that create simple and complex SQL queries for you.

After you construct the series of SQL-like operations you intend to execute, you should end it by calling the `.query()` function call which will send the request to the database for exection.

#### Select data from database
```
let { data, error } = await db
    .selectFrom([
        {
            schema: 'public', // <- Optional
            table: 'person',
            columns: ['first_name', 'last_name', 'position', 'avatar'],
        },
        { table: 'users', columns: ['email'] },
    ])
    .leftJoin('users', equalsColumn('person.user_id', 'users.id'))
    .where(isNot('first_name', null))
    .where(equals('last_name', 'Doe'))
    .where(equalsNumber('avatar', 0))
    .limit(10)
    .offset(0)
    .orderBy(descending('first_name'))
    .asClass(Person)
    .query()
```

#### Insert data into a table
```
let { data } = await db
    .insert({ first_name: 'John', last_name: 'Doe', position: 'Developer', avatar: 0 })
    .in('person')
    .returning(['id'])
    .query();
```

#### Update data in a table
```
let { data } = await db
    .update({ first_name: 'Johnny' })
    .in('person')
    .where(equals('last_name', 'Doe'))
    .query();
```

#### Delete data from a table
```
let { data } = await db
    .deleteFrom('person')
    .where(equals('id', '1234'))
    .query();
```

> IMPORTANT! To prevent your code from performing actions you do not want to happen, such as deleting data, make sure the database user role you provide in Outerbase has restricted scopes.

### Executing raw SQL queries

Executing raw SQL queries against your database is possible by passing a valid SQL statement into a database instance created by the library.

```
let { data, error } = await db.queryRaw('SELECT * FROM person');
```

You can optionally pass in an array of parameters for sanitizing your SQL inputs.

```
let { data, error } = await db.queryRaw('SELECT * FROM person WHERE id=:id', { id: "123" });
```

### Run saved Outerbase queries

When you save queries to your Outerbase bases you can then directly execute those queries from this library. This enables you to make modifications to your query without having to alter and redeploy your codebase, and instead just make the modifications via Outerbase directly for convenience.

```
let { data, error } = await connection.runSavedQuery(
    'ea72da5f-5f7a-4bab-9f72-ffffffffffff'
)
```

Note that this is an exported function directly from the `OuterbaseConnection` class.

### Map results to class models

As you construct a SQL statement to be ran you can also pass in a class type you would like the output to attempt to map to by using `.asClass(ClassName)`. In the below example we pass in `Person` as the class type and the query builder will know to respond either as a single `Person` object or a `Person[]` array based on the contents of the response.

```
let { data, error } = await db
    .asClass(Person)
    .queryRaw('SELECT * FROM person');
```

If your response cannot map to that class type based on property mismatch, you may not see any data being returned in your model.

### Generate models from your database

> NOTE: This feature is still in early development.

If your database is connected to Outerbase, then you can add a command to your `package.json` file in your project that can be executed to sync and download your database tables as Typescript models. These models are usable in your project and in many cases should map directly to the responses provided by the query builder library.

To get started first add the following to your `package.json` file:

##### package.json
```
"scripts": {
    "sync-models": "sync-database-models PATH=./folder/path/to/add/models API_KEY=outerbase_api_key"
}
```

Based on your `API_KEY` value the command will know how to fetch your database schema from Outerbase. It will convert your schema into various Typescript models and save each file to the path you provide. To run this command and generate the files you can execute the command as it is written above by typing:

```
npm run sync-models
```

The output produces a series of files, one per database table, that is a Typescript class for your queries to map their results to and you can access programatically easily. A sample output looks like the following where each property maps to a column in your database.

```
export interface PersonType {
    firstName: string;
    lastName: string;
    position?: string;
    avatar?: number;
}

export class Person implements PersonType {
    firstName: string;
    lastName: string;
    position?: string;
    avatar?: number;
    
    constructor(data: any) {
        this.firstName = data.first_name;
        this.lastName = data.last_name;
        this.position = data.position;
        this.avatar = data.avatar;
    }
}
```

## Contributing

If you want to add contributions to this repository, please follow the instructions [here](contributing.md).

## Support

For support join our community on [Discord](https://discord.gg/4M6AXzGG84). For enterprise solutions contact us at [support@outerbase.com](mailto:support@outerbase.com)

## License

This project is licensed under the MIT license. See the [LICENSE](./LICENSE.txt) file for more info.

## Our Contributors

<img align="left" src="https://contributors-img.web.app/image?repo=outerbase/query-builder"/>