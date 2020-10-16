import { FACTORY_ADDRESS, INIT_CODE_HASH } from '@uniswap/sdk'
import { pack, keccak256 } from '@ethersproject/solidity'
import { getCreate2Address } from '@ethersproject/address'
import { CreatePairs, ContractHolders, Token, TokenContract } from './APIs.js';

export async function Contracts(tokens, fromDate, bloxyAPIkey, etherscanAPIkey) {
    let tokenPairs = CreatePairs(tokens)
    let poolTokens = []
    let error
    let errors = await Promise.all(tokenPairs.map(async (pair) => {
        let tokenContract = new TokenContract(pair[0].name + "-" + pair[1].name)
        try {
            let token = getCreate2Address(
                FACTORY_ADDRESS,
                keccak256(['bytes'], [pack(['address', 'address'], [pair[0].address, pair[1].address])]),
                INIT_CODE_HASH
            )
            poolTokens.push(new Token(`${pair[0].name}-${pair[1].name}`, token))

            let tokenSwapped = getCreate2Address(
                FACTORY_ADDRESS,
                keccak256(['bytes'], [pack(['address', 'address'], [pair[1].address, pair[0].address])]),
                INIT_CODE_HASH
            )
            poolTokens.push(new Token(`${pair[1].name}-${pair[0].name}`, tokenSwapped))
        } catch (e) {
            error = true
            tokenContract.SetError(e.message)
        }
        return tokenContract
    }));

    if (error !== undefined) {
        return errors
    }

    return await ContractHolders(poolTokens, fromDate, bloxyAPIkey, etherscanAPIkey)
}