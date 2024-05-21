export interface Connection {
    connect: (details: Record<string, any>) => Promise<any>;
    disconnect: () => Promise<any>;
    query: (query: string, parameters: Record<string, any>[] | undefined) => Promise<{ data: any, error: Error | null }>;
}
