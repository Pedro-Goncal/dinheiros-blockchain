class TransactionPool {
  constructor() {
    this.transactionMap = {};
  }

  setTransaction(transaction) {
    this.transactionMap[transaction.id] = transaction;
  }

  setMap(transactionMap) {
    this.transactionMap = transactionMap;
  }

  existingTransaction({ inputAddress }) {
    //Create array of all transaction available
    const transactions = Object.values(this.transactionMap);

    //Returns the transaction that matches the incoming transaction
    return transactions.find(
      (transaction) => transaction.input.address === inputAddress
    );
  }
}

module.exports = TransactionPool;
