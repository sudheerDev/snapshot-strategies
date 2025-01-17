"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategy = exports.version = exports.author = void 0;
const units_1 = require("@ethersproject/units");
const bignumber_1 = require("@ethersproject/bignumber");
const utils_1 = require("../../utils");
/**
 * @dev Calculate score based on Quadratic Voting system.Token balance comes from
 * - Mainnet HOPR token balance, read from multicall
 * - Gnosis chain, HOPR token balance, read from subgraph (xHOPR balance and wxHOPR balance) and multicall (mainnet HOPR balance)
 * - Gnosis chain. HOPR token staked into the most recent stake season, read from subgraph.
 */
exports.author = 'QYuQianchen';
exports.version = '0.1.0';
const XDAI_BLOCK_HOSTED_SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/1hive/xdai-blocks';
const QUERY_LIMIT = 1000; // 1000 addresses per query in Subgraph
const tokenAbi = ['function balanceOf(address) view returns (uint256)']; // get mainnet HOPR token balance
// const DEFAULT_HOPR_STAKING_ALL_SEASONS_PROD_SUBGRAPH_ID = 'DrkbaCvNGVcNH1RghepLRy6NSHFi8Dmwp4T2LN3LqcjY';
// const DEFAULT_HOPR_ON_GNOSIS_PROD_SUBGRAPH_ID = 'njToE7kpetd3P9sJdYQPSq6yQjBs7w9DahQpBj6WAoD';
const DEFAULT_HOPR_HOSTED_ACCOUNT_NAME = 'hoprnet';
const DEFAULT_HOPR_STAKING_ALL_SEASONS_HOSTED_SUBGRAPH_NAME = 'hopr-stake-all-seasons';
const DEFAULT_HOPR_BALANCE_ON_GNOSIS_HOSTED_SUBGRAPH_NAME = 'hopr-on-xdai';
function getStudioProdSubgraphUrl(apiKey, subgraphId) {
    return !apiKey
        ? null
        : `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${subgraphId}`;
}
function getStudioDevSubgraphUrl(accountStudioId, subgraphName, version) {
    return !accountStudioId
        ? null
        : `https://api.studio.thegraph.com/query/${accountStudioId}/${subgraphName}/${version}`;
}
function getHostedSubgraphUrl(accountName, subgraphName) {
    return `https://api.thegraph.com/subgraphs/name/${accountName}/${subgraphName}`;
}
/**
 * Try to query subgraphs from three differnt endpoints (hosted service, studio for development, studio in production), if applicable
 * @param hostedSubgraphUrl hosted subgrpah url
 * @param stuidoDevSubgraphUrl development url foro studio subgraph
 * @param studioProdSubgraphUrl production url foro studio subgraph
 * @param builtQuery query object
 * @returns null or an object of summed token balance per address
 */
async function subgraphRequestsToVariousServices(hostedSubgraphUrl, stuidoDevSubgraphUrl, studioProdSubgraphUrl, builtQuery) {
    try {
        // first try with hosted service
        return (0, utils_1.subgraphRequest)(hostedSubgraphUrl, builtQuery);
    }
    catch (error) {
        // console.log('Failed to get data from hostedSubgraphUrl');
    }
    // then try with studio dev service
    if (stuidoDevSubgraphUrl) {
        try {
            return (0, utils_1.subgraphRequest)(stuidoDevSubgraphUrl, builtQuery);
        }
        catch (error) {
            // console.log('Failed to get data from stuidoDevSubgraphUrl');
        }
    }
    // then try with studio prod service
    if (studioProdSubgraphUrl) {
        try {
            return (0, utils_1.subgraphRequest)(studioProdSubgraphUrl, builtQuery);
        }
        catch (error) {
            // console.log('Failed to get data from studioProdSubgraphUrl');
        }
    }
    return null;
}
/**
 * Get block number from Gnosis chain at a given timestamp.
 * The timestamp of the returned block should be no-bigger than the desired timestamp
 * @param timestamp number of timestamp
 * @param fallbackBlockNumber fallback block number on Gnosis chain, in case no result gets returned.
 * @returns a number
 */
