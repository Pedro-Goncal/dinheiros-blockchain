const Transaction = require('./transaction');

class TransactionPool {
  constructor() {
    this.transactionMap = {};
  }

  //=================================================
  //============== CLEAR POOL =======================
  //=================================================
  clear() {
    this.transactionMap = {};
  }

  //=================================================
  //============= SET TRANSACTION ===================
  //=================================================
  setTransaction(transaction) {
    this.transactionMap[transaction.id] = transaction;
  }

  //=================================================
  //================== SET MAP ======================
  //=================================================

  setMap(transactionMap) {
    this.transactionMap = transactionMap;
  }

  //=================================================
  //========== EXISTING TRANSACTION =================
  //=================================================

  existingTransaction({ inputAddress }) {
    //Create array of all transaction available
    const transactions = Object.values(this.transactionMap);

    //Returns the transaction that matches the incoming transaction
    return transactions.find(
      (transaction) => transaction.input.address === inputAddress
    );
  }

  //=================================================
  //============= VALID TRANSACTIONS ================
  //=================================================

  validTransactions() {
    return Object.values(this.transactionMap).filter((transaction) =>
      Transaction.validTransaction(transaction)
    );
  }
  //=================================================
  //======= CLEAR BLOCKCHAIN TRANSACTION ============
  //=================================================

  clearBlockchainTransactions({ chain }) {
    for (let i = 1; i < chain.length; i++) {
      const block = chain[i];

      for (let transaction of block.data) {
        if (this.transactionMap[transaction.id]) {
          delete this.transactionMap[transaction.id];
        }
      }
    }
  }
}

module.exports = TransactionPool;
