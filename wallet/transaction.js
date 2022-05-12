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

    //
    outputMap[recipient] = amount;
    outputMap[senderWallet.publicKey] = senderWallet.balance - amount;

    return outputMap;
  }

  //===============================================================
  //======================== CREATE INPUT  ========================
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
  //=================== UPDATE TRANSACTION  =======================
  //===============================================================
  //Used if we want to update the transaction field
  //===============================================================
  update({ senderWallet, recipient, amount }) {
    if (amount > this.outputMap[senderWallet.publicKey]) {
      throw new Error('Amount exceeds balance');
    }

    if (!this.outputMap[recipient]) {
      //Designate a new amount
      this.outputMap[recipient] = amount;
    } else {
      this.outputMap[recipient] = this.outputMap[recipient] + amount;
    }

    //Substract the amount
    this.outputMap[senderWallet.publicKey] =
      this.outputMap[senderWallet.publicKey] - amount;

    this.input = this.createInput({ senderWallet, outputMap: this.outputMap });
  }

  //===============================================================
  //==================== VALID TRANSACTION  =======================
  //===============================================================
  //This will return a true or false value, depending whether or
  //not we should trust the transaction as well as its input data
  //===============================================================
  static validTransaction(transaction) {
    const {
      input: { address, amount, signature },
      outputMap,
    } = transaction;

    //check to see if the amount is equal to the output map
    const outputTotal = Object.values(outputMap).reduce(
      (total, outputAmount) => total + outputAmount
    );

    //if the amount is not equal to the ouputTotal
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
