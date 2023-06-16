"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategy = exports.version = exports.author = void 0;
const utils_1 = require("../../utils");
const __1 = __importDefault(require(".."));
exports.author = 'sirpy';
exports.version = '1.0.0';
async function strategy(space, network, provider, addresses, options, snapshot) {
    const promises = [];
    const validStrategies = options.strategies
        .filter((s) => s.network === '122' || s.network === '1')
        .slice(0, 2);
    const blocks = await (0, utils_1.getSnapshots)(network, snapshot, provider, validStrategies.map((s) => s.network || network));
    for (const strategy of validStrategies) {
        // If snapshot is taken before a network is activated then ignore its strategies
        if (options.startBlocks &&
            blocks[strategy.network] < options.startBlocks[strategy.network]) {
            continue;
        }
        promises.push(__1.default[strategy.name].strategy(space, strategy.network, (0, utils_1.getProvider)(strategy.network), addresses, strategy.params, blocks[strategy.network]));
    }
    const results = await Promise.all(promises);
    return results.reduce((finalResults, strategyResult) => {
        for (const [address, value] of Object.entries(strategyResult)) {
            if (!finalResults[address]) {
                finalResults[address] = 0;
            }
            finalResults[address] = Math.max(finalResults[address], value);
        }
        return finalResults;
    }, {});
}
exports.strategy = strategy;