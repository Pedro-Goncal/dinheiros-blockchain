const express = require('express');
const request = require('request');
const Blockchain = require('./blockchain/blockchain');
const PubSub = require('./app/pubsub');

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
const syncChains = () => {
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
};

//INITIALIZE EXPRESS
const app = express();

//INITIALIZE COORS
app.use(cors());

//BODY PARSER
app.use(express.json());

//INITIALIZE BLOCKCHAIN
const blockchain = new Blockchain();

//INITIALIZE PUB SUB
const pubsub = new PubSub({ blockchain });

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

const PORT = PEER_PORT || DEFAULT_PORT;

app.listen(PORT, () => {
  //Once a new connection is open it syncs the most recent chain
  console.log('====================================='.blue);
  console.log(`listening on http://localhost:${PORT}`.blue.bold); //colors package
  console.log('====================================='.blue);

  if (PORT !== DEFAULT_PORT) {
    syncChains();
  }
});
