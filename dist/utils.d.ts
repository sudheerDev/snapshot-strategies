import { getDelegations } from './utils/delegation';
import { getVp, getDelegations as getCoreDelegations } from './utils/vp';
export declare function getScoresDirect(space: string, strategies: any[], network: string, provider: any, addresses: string[], snapshot?: number | string): Promise<{}[]>;
export declare function customFetch(url: any, options: any, timeout?: number): Promise<any>;
export declare const multicall: typeof import("@snapshot-labs/snapshot.js/dist/utils").multicall, Multicaller: typeof import("@snapshot-labs/snapshot.js/dist/utils/multicaller").default, subgraphRequest: typeof import("@snapshot-labs/snapshot.js/dist/utils").subgraphRequest, ipfsGet: typeof import("@snapshot-labs/snapshot.js/dist/utils").ipfsGet, call: typeof import("@snapshot-labs/snapshot.js/dist/utils").call, getDelegatesBySpace: typeof import("@snapshot-labs/snapshot.js/dist/utils").getDelegatesBySpace, getBlockNumber: typeof import("@snapshot-labs/snapshot.js/dist/utils/web3").getBlockNumber, getProvider: typeof import("@snapshot-labs/snapshot.js/dist/utils/provider").default, getSnapshots: typeof import("@snapshot-labs/snapshot.js/dist/utils/blockfinder").getSnapshots, SNAPSHOT_SUBGRAPH_URL: {
    1: string;
    5: string;
    10: string;
    56: string;
    100: string;
    137: string;
    250: string;
    42161: string;
};
declare const _default: {
    getScoresDirect: typeof getScoresDirect;
    multicall: typeof import("@snapshot-labs/snapshot.js/dist/utils").multicall;
    Multicaller: typeof import("@snapshot-labs/snapshot.js/dist/utils/multicaller").default;
    subgraphRequest: typeof import("@snapshot-labs/snapshot.js/dist/utils").subgraphRequest;
    ipfsGet: typeof import("@snapshot-labs/snapshot.js/dist/utils").ipfsGet;
    call: typeof import("@snapshot-labs/snapshot.js/dist/utils").call;
    getDelegatesBySpace: typeof import("@snapshot-labs/snapshot.js/dist/utils").getDelegatesBySpace;
    getBlockNumber: typeof import("@snapshot-labs/snapshot.js/dist/utils/web3").getBlockNumber;
    getProvider: typeof import("@snapshot-labs/snapshot.js/dist/utils/provider").default;
    getDelegations: typeof getDelegations;
    getSnapshots: typeof import("@snapshot-labs/snapshot.js/dist/utils/blockfinder").getSnapshots;
    SNAPSHOT_SUBGRAPH_URL: {
        1: string;
        5: string;
        10: string;
        56: string;
        100: string;
        137: string;
        250: string;
        42161: string;
    };
    getVp: typeof getVp;
    getCoreDelegations: typeof getCoreDelegations;
};
export default _default;
