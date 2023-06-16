"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategy = exports.version = exports.author = void 0;
const units_1 = require("@ethersproject/units");
const utils_1 = require("../../utils");
exports.author = 'mitesh-mutha';
exports.version = '0.1.0';
const poolInfoAddressForNetwork = {
    1: '0x01356d78c770840166C1654691D19Bd33C52EaAd',
    10: '0x3cAA041d1a0a78d141703C0E95408c1801Ed74dd',
    42: '0x91EB59690526b748FE1046D27BdB1B3dadeaf958',
    137: '0x53590f017d73bAb31A6CbCBF6500A66D92fecFbE'
};
const poolInfoABI = [
    'function rewards(address pool, address addr) external view returns (uint256[])'
];
const poolABI = ['function rewardTokens() external view returns (address[])'];
const tokenABI = ['function decimals() external view returns (uint8)'];
async function strategy(space, network, provider, addresses, options, snapshot) {
    const blockTag = typeof snapshot === 'number' ? snapshot : 'latest';
    // Network specific pool info contract address
    const poolInfoContractAddress = poolInfoAddressForNetwork[network];
    // Determine which token rewards to count for voting power
    let tokenIndex = 0;
    const tokenCallResult = await (0, utils_1.multicall)(network, provider, poolABI, [[options.pool, 'rewardTokens', []]], { blockTag });
    const rewardTokens = tokenCallResult[0].map((tokenAddress) => [
        tokenAddress.toString().toLowerCase()
    ]);
    if (!(options.rewardToken == null)) {
        tokenIndex = Math.max(rewardTokens.indexOf(options.rewardToken.toLowerCase()), 0);
    }
    // Determine decimals
    const rewardTokenAddress = tokenCallResult[0][tokenIndex].toString();
    const decimalCallResult = await (0, utils_1.multicall)(network, provider, tokenABI, [[rewardTokenAddress, 'decimals', []]], { blockTag });
    const decimals = decimalCallResult[0];
    // Get the pending rewards for addresses
    const multi = new utils_1.Multicaller(network, provider, poolInfoABI, { blockTag });
    addresses.forEach((address) => multi.call(address, poolInfoContractAddress, 'rewards', [
        options.pool,
        address
    ]));
    const result = await multi.execute();
    return Object.fromEntries(Object.entries(result).map(([address, balances]) => [
        address,
        parseFloat((0, units_1.formatUnits)(balances[tokenIndex], decimals))
    ]));
}
exports.strategy = strategy;
