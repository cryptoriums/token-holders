import { Contracts as BalancerContracts } from './balancer.js';
import { Contracts as UniswapContracts } from './uniswap.js';
import { ContractHolders, Token } from './APIs.js';

import React from 'react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import ReactDOM from 'react-dom';
import './index.css';
import * as serviceWorker from './serviceWorker';

const moment = require('moment');

const loadState = function (name) {
  let value = []
  try {
    value = JSON.parse(localStorage.getItem(name))
  } catch {
  }
  return value;
}


class FormsManager extends React.Component {
  saveState = (name, value) => {
    localStorage.setItem(name, JSON.stringify(value));
    this.setState({ [name]: value });
  }

  setLoaderState = function (name, state) {
    let loaders = this.state.loaders
    loaders[name] = state
    this.setState({ loaders: loaders })
  }


  // handle input change
  handleInputChange = (e, index, stateName) => {
    const { name, value } = e.target;
    if (stateName === undefined) {
      stateName = name
    }
    const list = [...this.state[stateName]];
    list[index][name] = value;
    this.saveState(stateName, list);
  };

  // handle click event of the Remove button
  handleRemoveClick = (index, stateName) => {
    const list = [...this.state[stateName]];
    list.splice(index, 1);
    this.saveState(stateName, list);
  };

  // handle click event of the Add button
  handleAddClick = (item, stateName) => {
    this.saveState(stateName, [...this.state[stateName], item]);
  };
}

class TokensInput extends FormsManager {

  componentDidMount() {
    let tokens = loadState("tokens")
    if (tokens === null) {
      tokens = [{ name: "", address: "" }]
    }
    this.saveState("tokens", tokens);
  }

  render() {
    let tokens = loadState("tokens")
    if (tokens === null) {
      tokens = [{ name: "", address: "" }]
    }
    return (
      <div key="boxWrap">
        {tokens.map((x, i) => {
          return (
            <div key={"box" + i} className="box">
              <label>{tokens.length - 1 === i ? <button onClick={() => this.handleAddClick({ name: "", address: "" }, "tokens")}>Add</button> : '\u00A0'}</label>
              <input key={"name" + i} name="name" placeholder="Token Name" value={x.name} onChange={e => this.handleInputChange(e, i, "tokens")} />
              <input key={"address" + i} name="address" placeholder="Token address" value={x.address} onChange={e => this.handleInputChange(e, i, "tokens")} />
              {tokens.length !== 1 && <button className="mr10" onClick={e => this.handleRemoveClick(i, "tokens")}>Remove</button>}

            </div>
          );
        })}
      </div>
    );
  }
}

class Main extends FormsManager {
  constructor(props) {
    super(props);
    this.state = { result: [], loaders: {} }
  };
  handleSubmit(event) {
    event.preventDefault();
    this.setState({ result: [] })

    let stateTokens = loadState("tokens")
    let setup = loadState("setup")[0]

    let tokens = []
    let hasEmpty
    stateTokens.forEach(token => {
      if (token.address === "" || token.name === "") {
        hasEmpty = true
        return
      }
      tokens.push(new Token(token.name, token.address))
    })
    if (hasEmpty != undefined) {
      alert("tokens with empty name or addres are ignored")
    }

    let singles = async () => {
      let name = "SINGLE TOKENS"

      this.setLoaderState(name, true)

      let response = await ContractHolders(tokens, setup.fromDate, setup.bloxyAPIkey, setup.etherscanAPIkey)
      const list = [...this.state.result];
      list.push({
        providerName: name,
        tokenHolders: response
      })
      this.setState({ result: list })

      this.setLoaderState(name, false)
    }
    singles()

    let balancer = async () => {
      let name = "BALANCER"

      this.setLoaderState(name, true)

      let response = await BalancerContracts(tokens, setup.fromDate, setup.bloxyAPIkey, setup.etherscanAPIkey)
      const list = [...this.state.result];
      list.push({
        providerName: name,
        tokenHolders: response
      })
      this.setState({ result: list })

      this.setLoaderState(name, false)
    }
    balancer()

    let uniswap = async () => {
      let name = "UNISWAP"

      this.setLoaderState(name, true)

      let response = await UniswapContracts(tokens, setup.fromDate, setup.bloxyAPIkey, setup.etherscanAPIkey)
      const list = [...this.state.result];
      list.push({
        providerName: name,
        tokenHolders: response
      })
      this.setState({ result: list })

      this.setLoaderState(name, false)
    }
    uniswap()

  }

  componentDidMount() {
    let setup = loadState("setup")
    if (setup === null) {
      setup = [{ fromDate: new Date(), bloxyAPIkey: "", etherscanAPIkey: "" }]
    }
    this.saveState("setup", setup);
  }
  render() {
    let setup = loadState("setup")
    if (setup === null) {
      setup = [{ fromDate: new Date(), bloxyAPIkey: "", etherscanAPIkey: "" }]
    }
    setup = setup[0]

    return <form>

      <label>Bloxy API key</label><input name="bloxyAPIkey" type="text" value={setup.bloxyAPIkey} onChange={e => this.handleInputChange(e, 0, "setup")}></input><br />
      <label>Etherscan API key</label><input placeholder="optional" name="etherscanAPIkey" type="text" value={setup.etherscanAPIkey} onChange={e => this.handleInputChange(e, 0, "setup")}></input><br />
      <label>From date</label><DatePicker name="fromDate" required dateFormat="dd/MM/yyyy" selected={new Date(setup.fromDate)} onChange={value => this.handleInputChange({ target: { name: "fromDate", value: value } }, 0, "setup")} />
      <TokensInput />
      <div style={{ clear: "both" }}>
        <ul>
          <li>Etherscan API key is needed only if you want the contract names.</li>
          <li>The free Etherscan API is rate limited so contract names are showing only for the first 10 results.</li>
          <li>It is expected to get some errors for the UNISWAP pairs as fetching tests all vairations and UNISWAP returns different results for WETH-USDC vs USDC-WETH</li>
        </ul>
      </div>
      <input type="submit" value="Submit" onClick={e => this.handleSubmit(e)} />
      {
        Object.entries(this.state.loaders).map(([name, isLoading]) => {
          return isLoading && <h2 className="fade">{name}</h2>
        })
      }
      {
        this.state.result.map((provider) => {
          return <div>
            <h2>{provider.providerName}</h2><br />
            {provider.tokenHolders.map((token) => {
              return <div>
                {(token.contracts.length > 0 || token.error !== undefined) && <h4 style={{ margin: 0 }}>  {token.name} < br /></h4>}
                {token.error !== undefined ? < div > {token.error}</div> : token.contracts.map((contract) => {
                  return <div style={{ clear: 'both' }}>
                    <a style={{ width: 24 + 'em', display: 'block', float: 'left' }} target="_blank" rel="noopener noreferrer" href={"https://etherscan.io/address/" + contract.address}>{contract.address}</a>
                    <div style={{ width: 8 + 'em', float: 'left' }}>{contract.type}</div>
                    {contract.name} {contract.annotation}<br />
                    <label>first call:</label>{moment(contract.firstCall).fromNow()}<br />
                    <label>last call:</label>{moment(contract.lastCall).fromNow()}
                    <br /><br />
                  </div>
                })
                }
              </div>
            })
            }
          </div>
        })
      }
    </form >;
  }
}

const element = <Main />

ReactDOM.render(element, document.getElementById("root"));
serviceWorker.unregister();