async function getGnosisBlockNumber(timestamp, fallbackBlockNumber) {
    const query = {
        blocks: {
            __args: {
                first: 1,
                orderBy: 'number',
                orderDirection: 'desc',
                where: {
                    timestamp_lte: timestamp
                }
            },
            number: true,
            timestamp: true
        }
    };
    // query from subgraph
    const data = await subgraphRequestsToVariousServices(XDAI_BLOCK_HOSTED_SUBGRAPH_URL, null, null, query);
    return !data ? fallbackBlockNumber : Number(data.blocks[0].number);
}
async function stakingSubgraphQuery(hostedSubgraphUrl, stuidoDevSubgraphUrl, studioProdSubgraphUrl, seasonNumber, addresses, blockNumber, snapshot) {
    const query = {
        stakingParticipations: {
            __args: {
                first: QUERY_LIMIT,
                where: {
                    account_: {
                        id_in: addresses.map((adr) => adr.toLowerCase())
                    },
                    stakingSeason_: {
                        seasonNumber
                    }
                }
            },
            account: {
                id: true
            },
            actualLockedTokenAmount: true,
            airdropLockedTokenAmount: true,
            unclaimedRewards: true,
            virtualLockedTokenAmount: true
        }
    };
    if (snapshot !== 'latest') {
        // @ts-ignore
        query.stakingParticipations.__args.block = { number: blockNumber };
    }
    // query from subgraph
    const data = await subgraphRequestsToVariousServices(hostedSubgraphUrl, stuidoDevSubgraphUrl, studioProdSubgraphUrl, query);
    // map result (data.accounts) to addresses
    const entries = !data
        ? addresses.map((addr) => [addr, bignumber_1.BigNumber.from('0')])
        : data.stakingParticipations.map((d) => [
            d.account.id,
            bignumber_1.BigNumber.from(d.actualLockedTokenAmount)
                .add(bignumber_1.BigNumber.from(d.airdropLockedTokenAmount))
                .add(bignumber_1.BigNumber.from(d.virtualLockedTokenAmount))
                .add(bignumber_1.BigNumber.from(d.unclaimedRewards))
        ]);
    return Object.fromEntries(entries);
}
async function hoprTotalOnGnosisSubgraphQuery(hostedSubgraphUrl, stuidoDevSubgraphUrl, studioProdSubgraphUrl, addresses, blockNumber, snapshot) {
    const query = {
        accounts: {
            __args: {
                first: QUERY_LIMIT,
                where: {
                    id_in: addresses.map((adr) => adr.toLowerCase())
                }
            },
            id: true,
            totalBalance: true
        }
    };
    if (snapshot !== 'latest') {
        // @ts-ignore
        query.accounts.__args.block = { number: blockNumber };
    }
    // query from subgraph
    const data = await subgraphRequestsToVariousServices(hostedSubgraphUrl, stuidoDevSubgraphUrl, studioProdSubgraphUrl, query);
    // map result (data.accounts) to addresses
    const entries = !data
        ? addresses.map((addr) => [addr, bignumber_1.BigNumber.from('0')])
        : data.accounts.map((d) => [
            d.id,
            (0, units_1.parseUnits)(d.totalBalance.toString(), 18)
        ]);
    return Object.fromEntries(entries);
}
/**
 * Calculate the final score
 * @param shouldIncludeMainnetValue if the mainnet token balance should be taken into account
 * @param subgraphScore Sum of score from two subgraphs
 * @param mainnetTokenResults Multicall returned result, this should contain token balances in an array
 * @param index index of the current address
 * @returns squared root of the sum of subgraph scores and token amounts if the sum is above 1, if not, returns 0.
 */
