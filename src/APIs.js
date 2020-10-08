export class Token {
    constructor(name, address) {
        this.name = name;
        this.address = address;
    }
}

export class TokenContract {
    constructor(name, contracts = []) {
        this.name = name;
        this.contracts = contracts;
    }

    SetError(error) {
        this.error = error
    }
    SetContracts(contracts) {
        this.contracts = contracts
    }
}


export function CreatePairs(tokens) {
    // It is passed by reference and to avoid modifing the original array should copy it.
    const tokensCopy = [...tokens]

    let pairs = []

    tokensCopy.forEach((token, index) => {
        if (index > 0) {
            pairs.push([tokensCopy[0], token])
        }
    })
    tokensCopy.shift()
    if (tokens.length > 0) {
        pairs.push(...CreatePairs(tokensCopy))
    }
    return pairs
}

export async function TokenHolders(tokenAddress, APIkey) {
    var tokenHolders = [];
    let url = `https://api.bloxy.info/token/token_holders_list?token=${tokenAddress}&key=${APIkey}&format=json`;
    let resp = await fetch(url).then(response => response.json());

    if (resp.error !== undefined) {
        return { error: "Error getting a token holder for address:" + tokenAddress + " error:" + resp.error }
    }
    resp.forEach(holder => {
        if (holder.address_type !== "Wallet")
            tokenHolders.push(holder.address)
    })
    return tokenHolders
}

export function ConstructContractApiURL(holders, APIkey) {
    let contractsURL = "";
    holders.forEach(contract => {
        contractsURL = contractsURL + `smart_contract_address%5B%5D=${contract}&`
    })
    return `https://api.bloxy.info/smart_contract/stat?${contractsURL}&aggregated_by=all&chain=eth&key=${APIkey}&format=json`
}

export async function ContractHolders(tokens, fromDate, bloxyAPIkey, etherscanAPIkey) {
    return await Promise.all(
        tokens.map(async (token) => {
            let tHolders = await TokenHolders(token.address, bloxyAPIkey)
            let tokenContracts = new TokenContract(token.name)
            if (tHolders.error !== undefined) {
                tokenContracts.SetError(tHolders.error)
                return tokenContracts
            }
            if (tHolders.length === 0) {
                return tokenContracts
            }
            let url = ConstructContractApiURL(tHolders, bloxyAPIkey)

            let resp = await fetch(url).then(response => response.json())

            let respFilteredByAge = resp.filter(el => {
                let firstCall = Date.parse(el.first_call_at)
                return firstCall >= Date.parse(fromDate)
            })

            let contracts = await Promise.all(respFilteredByAge.map(async (contract) => {
                contract.address = contract.smart_contract_address
                contract.firstCall = contract.first_call_at
                contract.lastCall = contract.last_call_at
                contract.name = ""
                try {
                    if (etherscanAPIkey !== "") {
                        let contractNameApiURL = `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${contract.smart_contract_address}&apikey=${etherscanAPIkey}`
                        let resp = await fetch(contractNameApiURL).then(response => response.json())

                        if (resp.status === "1") {
                            contract.name = resp.result[0].ContractName
                        } else {
                            console.log("Error getting the contract name for address:" + contract.smart_contract_address + "error:" + resp.result)

                        }
                    }
                } catch { }
                return contract
            }))
            tokenContracts.SetContracts(contracts)
            return tokenContracts
        })
    )
}