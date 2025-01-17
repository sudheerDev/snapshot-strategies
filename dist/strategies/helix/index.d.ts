export declare const author = "helixgeometry";
export declare const version = "0.0.1";
export declare const examples: {
    name: string;
    strategy: {
        name: string;
        params: {
            address: string;
            masterChef: string;
            autoHelix: string;
            vault: string;
            helixLPs: {
                address: string;
                pid: number;
            }[];
            symbol: string;
            decimals: number;
        };
    };
    network: string;
    addresses: string[];
    snapshot: number;
}[];
export declare function strategy(space: any, network: any, provider: any, addresses: any, options: any, snapshot: any): Promise<Record<string, number>>;
