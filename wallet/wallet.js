const { STARTING_BALANCE } = require('../config');
const { ec, cryptoHash } = require('../util/util');
const Transaction = require('./transaction');

class Wallet {
  constructor() {
    this.balance = STARTING_BALANCE;

    //Object that includes a Private and a Public Key
    this.keyPair = ec.genKeyPair();

    //Grab the public Key from the object, the return value are
    // the x and y coordenates from the elliptic curve,
    // we then encode the x and y coordenates into its hex value
    this.publicKey = this.keyPair.getPublic().encode('hex');
  }

  //----------------------------------------------
  //------------------ SIGN ----------------------
  //----------------------------------------------
  sign(data) {
    //The elliptic package has a sign method included
    //This key pair sign works better when it comes in has form
    return this.keyPair.sign(cryptoHash(data));
  }

  //----------------------------------------------
  //------------ CREATE TRANSACTION --------------
  //----------------------------------------------

  createTransaction({ recipient, amount, chain }) {
    if (chain) {
      this.balance = Wallet.calculateBalance({
        chain,
        address: this.publicKey,
      });
    }

    if (amount > this.balance) {
      throw new Error('Amount exceeds balance');
    }

    return new Transaction({ senderWallet: this, recipient, amount });
  }

  //----------------------------------------------
  //------------- CALCULATE BALANCE --------------
  //----------------------------------------------
  static calculateBalance({ chain, address }) {
    let hasConductedTransaction = false;
    let outputsTotal = 0;

    for (let i = chain.length - 1; i > 0; i--) {
      const block = chain[i];

      for (let transaction of block.data) {
        if (transaction.input.address === address) {
          hasConductedTransaction = true;
        }

        const addressOutput = transaction.outputMap[address];

        if (addressOutput) {
          outputsTotal = outputsTotal + addressOutput;
        }
      }

      if (hasConductedTransaction) {
        break;
      }
    }

    return hasConductedTransaction
      ? outputsTotal
      : STARTING_BALANCE + outputsTotal;
  }
}

module.exports = Wallet;

/*
=========================== NOTES = ============================
The elliptic package has a dependancy module that is called brorand,
that its used on the genKeyPair() method. Jest defaults to simulate 
tests on the browser environment, and that conflicts with brorand.
We need to tell jest that we are running out code on a node 
environment. To fix that we can add this to our package.json file

,
  "jest": {
    "testEnvironment": "node"
  },

  
*/
