![Banner Image]

<div align="center">
  <h1>Outerbase Query Builder</h1>
  <a href="https://www.npmjs.com/package/outerbase/query-builder"><img src="https://img.shields.io/npm/v/outerbase/universe.svg?style=flat" /></a>
  <a href="https://github.com/outerbase/query-builder/blob/main/CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" /></a>
  <a href="https://github.com/"><img src="https://img.shields.io/badge/license-AGPL_3.0-blue" /></a>
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

- [**Query Builder**](https://www.outerbase.com): Execute queries on your database easily.
- [**AI Query**](https://www.outerbase.com): Use natural language to ask your database questions.
- [**Saved Queries**](https://www.outerbase.com): Run any saved queries from Outerbase in one line.
- [**Database Model Generator**](https://www.outerbase.com): Create Typescript models from your database schema.

## Usage

### Initialize a connection to your database

This library currently supports connecting to Outerbase connections, which supports Postgres, MySQL, SQLite, SQL Server, Clickhouse and more with direct integrations with platforms such as [DigitalOcean](https://digitalocean.com), [Neon](https://neon.tech), and [Turso](https://turso.tech).

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
5. Underneath the _API Token_ section you will see a button to "Generate API Key". Click that and copy your API token to use it in declaring a new `OuterbaseConnectio` object.

### Chaining query operations

Instead of writing SQL directly in your code you can chain commands together that create simple and complex SQL queries for you.

> String prototypes are used to extend the functionality of strings to help make the chaining functions read more clearly.

After you construct the series of SQL-like operations you intend to execute, you should end it by calling the `.query()` function call which will send the request to the database for exection.

```
let { data, error } = await db
    .selectFrom([
        { table: 'person', columns: ['first_name', 'last_name', 'position', 'avatar'] },
        { table: 'users', columns: ['email'] }
    ])
    .leftJoin('users', 'person.user_id'.equals('users.id'))
    .where('first_name'.isNot(null))
    .where('last_name'.equals('Doe'))
    .where('avatar'.equalsNumber(0))
    .limit(10)
    .offset(0)
    .orderBy('first_name'.descending())
    .asClass(Person)
    .query();
```

### Executing raw SQL queries

Executing raw SQL queries against your database is possible by passing a valid SQL statement into a database instance created by the library.

```
let { data, error } = await db.queryRaw('SELECT * FROM person');
```

You can optionally pass in an array of parameters for sanitizing your SQL inputs.

```
let { data, error } = await db.queryRaw('SELECT * FROM person WHERE id=:id', { id: "123" });
```

### Map results to class models

As you construct a SQL statement to be ran you can also pass in a class type you would like the output to attempt to map to. In the below example we pass in `Person` as the class type and the query builder will know to respond either as a single `Person` object or a `Person[]` array based on the contents of the response.

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
    "sync-models": "sync-models API_KEY=ABC123 ./folder/path/to/add/models"
}
```

Based on your `API_KEY` value the command will know how to fetch your database schema from Outerbase. It will convert your schema into various Typescript models and save each file to the path you provide. To run this command and generate the files you can execute the command as it is written above by typing:

```
npm run sync-models
```


## Roadmap
TBD

## Contributing
TBD

## Support
TBD

## License
TBD

## Top Contributors