const uuid = require('uuid/v1');
const { verifySignature } = require('../util/util');

class Transaction {
  constructor({ senderWallet, recipient, amount }) {
    this.id = uuid();
    this.outputMap = this.createOutputMap({ senderWallet, recipient, amount });
    this.input = this.createInput({ senderWallet, outputMap: this.outputMap });
  }

  //===============================================================
  //=================== CREATE OUTPUT MAP  ========================
  //===============================================================
  //Creates the output object that says who is the sender, the
  //amount that is being sent, and the remainder balance of the
  //sender
  //===============================================================
  createOutputMap({ senderWallet, recipient, amount }) {
    const outputMap = {};

    outputMap[recipient] = amount;
    outputMap[senderWallet.publicKey] = senderWallet.balance - amount;

    return outputMap;
  }

  //===============================================================
  //======================== CREATE INPUT  ========================
  //===============================================================
  //
  //===============================================================
  createInput({ senderWallet, outputMap }) {
    return {
      timestamp: Date.now(),
      amount: senderWallet.balance,
      address: senderWallet.publicKey,
      signature: senderWallet.sign(outputMap),
    };
  }

  //===============================================================
  //==================== VALID TRANSACTION  =======================
  //===============================================================
  //
  //===============================================================
  static validTransaction(transaction) {
    const {
      input: { address, amount, signature },
      outputMap,
    } = transaction;

    const outputTotal = Object.values(outputMap).reduce(
      (total, outputAmount) => total + outputAmount
    );

    if (amount !== outputTotal) {
      console.error(`Invalid trnasaction from ${address}`);
      return false;
    }

    if (!verifySignature({ publicKey: address, data: outputMap, signature })) {
      console.error(`Invalid Signature from ${address}`);
      return false;
    }

    return true;
  }
}

module.exports = Transaction;
