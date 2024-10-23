// import { createConnection } from 'mysql2';
// import { Connection, MySQLConnection, QueryResult } from '.';

// function log(result: QueryResult) {
//     console.log('Result');
//     console.table(result.data);

//     console.log('Headers');
//     console.table(result.headers);
// }

// async function run(db: Connection, sql: string) {
//     console.log('------------------------------');
//     console.log(`\x1b[32m${sql}\x1b[0m`);
//     console.log('------------------------------');

//     log(await db.raw(sql));
// }

// async function main() {
//     const db = new MySQLConnection(
//         createConnection({
//             host: 'localhost',
//             user: 'root',
//             password: '123456',
//             database: 'testing',
//         })
//     );

//     await run(db, 'SELECT 1 AS `a`, 2 AS `a`;');

//     await run(
//         db,
//         'SELECT * FROM students INNER JOIN teachers ON (students.teacher_id = teachers.id)'
//     );
// }

// main()
//     .then()
//     .finally(() => process.exit());

import duckDB from 'duckdb';

const client = new duckDB.Database('md:my_db', {
    motherduck_token:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImludmlzYWxAZ21haWwuY29tIiwic2Vzc2lvbiI6ImludmlzYWwuZ21haWwuY29tIiwicGF0IjoiVkdfZ1BmRXdaWjN5M29zY0VFemRLWElMVVJ4ZmxFdUpxbktZM3RkVjEtUSIsInVzZXJJZCI6ImVkZjQ4NjAyLTJlZmMtNGU0Ny04Y2VmLWNhNGU5NzQ3OTQ0MSIsImlzcyI6Im1kX3BhdCIsImlhdCI6MTcyOTEzMDcxMX0.ysqXODqC9BpMeOBeedjQW0y6GfiMdpOgHBy1OihUtKI',
});

client
    .connect()
    .prepare('SELECT 1;')
    .all((err, res) => {
        console.log(res);
        process.exit();
    });
