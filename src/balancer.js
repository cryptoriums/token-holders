// import sor from '@balancer-labs/sor';
import { CreatePairs, ContractHolders, Token, TokenContract } from './APIs.js';
const sor = require('@balancer-labs/sor');

export async function Contracts(tokens, fromDate, bloxyAPIkey, etherscanAPIkey) {
    let tokenPairs = CreatePairs(tokens)
    let poolTokens = []
    let error
    let errors = await Promise.all(tokenPairs.map(async (pair) => {
        let tokenContracts = new TokenContract(pair[0].name + "-" + pair[1].name)
        try {
            let tkns = await tokenAddresses(pair[0], pair[1])
            if (tkns.error !== undefined) {
                throw Error(tkns.error)
            }
            tkns.forEach(
                token => poolTokens.push(token)
            )
        } catch (e) {
            error = true
            tokenContracts.SetError(e.message)
            return tokenContracts
        }
    }))

    if (error !== undefined) {
        return errors
    }
    return await ContractHolders(poolTokens, fromDate, bloxyAPIkey, etherscanAPIkey)
}

async function tokenAddresses(tokenIn, tokenOut) {
    let tokenAddresses = []
    try {
        let data = await sor.getPoolsWithTokens(tokenIn.address, tokenOut.address);
        let poolData = sor.parsePoolData(data.pools, tokenIn.address, tokenOut.address);
        poolData.forEach(pool => {
            let name = tokenIn.name + "_" + pool.weightIn.c[0] / 100 + "%-" + tokenOut.name + "_" + pool.weightOut.c[0] / 100 + "%"
            tokenAddresses.push(new Token(name, pool.id))
        })
    } catch (e) {
        return { error: e.message }
    }
    return tokenAddresses
}
