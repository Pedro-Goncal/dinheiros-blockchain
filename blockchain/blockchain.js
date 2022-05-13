const Block = require('./block');
const Transaction = require('../wallet/transaction');
const Wallet = require('../wallet/wallet');
const { cryptoHash } = require('../util/util');
const { REWARD_INPUT, MINING_REWARD } = require('../config');

class Blockchain {
  constructor() {
    //Initialize an Array for all the blocks, and start with the Genesis block
    this.chain = [Block.genesis()];
  }

  //===============================================================
  //====================== ADD A NEW BLOCK ========================
  //===============================================================
  //Create a new block by mining
  //===============================================================

  addBlock({ data }) {
    //To create a new block, we call the mineBlock function from the Block Class, that takes
    //the lastBlock and the new data as arguments
    const newBlock = Block.mineBlock({
      lastBlock: this.chain[this.chain.length - 1], // Grab the last block on the chain
      data,
    });

    //Once the block is created we then push the new block into the chain array
    this.chain.push(newBlock);
  }
  //===============================================================

  //===============================================================
  //======================== REPLACE CHAIN ========================
  //===============================================================
  //
  //===============================================================
  replaceChain(chain, validateTransaction, onSuccess) {
    //Chain must be larger then the current chain
    //If chain is the same size or smaller return
    if (chain.length <= this.chain.length) {
      console.error('The incoming chain must be longer');
      return;
    }

    //If chain is not valid return
    if (!Blockchain.isValidChain(chain)) {
      console.error('Incoming chain must be valid');
      return;
    }

    if (validateTransaction && !this.validTransactionData({ chain })) {
      console.error('This incoming chain has invalid data');
      return;
    }

    if (onSuccess) onSuccess();
    console.log('Chain is being replaced with: ', chain);
    this.chain = chain;
  }
  //===============================================================

  //===============================================================
  //================= VALID TRANSACTION DATA ======================
  //===============================================================

  validTransactionData({ chain }) {
    for (let i = 1; i < chain.length; i++) {
      const block = chain[i];
      const transactionSet = new Set();
      let rewardTransactionCount = 0;

      for (let transaction of block.data) {
        if (transaction.input.address === REWARD_INPUT.address) {
          rewardTransactionCount += 1;

          if (rewardTransactionCount > 1) {
            console.error('Miner rewards exceed limit');
            return false;
          }

          if (Object.values(transaction.outputMap)[0] !== MINING_REWARD) {
            console.error('Miner reward amount is invalid');
            return false;
          }
        } else {
          if (!Transaction.validTransaction(transaction)) {
            console.error('Invalid Transaction');
            return false;
          }

          const trueBalance = Wallet.calculateBalance({
            chain: this.chain,
            address: transaction.input.address,
          });

          if (transaction.input.amount !== trueBalance) {
            console.error('Invalid input amount');
            return false;
          }

          if (transactionSet.has(transaction)) {
            console.error(
              'An identical transaction appears more than once in the block'
            );
            return false;
          } else {
            transactionSet.add(transaction);
          }
        }
      }
    }

    return true;
  }
  //===============================================================

  //===============================================================
  //===================== IS VALID CHAIN ==========================
  //===============================================================
  //Checks to see if the new chain is valid
  //===============================================================
  static isValidChain(chain) {
    //Check to see if the first block on the chain is the
    //same as the Genesis block
    if (JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis())) {
      return false;
    }

    for (let i = 1; i < chain.length; i++) {
      //Get data from each of the blocks
      const { timestamp, lastHash, hash, data, nonce, difficulty } = chain[i];

      //Check the hash from the previews block
      const actualLastHash = chain[i - 1].hash;

      const lastDifficulty = chain[i - 1].difficulty;

      //Check to see if the last hash of the new chain, is equal to the last hash of current chain
      if (lastHash !== actualLastHash) return false;

      //Generate the hash again to confirm that the hash was not temperade with
      const validatedHash = cryptoHash(
        timestamp,
        lastHash,
        data,
        nonce,
        difficulty
      );

      //If it has been alterad then return false
      if (hash !== validatedHash) return false;

      //Make sure that the diference in dificulty stays of
      //1 Higher or 1 lower between each block
      if (Math.abs(lastDifficulty - difficulty) > 1) return false;
    }

    //If none of the above cheks is false then the chain is valid
    return true;
  }
}

module.exports = Blockchain;