function calculateScore(shouldIncludeMainnetValue, subgraphScore, mainnetTokenResults, index) {
    const summedAmount = shouldIncludeMainnetValue
        ? subgraphScore.add(bignumber_1.BigNumber.from(mainnetTokenResults[index].toString()))
        : subgraphScore;
    const summedAmountInEth = parseFloat((0, units_1.formatUnits)(summedAmount, 18));
    if (summedAmountInEth > 1) {
        return Math.sqrt(summedAmountInEth);
    }
    else {
        return 0;
    }
}
async function strategy(_space, network, provider, addresses, options, snapshot) {
    // Network must be Ethereum Mainnet
    if (network !== '1') {
        throw new Error('Wrong network! Please use mainnet.');
    }
    // Get the block on mainnet and find the corresponding time on Gnosis chain)
    const blockTag = typeof snapshot === 'number' ? snapshot : 'latest';
    // get token balance (if applicable) and block
    const [resHoprOnMainnet, block] = await Promise.all([
        options.useHoprOnMainnet
            ? (0, utils_1.multicall)(network, provider, tokenAbi, addresses.map((address) => [
                options.tokenAddress,
                'balanceOf',
                [address]
            ]), { blockTag })
            : [],
        provider.getBlock(blockTag)
    ]);
    // get the block number for subgraph query
    const subgraphBlock = await getGnosisBlockNumber(block.timestamp, options.fallbackGnosisBlock);
    // console.log(
    //   `Block on mainnet: ${block.number} and on Gnosis ${subgraphBlock}`
    // );
    // trim addresses to sub of "QUERY_LIMIT" addresses.
    const addressSubsets = Array.apply(null, Array(Math.ceil(addresses.length / QUERY_LIMIT))).map((_e, i) => addresses.slice(i * QUERY_LIMIT, (i + 1) * QUERY_LIMIT));
    let returnedFromSubgraphStake;
    if (options.useStake) {
        // construct URLs for stake season
        const hostedAllSeasonSubgraphUrl = getHostedSubgraphUrl(options.subgraphHostedAccountName ?? DEFAULT_HOPR_HOSTED_ACCOUNT_NAME, options.subgraphHostedAllSeasonSubgraphName ??
            DEFAULT_HOPR_STAKING_ALL_SEASONS_HOSTED_SUBGRAPH_NAME);
        const stuidoDevAllSeasonSubgraphUrl = getStudioDevSubgraphUrl(options.subgraphStudioDevAccountId, options.subgraphStudioDevAllSeasonSubgraphName, options.subgraphStudioDevAllSeasonVersion);
        const studioProdAllSeasonSubgraphUrl = getStudioProdSubgraphUrl(options.subgraphStudioProdQueryApiKey, options.subgraphStudioProdAllSeasonQueryId);
        // get subgraph result for stake season
        returnedFromSubgraphStake = await Promise.all(addressSubsets.map((subset) => stakingSubgraphQuery(hostedAllSeasonSubgraphUrl, stuidoDevAllSeasonSubgraphUrl, studioProdAllSeasonSubgraphUrl, options.season.toString(), subset, subgraphBlock, snapshot)));
    }
    let returnedFromSubgraphOnGnosis;
    if (options.useHoprOnGnosis) {
        // construct URLs for HOPR on Gnosis
        const hostedHoprOnGnosisSubgraphUrl = getHostedSubgraphUrl(options.subgraphHostedAccountName ?? DEFAULT_HOPR_HOSTED_ACCOUNT_NAME, options.subgraphHostedTokenOnGnosisSubgraphName ??
            DEFAULT_HOPR_BALANCE_ON_GNOSIS_HOSTED_SUBGRAPH_NAME);
        const stuidoDevHoprOnGnosisSubgraphUrl = getStudioDevSubgraphUrl(options.subgraphStudioDevAccountId, options.subgraphStudioDevHoprOnGnosisSubgraphName, options.subgraphStudioDevHoprOnGnosisVersion);
        const studioProdHoprOnGnosisSubgraphUrl = getStudioProdSubgraphUrl(options.subgraphStudioProdQueryApiKey, options.subgraphStudioProdHoprOnGnosisQueryId);
        // get subgraph result for hopr on gnosis
        returnedFromSubgraphOnGnosis = await Promise.all(addressSubsets.map((subset) => hoprTotalOnGnosisSubgraphQuery(hostedHoprOnGnosisSubgraphUrl, stuidoDevHoprOnGnosisSubgraphUrl, studioProdHoprOnGnosisSubgraphUrl, subset, subgraphBlock, snapshot)));
    }
    // get and parse balance from subgraph
    const subgraphStakeBalanceStake = Object.assign({}, ...returnedFromSubgraphStake);
    const subgraphStakeBalanceOnGnosis = Object.assign({}, ...returnedFromSubgraphOnGnosis);
    const subgraphScore = addresses.map((address) => (subgraphStakeBalanceStake[address.toLowerCase()] ?? bignumber_1.BigNumber.from('0')).add(subgraphStakeBalanceOnGnosis[address.toLowerCase()] ?? bignumber_1.BigNumber.from('0')));
    // return sqrt(subgraph score + hopr on mainet score)
    return Object.fromEntries(addresses.map((adr, i) => [
        adr,
        calculateScore(options.useHoprOnMainnet, subgraphScore[i], resHoprOnMainnet, i)
    ]));
}
exports.strategy = strategy;
