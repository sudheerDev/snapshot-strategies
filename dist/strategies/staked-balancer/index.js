"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategy = exports.version = exports.author = void 0;
const utils_1 = require("../../utils");
const address_1 = require("@ethersproject/address");
const utils_2 = require("../../utils");
exports.author = 'jo-chemla';
exports.version = '0.1.0';
const erc20ABI = [
    'function balanceOf(address account) external view returns (uint256)',
    'function totalSupply() external view returns (uint256)'
];
const BALANCER_SUBGRAPH_URL_ROOT = 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer';
const NETWORK_KEY = {
    '1': '',
    '42': '-kovan',
    '137': '-polygon',
    '42161': '-arbitrum'
};
function buildBalancerSubgraphUrl(chainId, version) {
    const networkString = NETWORK_KEY[chainId];
    const versionString = version == 2 ? '-v2' : '';
    return `${BALANCER_SUBGRAPH_URL_ROOT}${networkString}${versionString}`;
}
const params = {
    pool: {
        __args: { id: '' },
        totalShares: true,
        tokens: {
            __args: {
                where: { address: '' }
            },
            balance: true,
            address: true
        },
        shares: {
            __args: {
                where: {
                    userAddress_in: [],
                    balance_gt: 0
                }
            },
            userAddress: {
                id: true
            },
            balance: true
        }
    }
};
async function strategy(space, network, provider, addresses, options, snapshot) {
    // @ts-ignore
    params.pool.__args.id = options.balancerPoolId;
    params.pool.tokens.__args.where.address = options.tokenAddress;
    // @ts-ignore
    params.pool.shares.__args.where.userAddress_in = [options.stakingContract];
    if (snapshot !== 'latest') {
        // @ts-ignore
        params.pool.__args.block = { number: snapshot };
    }
    // iterate through Balancer V1 & V2 Subgraphs
    const score = {};
    for (let version = 1; version <= 2; version++) {
        // Skip attempt to query subgraph on networks where V1 isn't deployed
        if (network != 1 && network != 42 && version === 1)
            continue;
        // @ts-ignore
        const url = buildBalancerSubgraphUrl(network, version);
        const result = await (0, utils_2.subgraphRequest)(url, params);
        if (result && result.pool) {
            const pool = result.pool;
            // Since we did the filter where token address, we are sure tokens[0] is what we are looking for
            // Idem, first share of pool.shares is that of staking contract
            const tokensPerStkLP = pool.tokens[0].balance * (pool.shares[0].balance / pool.totalShares);
            // Call totalSupply stakingContract and balanceOf stakingContract token of every address
            const blockTag = typeof snapshot === 'number' ? snapshot : 'latest';
            const res = await (0, utils_1.multicall)(network, provider, erc20ABI, [[options.stakingContract, 'totalSupply', []]].concat(addresses.map((address) => [
                options.stakingContract,
                'balanceOf',
                [address]
            ])), { blockTag });
            const stkTotalSupply = res[0].toString(10);
            const response = res.slice(1);
            response.forEach((value, i) => {
                const userAddress = (0, address_1.getAddress)(addresses[i]);
                score[userAddress] = (value / stkTotalSupply) * tokensPerStkLP;
            });
        }
    }
    return score || {};
}
exports.strategy = strategy;
