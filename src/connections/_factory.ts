import { Connection } from './index'

export enum ConnectionType {
    Outerbase = 'outerbase',
    Cloudflare = 'cloudflare',
    Neon = 'neon'
}

export class ConnectionFactory {
    static async createConnection(type: ConnectionType, config: any): Promise<Connection> {
        switch (type) {
            case ConnectionType.Outerbase:
                const { OuterbaseConnection } = await import('./outerbase');
                return new OuterbaseConnection(config);
            case ConnectionType.Cloudflare:
                const { CloudflareD1Connection } = await import('./cloudflare');
                return new CloudflareD1Connection(config);
            case ConnectionType.Neon:
                // TODO: Implement Neon connection after https://github.com/outerbase/sdk/pull/39 is merged
            default:
                throw new Error(`Unsupported database type: ${type}`);
        }
    }
}
