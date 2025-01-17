"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategy = exports.version = exports.author = void 0;
const cross_fetch_1 = __importDefault(require("cross-fetch"));
const erc20_balance_of_1 = require("../erc20-balance-of");
exports.author = 'rawrjustin';
exports.version = '0.1.0';
const calculateVotingPower = (inputAddresses, addressScores, walletMap) => {
    const userVotingPower = {};
    inputAddresses.forEach((input) => {
        let count = 0.0;
        walletMap[input.toLowerCase()].forEach((address) => {
            count += addressScores[address];
        });
        userVotingPower[input] = count;
    });
    return userVotingPower;
};
async function strategy(space, network, provider, addresses, options, snapshot) {
    // Get the wallet mapping from proxy wallets to actual wallets
    const url = 'https://api.proxychat.xyz/external/v0/getProxyWalletMappings';
    const params = {
        proxyAddresses: addresses
    };
    const response = await (0, cross_fetch_1.default)(url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
    });
    const data = await response.json();
    // Flatten the wallet mapping so it's an array of real wallets to query for tokens
    const arrayOfProxyWallets = Object.keys(data).map(function (key) {
        return data[key];
    });
    const flattenedWalletAddresses = [].concat.apply([], arrayOfProxyWallets);
    // Query for token holdings
    const addressScores = await (0, erc20_balance_of_1.strategy)(space, network, provider, flattenedWalletAddresses, options, snapshot);
    // Calculate the voting power across all wallets and map it back to original Proxy wallets.
    return calculateVotingPower(addresses, addressScores, data);
}
exports.strategy = strategy;
