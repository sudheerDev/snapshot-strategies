"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategy = exports.version = exports.author = void 0;
const address_1 = require("@ethersproject/address");
const bignumber_1 = require("@ethersproject/bignumber");
const utils_1 = require("../../utils");
const MASTERCHEF_SUBGRAPH_URL = {
    '1': 'https://api.thegraph.com/subgraphs/name/sushiswap/master-chef'
};
const SUSHISWAP_SUBGRAPH_URL = {
    '1': 'https://api.thegraph.com/subgraphs/name/sushiswap/exchange'
};
exports.author = '0xKiwi';
exports.version = '0.1.0';
async function strategy(_space, network, _provider, addresses, options, snapshot) {
    const tokenAddress = options.address.toLowerCase();
    const sushiPools0Params = {
        pairs: {
            __args: {
                where: {
                    token0: tokenAddress
                },
                first: 100
            },
            id: true,
            token0: {
                id: true
            },
            reserve0: true,
            token1: {
                id: true
            },
            reserve1: true,
            totalSupply: true
        }
    };
    const sushiPools1Params = {
        pairs: {
            __args: {
                where: {
                    token1: tokenAddress
                },
                first: 100
            },
            id: true,
            token0: {
                id: true
            },
            reserve0: true,
            token1: {
                id: true
            },
            reserve1: true,
            totalSupply: true
        }
    };
    if (snapshot !== 'latest') {
        // @ts-ignore
        sushiPools0Params.pairs.__args.block = { number: snapshot };
        // @ts-ignore
        sushiPools1Params.pairs.__args.block = { number: snapshot };
    }
    const sushiPools0Result = await (0, utils_1.subgraphRequest)(SUSHISWAP_SUBGRAPH_URL[network], sushiPools0Params);
    const sushiPools1Result = await (0, utils_1.subgraphRequest)(SUSHISWAP_SUBGRAPH_URL[network], sushiPools1Params);
    if (!sushiPools0Result || !sushiPools1Result) {
        return;
    }
    const allSushiPools = sushiPools0Result.pairs.concat(sushiPools1Result.pairs);
    const pools = allSushiPools.map(({ id }) => id.toLowerCase());
    const masterchefParams = {
        pools: {
            __args: {
                where: {
                    pair_in: pools
                },
                first: 100
            },
            id: true,
            pair: true,
            users: {
                __args: {
                    where: {
                        amount_gt: 0,
                        address_in: addresses.map((address) => address.toLowerCase())
                    }
                },
                address: true,
                amount: true
            }
        }
    };
    if (snapshot !== 'latest') {
        // @ts-ignore
        masterchefParams.pools.__args.block = { number: snapshot };
    }
    const masterchefResult = await (0, utils_1.subgraphRequest)(MASTERCHEF_SUBGRAPH_URL[network], masterchefParams);
    const one_gwei = bignumber_1.BigNumber.from(10).pow(9);
    let stakedBalances = [];
    if (masterchefResult && masterchefResult.pools.length == 1) {
        stakedBalances = masterchefResult.pools[0].users.map((u) => {
            return {
                address: u.address,
                amount: u.amount
            };
        });
    }
    const score = {};
    if (allSushiPools && allSushiPools.length > 0) {
        // We assume there is only one pool in masterchef here, for simplicity.
        const pair = allSushiPools.filter(({ id }) => id == masterchefResult.pools[0].pair)[0];
        // console.log(pair);
        const token0perUni = pair.reserve0 / pair.totalSupply;
        const token1perUni = pair.reserve1 / pair.totalSupply;
        stakedBalances.forEach((u) => {
            const userScore = (u.amount / one_gwei.toNumber()) *
                (pair.token0.id == tokenAddress ? token0perUni : token1perUni);
            const userScoreInEther = userScore / one_gwei.toNumber();
            const userAddress = (0, address_1.getAddress)(u.address);
            if (!score[userAddress])
                score[userAddress] = 0;
            score[userAddress] = score[userAddress] + userScoreInEther;
        });
    }
    return score || {};
}
exports.strategy = strategy;
