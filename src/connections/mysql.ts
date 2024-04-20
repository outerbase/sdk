// import { Connection } from './index';
// import { createConnection, Connection as MySqlConnection, FieldPacket } from 'mysql2/promise';

// class MySQLConnection implements Connection {
//     private connection: MySqlConnection;

//     // Usage:
//     // ------------------------------
//     // npm install mysql2
//     //
//     // const mysqlConnectionConfig = {
//     //     host: 'your-mysql-host',
//     //     user: 'your-mysql-user',
//     //     password: 'your-mysql-password',
//     //     database: 'your-mysql-database'
//     // };
//     // const mysqlConnection = new MySQLConnection(mysqlConnectionConfig);
//     // const outerbase = initOuterbase(mysqlConnection);

//     constructor(private connectionConfig: any) {
//         // The connectionConfig object should contain host, user, password, database, etc.
//         this.connection = createConnection(connectionConfig);
//     }

//     async connect(): Promise<void> {
//         try {
//             await this.connection.connect();
//             console.log('Connected to MySQL database');
//         } catch (error) {
//             console.error('Error connecting to MySQL database:', error);
//             throw error;
//         }
//     }

//     async disconnect(): Promise<void> {
//         try {
//             await this.connection.end();
//             console.log('Disconnected from MySQL database');
//         } catch (error) {
//             console.error('Error disconnecting from MySQL database:', error);
//             throw error;
//         }
//     }

//     async query(sql: string, params?: any[]): Promise<any> {
//         try {
//             const [rows, fields]: [any[], FieldPacket[]] = await this.connection.execute(sql, params);
//             return rows;
//         } catch (error) {
//             console.error('Error executing query:', error);
//             throw error;
//         }
//     }
// }
