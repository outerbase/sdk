// DatabaseFactory.ts
import { Connection } from './index'

export enum DatabaseType {
    Outerbase = 'outerbase',
    Cloudflare = 'cloudflare',
    Neon = 'neon'
}

export class DatabaseFactory {
    static async createConnection(type: DatabaseType, config: any): Promise<Connection> {
        switch (type) {
            case DatabaseType.Outerbase:
                const { OuterbaseConnection } = await import('./outerbase');
                return new OuterbaseConnection(config);
            case DatabaseType.Cloudflare:
                const { CloudflareD1Connection } = await import('./cloudflare');
                return new CloudflareD1Connection(config);
            case DatabaseType.Neon:
                // const { MySQLConnection } = await import('./MySQLConnection');
                // return new MySQLConnection(config);
            default:
                throw new Error(`Unsupported database type: ${type}`);
        }
    }
}
