"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategy = exports.bdToBn = exports.version = exports.author = void 0;
const address_1 = require("@ethersproject/address");
const utils_1 = require("../../utils");
const units_1 = require("@ethersproject/units");
const bignumber_1 = require("@ethersproject/bignumber");
const oceanUtils_1 = require("./oceanUtils");
exports.author = 'w1kke';
exports.version = '0.1.0';
const OCEAN_ERC20_DECIMALS = 18;
const OCEAN_SUBGRAPH_URL = {
    '1': 'https://subgraph.mainnet.oceanprotocol.com/subgraphs/name/oceanprotocol/ocean-subgraph',
    '42': 'https://subgraph.rinkeby.oceanprotocol.com/subgraphs/name/oceanprotocol/ocean-subgraph',
    '56': 'https://subgraph.bsc.oceanprotocol.com/subgraphs/name/oceanprotocol/ocean-subgraph',
    '137': 'https://subgraph.polygon.oceanprotocol.com/subgraphs/name/oceanprotocol/ocean-subgraph'
};
// Returns a BigDecimal as a BigNumber with 10^decimals extra zeros
function bdToBn(bd, decimals) {
    let bn;
    const splitDecimal = bd.split('.');
    if (splitDecimal.length > 1) {
        bn = `${splitDecimal[0]}.${splitDecimal[1].slice(0, decimals - splitDecimal[0].length - 1)}`;
    }
    else {
        bn = `${splitDecimal[0]}`;
    }
    const bn2 = (0, units_1.parseUnits)(bn, decimals);
    return bn2;
}
exports.bdToBn = bdToBn;
async function strategy(space, network, provider, addresses, options, snapshot) {
    const params = {
        pools: {
            __args: {
                first: 1000,
                orderBy: 'oceanReserve',
                orderDirection: 'desc'
            },
            active: true,
            totalShares: true,
            holderCount: true,
            oceanReserve: true,
            shares: {
                __args: {
                    where: {
                        userAddress_in: addresses.map((address) => address.toLowerCase())
                    },
                    orderBy: 'balance',
                    orderDirection: 'desc'
                },
                userAddress: {
                    id: true
                },
                balance: true
            }
        }
    };
    if (snapshot !== 'latest') {
        // @ts-ignore
        params.pools.__args.block = { number: +snapshot };
    }
    // Retrieve the top 1000 pools
    const graphResults = await (0, utils_1.subgraphRequest)(OCEAN_SUBGRAPH_URL[network], params);
    // Get total votes, for ALL addresses, inside top 1000 pools, with a minimum of 0.0001 shares
    const score = {};
    const userAddresses = [];
    const return_score = {};
    if (graphResults && graphResults.pools) {
        graphResults.pools.forEach((pool) => {
            if (pool.holderCount > 0 && pool.active) {
                pool.shares.map((share) => {
                    const userAddress = (0, address_1.getAddress)(share.userAddress.id);
                    if (!userAddresses.includes(userAddress))
                        userAddresses.push(userAddress);
                    if (!score[userAddress])
                        score[userAddress] = bignumber_1.BigNumber.from(0);
                    const userShare = share.balance * (pool.oceanReserve / pool.totalShares);
                    if (userShare > 0.0001) {
                        score[userAddress] = score[userAddress].add(bdToBn(userShare.toString(), OCEAN_ERC20_DECIMALS));
                    }
                });
            }
        });
        // We then sum total votes, per user address
        userAddresses.forEach((address) => {
            const parsedSum = parseFloat((0, units_1.formatUnits)(score[address], OCEAN_ERC20_DECIMALS));
            return_score[address] = parsedSum;
        });
    }
    // We then filter only the addresses expected
    const results = Object.fromEntries(Object.entries(return_score).filter(([k]) => addresses.indexOf(k) >= 0));
    // Test validation: Update examples.json w/ expectedResults to reflect LPs @ blockHeight
    // Success criteria: Address scores and length, must match expectedResults. Order not validated.
    // From GRT's graphUtils.ts => verifyResults => Scores need to match expectedResults.
    // npm run test --strategy=ocean-marketplace | grep -E 'SUCCESS|ERROR'
    if (options.expectedResults) {
        const expectedResults = {};
        Object.keys(options.expectedResults.scores).forEach(function (key) {
            expectedResults[key] = results[key];
        });
        (0, oceanUtils_1.verifyResults)(JSON.stringify(expectedResults), JSON.stringify(options.expectedResults.scores), 'Scores');
        (0, oceanUtils_1.verifyResultsLength)(Object.keys(expectedResults).length, Object.keys(options.expectedResults.scores).length, 'Scores');
    }
    return results || {};
}
exports.strategy = strategy;
