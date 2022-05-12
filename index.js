const express = require('express');
const request = require('request');
const Blockchain = require('./blockchain/blockchain');
const PubSub = require('./app/pubsub');
const TransactionPool = require('./wallet/transaction-pool');
const Wallet = require('./wallet/wallet');

//TERMINAL COLOURS FOR FUN
const color = require('colors');

//DOTENV
const dotenv = require('dotenv');
dotenv.config();

//CORS
const cors = require('cors');

//PORT
const DEFAULT_PORT = 4000;
let PEER_PORT;

if (process.env.GENERATE_PEER_PORT === 'true') {
  PEER_PORT = DEFAULT_PORT + Math.ceil(Math.random() * 1000);
}

//SYNC CHAINS FUNCTION
const syncWithRootState = () => {
  request(
    { url: `${ROOT_NODE_ADDRESS}/api/blocks` },
    (error, response, body) => {
      if (!error && response.statusCode === 200) {
        const rootChain = JSON.parse(body);
        console.log('Replace chain on a sync with ===>', rootChain);
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

//INITIALIZE EXPRESS
const app = express();

//INITIALIZE COORS
app.use(cors());

//BODY PARSER
app.use(express.json());

//INITIALIZE BLOCKCHAIN
const blockchain = new Blockchain();

//Initialize Transaction Pool
const transactionPool = new TransactionPool();

//Initialize Wallet
const wallet = new Wallet();

//INITIALIZE PUB SUB
const pubsub = new PubSub({ blockchain, transactionPool });

//ROOT NODE ADDRESS
const ROOT_NODE_ADDRESS = `http://localhost:${DEFAULT_PORT}`;

//===================
//APIs
//===================

app.get('/api/blocks', (req, res) => {
  res.json(blockchain.chain);
});

app.post('/api/mine', (req, res) => {
  const { data } = req.body;

  blockchain.addBlock({ data });

  pubsub.broadcastChain();

  res.json(blockchain.chain);

  //THIS IS DUMB WHY WOULD YOU????????
  // res.redirect('/api/blocks');
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
      transaction = wallet.createTransaction({ recipient, amount });
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
  res.status(200).json(transactionPool.transactionMap);
});

const PORT = PEER_PORT || DEFAULT_PORT;

app.listen(PORT, () => {
  //Once a new connection is open it syncs the most recent chain
  console.log('====================================='.blue);
  console.log(`listening on http://localhost:${PORT}`.blue.bold); //colors package
  console.log('====================================='.blue);

  if (PORT !== DEFAULT_PORT) {
    syncWithRootState();
  }
});
