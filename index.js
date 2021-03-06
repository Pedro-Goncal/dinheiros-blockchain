const express = require('express');
const request = require('request');
const path = require('path');

//Classes
const Blockchain = require('./blockchain/blockchain');
const PubSub = require('./app/pubsub');
const TransactionPool = require('./wallet/transaction-pool');
const Wallet = require('./wallet/wallet');
const TransactionMiner = require('./app/transaction-miner');

//TERMINAL COLOURS FOR FUN
const color = require('colors');

//DOTENV
const dotenv = require('dotenv');
dotenv.config();

const isDevelopment =
  process.env.NODE_ENV === 'development' || process.env.ENV === 'development';

//CORS
const cors = require('cors');

//INITIALIZE EXPRESS
const app = express();

//INITIALIZE COORS
app.use(cors());

//BODY PARSER
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/dist')));

//REDIS URL
const REDIS_URL = isDevelopment
  ? 'redis://127.0.0.1:6379'
  : 'redis://:pb0eb61391fb81089f12964620604dd14b365545a09a0e604658dcfe5201cddaa@ec2-52-72-65-222.compute-1.amazonaws.com:32509';

//PORT
const DEFAULT_PORT = 4000;
let PEER_PORT;

//SYNC CHAINS FUNCTION

const syncWithRootState = () => {
  request(
    { url: `${ROOT_NODE_ADDRESS}/api/blocks` },
    (error, response, body) => {
      if (!error && response.statusCode === 200) {
        const rootChain = JSON.parse(body);

        console.log('replace chain on a sync with', rootChain);
        blockchain.replaceChain(rootChain);
      }
    }
  );

  request(
    { url: `${ROOT_NODE_ADDRESS}/api/transaction-pool-map` },
    (error, response, body) => {
      if (!error && response.statusCode === 200) {
        const rootTransactionPoolMap = JSON.parse(body);

        console.log(
          'replace transaction pool map on a sync with',
          rootTransactionPoolMap
        );
        transactionPool.setMap(rootTransactionPoolMap);
      }
    }
  );
};

//INITIALIZE BLOCKCHAIN
const blockchain = new Blockchain();

//Initialize Transaction Pool
const transactionPool = new TransactionPool();

//Initialize Wallet
const wallet = new Wallet();

//Initialize pub sub
const pubsub = new PubSub({ blockchain, transactionPool, redisUrl: REDIS_URL });

//Initialize Transaction Miner
const transactionMiner = new TransactionMiner({
  blockchain,
  transactionPool,
  wallet,
  pubsub,
});

//ROOT NODE ADDRESS
const ROOT_NODE_ADDRESS = `http://localhost:${DEFAULT_PORT}`;

//===================
//APIs
//===================

app.get('/api/blocks', (req, res) => {
  res.json(blockchain.chain);
});

app.get('/api/blocks/length', (req, res) => {
  res.json(blockchain.chain.length);
});

app.get('/api/blocks/:page', (req, res) => {
  const { page } = req.params;
  const { length } = blockchain.chain;

  //Create a copy of the chain and reverses it
  //we use slice with zero arguments so it actually creates a new copy
  //because the reverse() mutates the array insted of returning a new array
  const blocksReversed = blockchain.chain.slice().reverse();

  let startIndex = (page - 1) * 5;
  let endIndex = page * 5;

  startIndex = startIndex < length ? startIndex : length;
  endIndex = endIndex < length ? endIndex : length;

  res.json(blocksReversed.slice(startIndex, endIndex));
});

app.post('/api/mine', (req, res) => {
  const { data } = req.body;

  blockchain.addBlock({ data });

  pubsub.broadcastChain();

  res.redirect('/api/blocks');
});

app.post('/api/transact', (req, res) => {
  const { amount, recipient } = req.body;

  let transaction = transactionPool.existingTransaction({
    inputAddress: wallet.publicKey,
  });

  try {
    if (transaction) {
      transaction.update({ senderWallet: wallet, recipient, amount });
    } else {
      //Create a new transaction
      transaction = wallet.createTransaction({
        recipient,
        amount: parseInt(amount),
        chain: blockchain.chain,
      });
    }
  } catch (error) {
    return res.status(400).json({ type: 'error', message: error.message });
  }

  //Add the transaction to the transaction pool
  transactionPool.setTransaction(transaction);

  pubsub.broadcastTransaction(transaction);

  res.status(201).json({
    type: 'success',
    message: 'Transaction added to the pool succesfuly',
    transaction,
  });
});

app.get('/api/transaction-pool-map', (req, res) => {
  res.json(transactionPool.transactionMap);
});

app.get('/api/mine-transactions', (req, res) => {
  transactionMiner.mineTransactions();

  res.redirect('/api/blocks');
});

app.get('/api/wallet-info', (req, res) => {
  const address = wallet.publicKey;

  res.json({
    address,
    balance: Wallet.calculateBalance({ chain: blockchain.chain, address }),
  });
});

app.get('/api/known-addresses', (req, res) => {
  const addressMap = {};

  for (let block of blockchain.chain) {
    for (let transaction of block.data) {
      const recipient = Object.keys(transaction.outputMap);

      recipient.forEach((recipient) => (addressMap[recipient] = recipient));
    }
  }

  res.json(Object.keys(addressMap));
});

//======================================================================================

//=========================================
//=============== Seeding =================
//=========================================
if (isDevelopment) {
  const walletFoo = new Wallet();
  const walletBar = new Wallet();

  const generateWalletTransaction = ({ wallet, recipient, amount }) => {
    const transaction = wallet.createTransaction({
      recipient,
      amount,
      chain: blockchain.chain,
    });

    transactionPool.setTransaction(transaction);
  };

  const walletAction = () =>
    generateWalletTransaction({
      wallet,
      recipient: walletFoo.publicKey,
      amount: 5,
    });

  const walletFooAction = () =>
    generateWalletTransaction({
      wallet: walletFoo,
      recipient: walletBar.publicKey,
      amount: 10,
    });

  const walletBarAction = () =>
    generateWalletTransaction({
      wallet: walletBar,
      recipient: wallet.publicKey,
      amount: 15,
    });

  for (let i = 0; i < 20; i++) {
    if (i % 3 === 0) {
      walletAction();
      walletFooAction();
    } else if (i % 3 === 1) {
      walletAction();
      walletBarAction();
    } else {
      walletFooAction();
      walletBarAction();
    }

    transactionMiner.mineTransactions();
  }
}

//=========================================

if (process.env.GENERATE_PEER_PORT === 'true') {
  PEER_PORT = DEFAULT_PORT + Math.ceil(Math.random() * 1000);
}

const PORT = process.env.PORT || PEER_PORT || DEFAULT_PORT;

app.listen(PORT, () => {
  //Once a new connection is open it syncs the most recent chain
  console.log('====================================='.blue);
  console.log(`listening on http://localhost:${PORT}`.blue.bold); //colors package
  console.log('====================================='.blue);

  if (PORT !== DEFAULT_PORT) {
    syncWithRootState();
  }
});
