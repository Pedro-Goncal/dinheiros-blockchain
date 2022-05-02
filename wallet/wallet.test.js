const Wallet = require('./wallet');
const { verifySignature } = require('../util/util');

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
});
