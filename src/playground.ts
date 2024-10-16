import { createConnection } from 'mysql2';
import { Connection, MySQLConnection, QueryResult } from '.';

function log(result: QueryResult) {
    console.log('Result');
    console.table(result.data);

    console.log('Headers');
    console.table(result.headers);
}

async function run(db: Connection, sql: string) {
    console.log('------------------------------');
    console.log(`\x1b[32m${sql}\x1b[0m`);
    console.log('------------------------------');

    log(await db.raw(sql));
}

async function main() {
    const db = new MySQLConnection(
        createConnection({
            host: 'localhost',
            user: 'root',
            password: '123456',
            database: 'testing',
        })
    );

    await run(db, 'SELECT 1 AS `a`, 2 AS `a`;');

    await run(
        db,
        'SELECT * FROM students INNER JOIN teachers ON (students.teacher_id = teachers.id)'
    );
}

main()
    .then()
    .finally(() => process.exit());
