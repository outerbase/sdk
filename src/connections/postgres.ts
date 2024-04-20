// import { Connection } from './index';
// import { Client } from 'pg';

// class PostgresConnection implements Connection {
//     private client: Client;

//     // Usage:
//     // ------------------------------
//     // npm install pg
//     //
//     // const postgresConnectionString = 'your-postgres-connection-string';
//     // const postgresConnection = new PostgresConnection(postgresConnectionString);
//     // const outerbase = initOuterbase(postgresConnection);


//     constructor(private connectionString: string) {
//         this.client = new Client({
//             connectionString: this.connectionString,
//         });
//     }

//     async connect(): Promise<void> {
//         try {
//             await this.client.connect();
//             console.log('Connected to PostgreSQL database');
//         } catch (error) {
//             console.error('Error connecting to PostgreSQL database:', error);
//             throw error;
//         }
//     }

//     async disconnect(): Promise<void> {
//         try {
//             await this.client.end();
//             console.log('Disconnected from PostgreSQL database');
//         } catch (error) {
//             console.error('Error disconnecting from PostgreSQL database:', error);
//             throw error;
//         }
//     }

//     async query(sql: string, params?: any[]): Promise<any> {
//         try {
//             const { rows } = await this.client.query(sql, params);
//             return rows;
//         } catch (error) {
//             console.error('Error executing query:', error);
//             throw error;
//         }
//     }
// }
