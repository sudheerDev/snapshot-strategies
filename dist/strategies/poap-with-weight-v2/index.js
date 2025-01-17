"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategy = exports.version = exports.author = void 0;
const address_1 = require("@ethersproject/address");
const utils_1 = require("../../utils");
exports.author = 'gawainb';
exports.version = '2.1.0';
const POAP_API_ENDPOINT_URL = {
    '1': 'https://api.thegraph.com/subgraphs/name/poap-xyz/poap',
    '100': 'https://api.thegraph.com/subgraphs/name/poap-xyz/poap-xdai'
};
// subgraph query in filter has max length of 500
const EVENT_IDS_LIMIT = 500;
const MAX_TOKENS_PER_PAGE = 1000;
async function strategy(_space, network, _provider, addresses, options, snapshot) {
    if (options.eventIds.length > EVENT_IDS_LIMIT) {
        throw new Error(`Max number (${EVENT_IDS_LIMIT}) of event ids exceeded`);
    }
    const eventIds = options.eventIds.map((eventId) => eventId.id);
    const addressesMap = addresses.reduce((map, address) => {
        map[(0, address_1.getAddress)(address)] = 0;
        return map;
    }, {});
    const query = {
        tokens: {
            __args: {
                where: {
                    event_: {
                        id_in: eventIds
                    },
                    owner_in: addresses.map((a) => a.toLowerCase())
                },
                first: MAX_TOKENS_PER_PAGE,
                skip: 0
            },
            event: {
                id: true,
                tokenCount: true
            },
            id: true,
            owner: {
                id: true
            }
        }
    };
    if (snapshot !== 'latest') {
        query.tokens.__args['block'] = { number: snapshot };
    }
    while (true) {
        const supplyResponse = await (0, utils_1.subgraphRequest)(POAP_API_ENDPOINT_URL[network], query);
        if (supplyResponse && supplyResponse.tokens) {
            const eventIdsWeightMap = options.eventIds.reduce((map, { id, weight }) => {
                map[id] = weight;
                return map;
            }, {});
            supplyResponse.tokens.forEach((token) => {
                const tokenOwnerId = (0, address_1.getAddress)(token.owner.id);
                if (addressesMap[tokenOwnerId] === undefined)
                    return;
                addressesMap[tokenOwnerId] +=
                    eventIdsWeightMap[token.event.id] * parseInt(token.event.tokenCount);
            });
        }
        // if the number of tokens received is less than the max per page,
        // then we have received all the tokens and can stop making requests
        if (supplyResponse?.tokens?.length < MAX_TOKENS_PER_PAGE) {
            break;
        }
        query.tokens.__args.skip += MAX_TOKENS_PER_PAGE;
    }
    return addressesMap;
}
exports.strategy = strategy;
