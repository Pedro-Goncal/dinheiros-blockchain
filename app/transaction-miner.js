const Transaction = require('../wallet/transaction');

class TransactionMiner {
  constructor({ blockchain, transactionPool, wallet, pubsub }) {
    this.blockchain = blockchain;
    this.transactionPool = transactionPool;
    this.wallet = wallet;
    this.pubsub = pubsub;
  }

  mineTransactions() {
    //Get the transaction pool's valids transactions
    const validTransactions = this.transactionPool.validTransactions();

    //Generate the miner's reward
    validTransactions.push(
      Transaction.rewardTransaction({ minerWallet: this.wallet })
    );

    //Add a block consisting of the transaction to the blockchain
    this.blockchain.addBlock({ data: validTransactions });

    //Brodcast the updated blockchain
    this.pubsub.broadcastChain();

    //Clear the pool
    this.transactionPool.clear();
  }
}

module.exports = TransactionMiner;
