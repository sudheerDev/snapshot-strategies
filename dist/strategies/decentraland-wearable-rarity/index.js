"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategy = exports.version = exports.author = void 0;
const address_1 = require("@ethersproject/address");
const utils_1 = require("../../utils");
exports.author = '2fd';
exports.version = '0.1.0';
const SUBGRAPH_QUERY_ADDRESSES_LIMIT = 2000;
const DECENTRALAND_COLLECTIONS_SUBGRAPH_URL = {
    '1': 'https://api.thegraph.com/subgraphs/name/decentraland/collections-ethereum-mainnet',
    '3': 'https://api.thegraph.com/subgraphs/name/decentraland/collections-ethereum-ropsten',
    '137': 'https://api.thegraph.com/subgraphs/name/decentraland/collections-matic-mainnet',
    '80001': 'https://api.thegraph.com/subgraphs/name/decentraland/collections-matic-mumbai'
};
function chunk(_array, pageSize) {
    const chunks = [];
    for (let i = 0; i < _array.length; i += pageSize) {
        chunks.push(_array.slice(i, i + pageSize));
    }
    return chunks;
}
async function strategy(space, network, provider, addresses, options, snapshot) {
    // initialize scores
    const scores = {};
    for (const address of addresses) {
        scores[(0, address_1.getAddress)(address)] = 0;
    }
    // if graph doesn't exist return automatically
    if (!DECENTRALAND_COLLECTIONS_SUBGRAPH_URL[network]) {
        return scores;
    }
    const chunks = chunk(addresses, SUBGRAPH_QUERY_ADDRESSES_LIMIT);
    // initialize multipliers and params
    const multiplers = options.multipliers || {};
    for (const chunk of chunks) {
        const params = {
            nfts: {
                __args: {
                    where: {
                        itemType_in: [
                            'wearable_v1',
                            'wearable_v2',
                            'smart_wearable_v1',
                            'emote_v1'
                        ],
                        owner_in: chunk.map((address) => address.toLowerCase()),
                        id_gt: ''
                    },
                    orderBy: 'id',
                    orderDirection: 'asc',
                    first: 1000
                },
                id: true,
                owner: {
                    id: true
                },
                searchWearableRarity: true
            }
        };
        if (options.collections) {
            // @ts-ignore
            params.nfts.__args.where.collection_in = options.collections;
        }
        if (snapshot !== 'latest') {
            // @ts-ignore
            params.nfts.__args.block = { number: snapshot };
        }
        // load and add each wearable by rarity
        let hasNext = true;
        while (hasNext) {
            const result = await (0, utils_1.subgraphRequest)(DECENTRALAND_COLLECTIONS_SUBGRAPH_URL[network], params);
            const nfts = result && result.nfts ? result.nfts : [];
            const latest = nfts[nfts.length - 1];
            for (const wearable of nfts) {
                const userAddress = (0, address_1.getAddress)(wearable.owner.id);
                const rarity = String(wearable.searchWearableRarity)
                    .toLowerCase()
                    .trim();
                scores[userAddress] =
                    (scores[userAddress] ?? 0) + (multiplers[rarity] ?? 0);
            }
            hasNext = nfts.length === params.nfts.__args.first;
            if (hasNext) {
                params.nfts.__args.where.id_gt = latest?.id || '';
            }
        }
    }
    // return result
    return scores;
}
exports.strategy = strategy;
