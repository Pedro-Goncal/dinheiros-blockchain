const Wallet = require('./wallet');
const { verifySignature } = require('../util/util');
const Transaction = require('./transaction');

describe('Wallet', () => {
  let wallet;

  beforeEach(() => {
    wallet = new Wallet();
  });

  it('has a `balance`', () => {
    //Inforce that the wallet has a balance property
    expect(wallet).toHaveProperty('balance');
  });

  it('has a `publicKey`', () => {
    //Inforce that the wallet has a publicKey property
    expect(wallet).toHaveProperty('publicKey');
  });

  describe('sign data', () => {
    const data = 'testData';

    it('verifies a signature', () => {
      expect(
        verifySignature({
          publicKey: wallet.publicKey,
          data,
          signature: wallet.sign(data),
        })
      ).toBe(true);
    });

    it('does not verify an invalid signature', () => {
      expect(
        verifySignature({
          publicKey: wallet.publicKey,
          data,
          signature: new Wallet().sign(data),
        })
      ).toBe(false);
    });
  });

  describe('createTransaction', () => {
    describe('and the amount exceeds the balance', () => {
      it('throws and error', () => {
        expect(() =>
          wallet.createTransaction({
            amount: 9999999,
            recipient: 'foo-recipient',
          })
        ).toThrow('Amount exceeds balance');
      });
    });

    describe('and the amount is valid', () => {
      let transaction, amount, recipient;

      beforeEach(() => {
        amount = 50;
        recipient = 'foo-recipient';
        transaction = wallet.createTransaction({ amount, recipient });
      });

      it('creates an instance of `Transaction`', () => {
        expect(transaction instanceof Transaction).toBe(true);
      });

      it('matches the transaction input with the wallet', () => {
        expect(transaction.input.address).toEqual(wallet.publicKey);
      });

      it('outputs the amount the recipient', () => {
        expect(transaction.outputMap[recipient]).toEqual(amount);
      });
    });
  });
});
