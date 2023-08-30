import logo from './logo.svg';
import './App.css';
import { useEffect, useState } from 'react';

import { ethers, HDNodeWallet, Mnemonic } from 'ethers';

//const provider = new ethers.JsonRpcProvider("http://127.0.0.1:7545");

function App() {

  const [mnomic, setMnomic] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedChain, setSelectedChain] = useState(80001);
  const [loading, setLoading] = useState(false);

  const [senderAccount, setSenderAccount] = useState({});
  const [mutipleSenderAccount, setMultipleSenderAccount] = useState([]);
  const [recieverAccount, setRecieverAccount] = useState({});
  const [inputAmount, setInputAmount] = useState(0);

  const [minTransferableAmount, setMinTransferableAmount] = useState(0);
  const [maxTransferableAmount, setMaxTransferableAmount] = useState(0);
  const [transactionHash, setTransactionHash] = useState('');
  const [multiTransactionHash, setMultiTransactionHash] = useState([]);

  const [alertType, setAlertType] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    if (selectedChain > 0) {
      fetchAccounts();
    }
  }, [selectedChain])

  useEffect(() => {
    if (showAlert) {
      setTimeout(() => {
        setAlertType("");
        setAlertMessage("");
        setShowAlert(false);
      }, 3000);
    }
  }, [showAlert])

  useEffect(() => {
    if (senderAccount.address !== undefined) {
      setMinTransferableAmount(getGasForChain() + 1);
      (async () => {
        const maxAmount = await getMaxTransferableAmount(senderAccount, true);
        setMaxTransferableAmount(ethers.formatEther(maxAmount));
      })();

    }
  }, [senderAccount])

  useEffect(() => {
    console.log(mutipleSenderAccount);
  }, [mutipleSenderAccount]);

  const getAlertBox = () => {
    if (alertType === "success") {
      return (<div className="alert alert-success" role="alert">
        {alertMessage}
      </div>)
    }
    else if (alertType === "danger") {
      return (<div className="alert alert-danger" role="alert">
        {alertMessage}
      </div>)
    }
  }

  const getEthBalance = (wei) => {
    return Math.round((ethers.formatEther(wei)) * 10000) / 10000;
  }

  const fetchAccounts = async () => {
    if ((mnomic.trim() !== "" && mnomic.split(' ').length === 12)) {
      setLoading(true);
      //const provider = new ethers.JsonRpcProvider("http://127.0.0.1:7545");

      const provider = getProvider(selectedChain);
      console.log(provider);

      const mnemonic = Mnemonic.fromPhrase(mnomic.trim());

      let temp = [];
      for (let index = 0; index < 10; index++) {
        const wallet = HDNodeWallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${index}`);
        //console.log(wallet);
        //console.log(await wallet.getAddress());
        //console.log(await wallet.privateKey);
        let address = await wallet.getAddress();
        let privateKey = await wallet.privateKey;

        let balance = await provider.getBalance(address);
        temp.push({ address: address, privateKey: privateKey, balance: balance, eth: getEthBalance(balance) });
      }
      //console.log(temp);
      setAddresses(temp.map(({ address }) => address).join('\n'));
      setAccounts(temp);
      setLoading(false);
    }
  }

  const getAccountDetails = (address) => {
    let temp = accounts.find((account) => {
      return account.address === address;
    })

    //console.log(temp);
    return temp;
  }

  const getProvider = (networkId) => {
    if (parseInt(networkId) === 97) //Smart Chain - Testnet
      return new ethers.JsonRpcProvider("https://data-seed-prebsc-1-s1.binance.org:8545/");
    else if (parseInt(networkId) === 80001) //Polygon Mumbai
      return new ethers.JsonRpcProvider("https://rpc-mumbai.maticvigil.com");
    else if (parseInt(networkId) === 11155111) //Sepolia
      return new ethers.JsonRpcProvider("https://eth-sepolia.g.alchemy.com/v2/demo");//return new ethers.JsonRpcProvider("https://endpoints.omniatech.io/v1/eth/sepolia/public");
    else if (parseInt(networkId) === 5) //Goerli
      return new ethers.JsonRpcProvider("https://rpc.ankr.com/eth_goerli");
    else if (parseInt(networkId) === 5777) //Ganache
      return new ethers.JsonRpcProvider("http://127.0.0.1:7545");
    else
      return null;
  }

  const trasferSpecificAmount = async (from, to, amountToTranfer) => {
    // console.log("length: ", accounts.length);
    // console.log(to.trim(), "to: ", ethers.isAddress(to?.trim()));
    // console.log(from.trim(), "from: ", ethers.isAddress(from?.trim()));
    // console.log("amountToTranfer: ", amountToTranfer);
    // console.log("float: ", parseFloat(amountToTranfer));

    // console.log("amountToTranfer: ", amountToTranfer);
    // console.log("amountToTranfer: ", typeof amountToTranfer);
    // console.log("minTransferableAmount: ", minTransferableAmount);
    // console.log("maxTransferableAmount: ", maxTransferableAmount);

    // console.log(parseFloat(amountToTranfer) < minTransferableAmount ? "amount is less" : "OK");
    // console.log(parseFloat(amountToTranfer) > maxTransferableAmount ? "amount is greater" : "OK");

    if (accounts.length > 0 && (to?.toString() !== "" && ethers.isAddress(to?.toString().trim())) && (from?.toString() !== "" && ethers.isAddress(from?.toString().trim())) && amountToTranfer.toString().trim() !== "" && parseFloat(amountToTranfer) > 0) {
      const { privateKey: senderPrivateKey } = getAccountDetails(from);
      const { address: recieverAddress } = getAccountDetails(to);

      let provider = getProvider(selectedChain);

      const _target = new ethers.Wallet(senderPrivateKey);
      const target = _target.connect(provider);
      const balance = await provider.getBalance(target.address);
      //const txBuffer = ethers.parseUnits(getGasForChain()); //ethers.parseUnits(".005");
      let feeData = await provider.getFeeData();//await provider.getGasPrice()
      //console.log(feeData);
      let gasPrice = feeData.gasPrice;
      let gasLimit = 21000;

      // console.log("gasPrice type: ", typeof gasPrice)
      // console.log("gasLimit type: ", typeof gasLimit)

      //let transactionFee = (ethers.formatEther(gasPrice) * gasLimit).toFixed(6);
      let transactionFee = 0;
      if (selectedChain === 11155111 || selectedChain === 5)
        transactionFee = ethers.parseUnits("0.0000315");
      else
        transactionFee = ethers.parseUnits((ethers.formatEther(gasPrice) * gasLimit).toFixed(6).toString());//(ethers.formatEther(gasPrice) * gasLimit).toFixed(6);
      // console.log("transactionFee type: ", typeof transactionFee)
      // console.log("balance type: ", typeof balance)
      // //console.log(`gasPrice: ${gasPrice}, selectedChain: ${selectedChain}`);
      // console.log(`selectedChain: ${selectedChain}`);
      // console.log(`gasPrice:`, ethers.formatEther(gasPrice));
      // console.log(`transactionFee:`, transactionFee);
      // //console.log(`transactionFee(Wei):`, ethers.formatEther(transactionFee.toString()));

      amountToTranfer = ethers.parseUnits(amountToTranfer.toString());

      if (amountToTranfer <= (balance - transactionFee)) {//if (amountToTranfer <= (balance - txBuffer)) {
        let amountAfterGas = ((amountToTranfer - transactionFee) > 0 ? (amountToTranfer - transactionFee) : 0);

        if (amountAfterGas > 0) { //balance.sub(txBuffer) > 0
          //console.log("NEW ACCOUNT WITH ETH!");
          const amount = amountAfterGas; //balance.sub(txBuffer);
          try {
            const transaction = await target.sendTransaction({
              to: recieverAddress,
              value: amount
            });

            // console.log("transaction: ", transaction)
            // console.log("hash: ", transaction.hash);
            // console.log(`amount: ${amount}`);
            // console.log(`Success! transfered --> ${ethers.formatEther(amount)}`);
            setTransactionHash(transaction.hash);

            setAlertType("success");
            setAlertMessage("Amount transfered successfully!");
            setShowAlert(true);

            setTimeout(() => {
              //console.log("fetchAccounts called");
              fetchAccounts();
            }, 1000)
          }
          catch (e) {
            console.log(`error: ${e}`);
          }
        }
        else {
          //console.log("Amount is to low to transfer");
          setAlertType("danger");
          setAlertMessage("Amount is too low to transfer");
          setShowAlert(true);
        }
      }
      else if (amountToTranfer > balance) {
        setAlertType("danger");
        setAlertMessage("Entered amount is greater than wallet balance!");
        setShowAlert(true);
      }
      else {
        //console.log("You can not transfer this amount due to gasfee");
        setAlertType("danger");
        setAlertMessage("Amount is too low to transfer!"); //setAlertMessage("You can not transfer this amount due to gasfee");
        setShowAlert(true);
      }
    }
    // else if (parseFloat(amountToTranfer) < minTransferableAmount) {
    //   setAlertType("danger");
    //   setAlertMessage("Amount is too low to transfer!");
    //   setShowAlert(true);
    // }
    // else if (parseFloat(amountToTranfer) > maxTransferableAmount) {
    //   setAlertType("danger");
    //   setAlertMessage("Entered amount is greater than wallet balance!");
    //   setShowAlert(true);
    // }
    else {
      //console.log("Please provide Sender Address, Reciever Address and Amount to send");
      setAlertType("danger");
      setAlertMessage("Please provide Sender Address, Reciever Address and Amount to send");
      setShowAlert(true);
    }
  }

  // const transferBalance = async () => {
  //   if (accounts.length > 0) {
  //     //const provider = new ethers.JsonRpcProvider("http://127.0.0.1:7545");

  //     for (let i = 1; i < accounts.length; i++) {
  //       const { address, privateKey, eth } = accounts[i];
  //       let provider = await getProvider(selectedChain);
  //       const _target = new ethers.Wallet(privateKey);
  //       const target = _target.connect(provider);
  //       const balance = await provider.getBalance(target.address);
  //       //console.log("address: ", address, "privateKey: ", privateKey, "balance: ", balance, "eth-balance", eth);

  //       //const txBuffer = ethers.utils.parseEther(".005");
  //       const txBuffer = ethers.parseUnits(getGasForChain()); //ethers.parseUnits(".005");

  //       let amountAfterGas = ((balance - txBuffer) > 0 ? (balance - txBuffer) : 0);

  //       if (amountAfterGas > 0) { //balance.sub(txBuffer) > 0
  //         //console.log("NEW ACCOUNT WITH ETH!");
  //         const amount = amountAfterGas; //balance.sub(txBuffer);
  //         try {
  //           const transaction = await target.sendTransaction({
  //             to: accounts[0]["address"],
  //             value: amount
  //           });

  //           // console.log("transaction: ", transaction)
  //           // console.log("hash: ", transaction.hash);
  //           // console.log(`amount: ${amount},  eth: ${eth}`);
  //           // console.log(`Success! transfered --> ${ethers.formatEther(balance)}`);
  //           setTransactionHash(transaction.hash);
  //         }
  //         catch (e) {
  //           console.log(`error: ${e}`);
  //         }
  //       }
  //     }

  //     setTimeout(() => {
  //       //console.log("fetchAccounts called");
  //       fetchAccounts();
  //     }, 1000)
  //   }
  // }

  const transferBalance = async () => {
    if (mutipleSenderAccount.length > 0) {

      let hashes = [];
      let provider = await getProvider(selectedChain);
      //const txBuffer = ethers.parseUnits(getGasForChain());
      // for (let i = 0; i < mutipleSenderAccount.length; i++) {
      //   console.log(mutipleSenderAccount[i]);
      //   const { address, privateKey, eth } = mutipleSenderAccount[i];
      //   console.log(privateKey);
      //   // const _target = new ethers.Wallet(privateKey);
      //   // const target = _target.connect(provider);
      //   // const balance = await provider.getBalance(target.address);
      //   // console.log("address: ", address, "privateKey: ", privateKey, "balance: ", balance, "eth-balance", eth);
      // }
      // return 0;

      for (let i = 0; i < mutipleSenderAccount.length; i++) {
        const { privateKey } = mutipleSenderAccount[i];
        const _target = new ethers.Wallet(privateKey);
        const target = _target.connect(provider);
        const balance = await provider.getBalance(target.address);
        //console.log("address: ", address, "privateKey: ", privateKey, "balance: ", balance, "eth-balance", eth);

        // //const txBuffer = ethers.utils.parseEther(".005");
        // const txBuffer = ethers.parseUnits(".005");

        let feeData = await provider.getFeeData();//await provider.getGasPrice()
        let gasPrice = feeData.gasPrice;
        let gasLimit = 21000;

        // console.log("gasPrice type: ", typeof gasPrice)
        // console.log("gasLimit type: ", typeof gasLimit)

        //let transactionFee = (ethers.formatEther(gasPrice) * gasLimit).toFixed(6);
        let transactionFee = 0;
        if (selectedChain === 11155111 || selectedChain === 5)
          transactionFee = ethers.parseUnits("0.0000315");
        else
          transactionFee = ethers.parseUnits((ethers.formatEther(gasPrice) * gasLimit).toFixed(6).toString());//(ethers.formatEther(gasPrice) * gasLimit).toFixed(6);
        // console.log("transactionFee type: ", typeof transactionFee)
        // console.log("balance type: ", typeof balance)
        // //console.log(`gasPrice: ${gasPrice}, selectedChain: ${selectedChain}`);
        // console.log(`selectedChain: ${selectedChain}`);
        // console.log(`gasPrice:`, ethers.formatEther(gasPrice));
        // console.log(`transactionFee:`, transactionFee);
        // //console.log(`transactionFee(Wei):`, ethers.formatEther(transactionFee.toString()));

        let amountAfterGas = ((balance - transactionFee) > 0 ? (balance - transactionFee) : 0);
        //let amountAfterGas = ((balance - txBuffer) > 0 ? (balance - txBuffer) : 0);
        // console.log("amountAfterGas: ", amountAfterGas);
        // console.log("amountAfterGas type: ", typeof amountAfterGas);

        if (amountAfterGas > 0) {
          const amount = amountAfterGas;
          try {
            const transaction = await target.sendTransaction({
              to: recieverAccount.address,
              value: amount
            });

            //setTransactionHash(transaction.hash);
            console.log(transaction.hash);
            hashes.push(transaction.hash);
          }
          catch (e) {
            console.log(`error: ${e}`);
          }
        }
      }

      if (hashes.length > 0) {
        setMultiTransactionHash(hashes);
        setAlertType("success");
        setAlertMessage("Amount transfered successfully!");
        setShowAlert(true);
      }

      setTimeout(() => {
        fetchAccounts();
      }, 1000)
    }
  }

  const getCurrencyByChainID = (chainId) => {
    if (chainId === 97)
      return "BNB";
    else if (chainId === 80001)
      return "Matic";
    else if (chainId === 11155111)
      return "ETH";
    else if (chainId === 5)
      return "ETH";
    else if (chainId === 5777)
      return "ETH";
  }

  const getChainNameByID = (chainId) => {
    if (chainId === 97)
      return "Binance Smart Chian";
    else if (chainId === 80001)
      return "Matic Mumbai";
    else if (chainId === 11155111)
      return "Sepolia Tesnet";
    else if (chainId === 5)
      return "Goerli Testnet";
    else if (chainId === 5777)
      return "Ganache";
  }

  const getExplorerUrl = () => {
    if (parseInt(selectedChain) === 97)
      return "https://testnet.bscscan.com";
    else if (parseInt(selectedChain) === 80001)
      return "https://mumbai.polygonscan.com";
    else if (parseInt(selectedChain) === 11155111)
      return "https://sepolia.etherscan.io";
    else if (parseInt(selectedChain) === 5)
      return "https://goerli.etherscan.io";
  }

  const getGasForChain = () => {
    if (parseInt(selectedChain) === 97)
      return "0.000105"; //binance smart chain
    else if (parseInt(selectedChain) === 80001)
      return "0.0000315"; //mumbai
    else if (parseInt(selectedChain) === 11155111)
      return "0.00003245"; //sepolia
    else if (parseInt(selectedChain) === 5)
      return "0.0000315"; //goerli
    else if (parseInt(selectedChain) === 5777)
      return "0.0000315"; //ganache
  }

  const getMaxTransferableAmount = async (account, returnValue) => {
    const { privateKey } = account;
    const _target = new ethers.Wallet(privateKey);
    let provider = await getProvider(selectedChain);
    const target = _target.connect(provider);
    const balance = await provider.getBalance(target.address);
    //const txBuffer = ethers.parseUnits(getGasForChain()); //ethers.parseUnits(".005");
    //const txBuffer = ethers.parseUnits(".0000315"); //mumbai
    //0.00003245 sepolia
    //0.0000315 goerli
    //0.000105 binance smart chain

    let feeData = await provider.getFeeData();//await provider.getGasPrice()
    //console.log(feeData);
    let gasPrice = feeData.gasPrice;
    let gasLimit = 21000;

    // console.log("gasPrice type: ", typeof gasPrice)
    // console.log("gasLimit type: ", typeof gasLimit)

    //let transactionFee = (ethers.formatEther(gasPrice) * gasLimit).toFixed(6);
    let transactionFee = 0;
    if (selectedChain === 11155111 || selectedChain === 5)
      transactionFee = ethers.parseUnits("0.0000315");
    else
      transactionFee = ethers.parseUnits((ethers.formatEther(gasPrice) * gasLimit).toFixed(6).toString());//(ethers.formatEther(gasPrice) * gasLimit).toFixed(6);
    // console.log("transactionFee type: ", typeof transactionFee)
    // console.log("balance type: ", typeof balance)
    // //console.log(`gasPrice: ${gasPrice}, selectedChain: ${selectedChain}`);
    // console.log(`selectedChain: ${selectedChain}`);
    // console.log(`gasPrice:`, ethers.formatEther(gasPrice));
    // console.log(`transactionFee:`, transactionFee);
    // //console.log(`transactionFee(Wei):`, ethers.formatEther(transactionFee.toString()));

    let amountAfterGas = ((balance - transactionFee) > 0 ? (balance - transactionFee) : 0);
    //let amountAfterGas = ((balance - txBuffer) > 0 ? (balance - txBuffer) : 0);
    // console.log("amountAfterGas: ", amountAfterGas)
    // console.log("amountAfterGas type: ", typeof amountAfterGas)

    if (amountAfterGas > 0) {
      const amount = amountAfterGas;

      if (returnValue)
        return amount;
      else
        setInputAmount(ethers.formatEther(amount.toString()));
    }
  }

  // const handleMultiAccountSelection = (e) => {
  //   let selectedAccounts = [...mutipleSenderAccount];
  //   let account = accounts.find((account) => account.address === e.target.value);
  //   selectedAccounts.push(account);
  //   setMultipleSenderAccount(selectedAccounts);
  // }

  // Add/Remove checked item from list
  const handleCheck = (e) => {
    var updatedList = [...mutipleSenderAccount];
    if (e.target.checked) {
      let account = accounts.find((account) => account.address === e.target.value);
      updatedList = [...mutipleSenderAccount, account];
    } else {
      updatedList = updatedList.filter(function (obj) {
        return obj.address !== e.target.value;
      });

      //updatedList.splice(mutipleSenderAccount.indexOf(e.target.value), 1);
    }
    setMultipleSenderAccount(updatedList);
  };

  return (
    <>
      <section>
        <div className='continer-lg py-4'>
          <div className="text-center">
            <h2>Easy Transfer</h2>
            <p className="lead text-muted">Please provide Metamask/Ganache wallet MNEMOIC.</p>
          </div>
          <div className='row d-flex justify-content-center mb-4 mx-0'>
            <div className='col-8 d-flex justify-content-between align-items-center'>
              <input className='form-control' placeholder='Please provide Metamask/Ganache wallet MNEMOIC' onChange={(e) => setMnomic(e.target.value)} disabled={loading ? true : false}></input>

              {(mnomic.trim() !== "" && mnomic.split(' ').length === 12) ? <button type="button" className="btn btn-primary ms-4 w-25" onClick={() => fetchAccounts()} disabled={loading ? true : false}>fetch accounts</button> : <button type="button" className="btn btn-primary ms-4 w-25" disabled>fetch accounts</button>}
            </div>
          </div>

          <div className='row d-flex justify-content-center mx-0'>
            <div className='col-8 text-center'>
              <div className="btn-group mb-4" role="group" aria-label="Please select chain">
                <input type="radio" className="btn-check" name="btnradio" id="rbGanache" onChange={(e) => setSelectedChain(5777)} checked={selectedChain === 5777 ? true : false} disabled={loading ? true : false} />
                <label className="btn btn-outline-primary" htmlFor="rbGanache">Ganache</label>

                <input type="radio" className="btn-check" name="btnradio" id="rbBinance" onChange={(e) => setSelectedChain(97)} checked={selectedChain === 97 ? true : false} disabled={loading ? true : false} />
                <label className="btn btn-outline-primary" htmlFor="rbBinance">Binance Smart Chain - Testnet</label>

                <input type="radio" className="btn-check" name="btnradio" id="rbMumbai" onChange={(e) => setSelectedChain(80001)} checked={selectedChain === 80001 ? true : false} disabled={loading ? true : false} />
                <label className="btn btn-outline-primary" htmlFor="rbMumbai">Polygon Mumbai</label>

                <input type="radio" className="btn-check" name="btnradio" id="rbSepolia" onChange={(e) => setSelectedChain(11155111)} checked={selectedChain === 11155111 ? true : false} disabled={loading ? true : false} />
                <label className="btn btn-outline-primary" htmlFor="rbSepolia">Sepolia</label>

                <input type="radio" className="btn-check" name="btnradio" id="rbGoerli" onChange={(e) => setSelectedChain(5)} checked={selectedChain === 5 ? true : false} disabled={loading ? true : false} />
                <label className="btn btn-outline-primary" htmlFor="rbGoerli">Goerli</label>
              </div>
            </div>
          </div>
        </div>

        <div className='continer-lg py-4'>
          <div className="row mx-0">

            {(!loading && accounts.length > 0) && (
              <div className="col-8 mb-3 mx-auto">
                <div className='w-100 d-flex justify-content-between align-items-center'>
                  <h3>{getChainNameByID(selectedChain)} Address</h3>
                  <button className='btn btn-primary btn-sm' data-bs-toggle="modal" data-bs-target="#transferAllFunds" onClick={() => { setRecieverAccount({}); setMultipleSenderAccount([]); }}>Transfer All funds</button>
                </div>

                <ol className="list-group list-group-numbered">
                  {accounts.map((account, index) => {
                    return (<li className="list-group-item d-flex justify-content-between align-items-start" key={index}>
                      <div className="ms-2 me-auto">
                        <div className="fw-bold">{account.address}</div>
                        ({account.balance.toString()} wei)
                      </div>
                      <span className="badge bg-success rounded-pill align-self-center">{account.eth} {getCurrencyByChainID(selectedChain)}</span>
                      <button className='btn btn-primary btn-sm align-self-center ms-4' data-bs-toggle="modal" data-bs-target="#sendAmount" onClick={() => { setInputAmount(0); setSenderAccount(account); setRecieverAccount({}); setTransactionHash(''); setMinTransferableAmount(0); setMaxTransferableAmount(0); }}>Send</button>
                    </li>)
                  })}
                </ol>
              </div>
            )}
          </div>

        </div>
      </section>


      <div className="modal fade" id="sendAmount" tabIndex="-1" aria-labelledby="sendAmountLabel" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h1 className="modal-title fs-5" id="sendAmountLabel">Send</h1>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <div className='col-12'>
                {
                  showAlert && (<div className='mb-3'>
                    {getAlertBox()}
                  </div>)
                }
                <div className="mb-3">
                  <label htmlFor="txtSendFrom" className="form-label">Sender Address</label>
                  <input type="text" className="form-control" id="txtSendFrom" placeholder="" value={`${senderAccount?.address}`} readOnly />

                  <div className='d-flex justify-content-between py-2'>
                    <label className="form-label mb-0">Balance: </label> <label className="form-label mb-0">{senderAccount?.eth} {getCurrencyByChainID(selectedChain)}</label>
                  </div>
                </div>

                <div className='mb-3'>
                  <label htmlFor="txtSendFrom" className="form-label">Reciever Address</label>
                  <select className="form-select" aria-label="Select Reciever Account" value={recieverAccount.address} onChange={(e) => { e.target.value !== "-1" ? setRecieverAccount(accounts.find((account) => account.address === e.target.value)) : setRecieverAccount({}) }}>
                    <option value={"-1"}>Select Reciever Account</option>
                    {accounts?.filter((a) => a.address !== senderAccount?.address).map((account, index) => {
                      return <option value={account.address} key={index}>{account.address} ({account.eth} {getCurrencyByChainID(selectedChain)})</option>
                    })}
                  </select>
                </div>

                <div className="mb-3">
                  <div className='d-flex justify-content-between py-2'>
                    <label htmlFor="txtAmountToSend" className="form-label mb-0">Amount To Send</label>
                    <button className="btn btn-primary btn-sm align-self-center ms-4" onClick={() => getMaxTransferableAmount(senderAccount, false)}>MAX</button>
                  </div>
                  <input type="text" className="form-control" id="txtAmountToSend" value={inputAmount} min={minTransferableAmount} max={maxTransferableAmount} onChange={(e) => setInputAmount(e.target.value)} />
                </div>

                {(transactionHash !== "") &&
                  <div className="mb-3 d-flex flex-column">
                    <label className="form-label mb-0">Transaction Details</label>
                    {getExplorerUrl() !== undefined ? (<a href={`${getExplorerUrl()}/tx/${transactionHash}`}>
                      {`${transactionHash.slice(0, 4)}.....${transactionHash.slice(transactionHash.length - 10, transactionHash.length)}`}
                    </a>)
                      :
                      (transactionHash.slice(0, 4) + "....." + transactionHash.slice(transactionHash.length - 10, transactionHash.length))
                    }
                  </div>}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" className="btn btn-primary" onClick={() => trasferSpecificAmount(senderAccount.address, recieverAccount.address, inputAmount)}>Send</button>
            </div>
          </div>
        </div>
      </div>


      <div className="modal fade" id="transferAllFunds" tabIndex="-1" aria-labelledby="transferAllFundsLabel" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h1 className="modal-title fs-5" id="transferAllFundsLabel">Tranfer all funds to specific account</h1>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <div className='col-12'>
                {
                  showAlert && (<div className='mb-3'>
                    {getAlertBox()}
                  </div>)
                }
                <div className='mb-3'>
                  <label htmlFor="txtSendFrom" className="form-label">Reciever Address</label>
                  <select className="form-select" aria-label="Select Reciever Account" value={recieverAccount.address} onChange={(e) => { e.target.value !== "-1" ? setRecieverAccount(accounts.find((account) => account.address === e.target.value)) : setRecieverAccount({}) }}>
                    <option value={"-1"}>Select Reciever Account</option>
                    {accounts?.map((account, index) => {
                      return <option value={account.address} key={index}>{account.address} ({account.eth} {getCurrencyByChainID(selectedChain)})</option>
                    })}
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="txtSendFrom" className="form-label">From Addresses (Select multiple sender accounts)</label>
                  {accounts?.filter((a) => a.address !== recieverAccount?.address).map((account, index) => {
                    return <div className="form-check">
                      <input className="form-check-input" type="checkbox" value={account.address} id={`lbl${account.address}`} onChange={(e) => handleCheck(e)} disabled={recieverAccount.address === undefined ? true : false} />
                      <label className="form-check-label" htmlFor={`lbl${account.address}`}>
                        {account.address} ({account.eth} {getCurrencyByChainID(selectedChain)})
                      </label>
                    </div>
                  })}
                </div>

                {(multiTransactionHash.length > 0) &&
                  <div className="mb-3 d-flex flex-column">
                    <label className="form-label mb-0">Transaction Details</label>
                    {multiTransactionHash.map((hash, index) => {
                      return getExplorerUrl() !== undefined ? (<a href={`${getExplorerUrl()}/tx/${hash}`} key={index}>
                        {`${hash.slice(0, 4)}.....${hash.slice(hash.length - 10, hash.length)}`}
                      </a>)
                        :
                        (<div className='w-100'>{hash.slice(0, 4) + "....." + hash.slice(hash.length - 30, hash.length)}</div>)
                    })}
                  </div>}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" className="btn btn-primary" onClick={() => transferBalance()}>Send</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
