const Blockchain = require('./blockchain');
const Block = require('./block');
const { cryptoHash } = require('../util/util');
const Wallet = require('../wallet/wallet');
const Transaction = require('../wallet/transaction');

describe('Blockchain', () => {
  let blockchain, newChain, originalChain, errorMock;

  beforeEach(() => {
    blockchain = new Blockchain();
    newChain = new Blockchain();
    errorMock = jest.fn();
    originalChain = blockchain.chain;
    global.console.error = errorMock;
  });

  it('contain a `chain` Array instance', () => {
    expect(blockchain.chain instanceof Array).toBe(true);
  });

  it('starts with the genesis block', () => {
    expect(blockchain.chain[0]).toEqual(Block.genesis());
  });

  it('adds a new block to the chain', () => {
    const newData = 'foo bar';
    blockchain.addBlock({ data: newData });

    expect(blockchain.chain[blockchain.chain.length - 1].data).toEqual(newData);
  });

  describe('isValidChain()', () => {
    describe('When the chain does not start with the Genesis block', () => {
      it('returns false', () => {
        blockchain.chain[0] = { data: 'fake-genesis' };

        expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
      });
    });

    describe('When the Chain start with the Genesis block and has multiple blocks', () => {
      beforeEach(() => {
        blockchain.addBlock({ data: 'Guinea Pigs' });
        blockchain.addBlock({ data: 'Beets' });
        blockchain.addBlock({ data: 'Star Wars' });
      });

      describe('and a lastHash reference has changed', () => {
        it('return false', () => {
          blockchain.chain[2].lastHash = 'broken-lastHash';

          expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
        });
      });

      describe('and the chain contains a block with an invalid field', () => {
        it('return false', () => {
          blockchain.chain[2].data = 'some-bad-evil-data';

          expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
        });
      });

      describe('and the chain contains a block with a jumped difficulty', () => {
        it('returns false', () => {
          const lastBlock = blockchain.chain[blockchain.chain.length - 1];

          const lastHash = lastBlock.hash;

          const timestamp = Date.now();
          const nonce = 0;
          const data = [];
          const difficulty = lastBlock.difficulty - 3;

          const hash = cryptoHash(timestamp, lastHash, difficulty, nonce, data);

          const badBlock = new Block({
            timestamp,
            lastHash,
            hash,
            nonce,
            difficulty,
            data,
          });

          blockchain.chain.push(badBlock);

          expect(Blockchain.isValidChain(blockchain.chain)).toEqual(false);
        });
      });

      describe('and the chain does not contain any invalid blocks', () => {
        it('return true', () => {
          expect(Blockchain.isValidChain(blockchain.chain)).toBe(true);
        });
      });
    });
  });

  describe('replaceChain()', () => {
    let logMock;

    beforeEach(() => {
      logMock = jest.fn();

      global.console.log = logMock;
    });

    describe('new chain is not longer', () => {
      beforeEach(() => {
        newChain.chain[0] = { new: 'chain' };

        blockchain.replaceChain(newChain.chain);
      });

      it('does not replace the chain', () => {
        expect(blockchain.chain).toEqual(originalChain);
      });

      it('logs an error', () => {
        expect(errorMock).toHaveBeenCalled();
      });
    });

    describe('when the new chain is longer', () => {
      beforeEach(() => {
        newChain.addBlock({ data: 'Guinea Pigs' });
        newChain.addBlock({ data: 'Beets' });
        newChain.addBlock({ data: 'Star Wars' });
      });
      describe('and the chain is invalid', () => {
        beforeEach(() => {
          newChain.chain[2].hash = 'fake-hash';
          blockchain.replaceChain(newChain.chain);
        });
        it('does not replace the chain', () => {
          expect(blockchain.chain).toEqual(originalChain);
        });

        it('logs an error', () => {
          expect(errorMock).toHaveBeenCalled();
        });
      });

      describe('and the chain is valid', () => {
        beforeEach(() => {
          blockchain.replaceChain(newChain.chain);
        });
        it('replaces the chain', () => {
          expect(blockchain.chain).toEqual(newChain.chain);
        });
        it('logs about chain replacement', () => {
          expect(logMock).toHaveBeenCalled();
        });
      });
    });
    describe('and the validateTransactios flag is true', () => {
      it('calls validTransactionData()', () => {
        const validTransactionDataMock = jest.fn();

        blockchain.validTransactionData = validTransactionDataMock;

        newChain.addBlock({ data: 'foo' });
        blockchain.replaceChain(newChain.chain, true);

        expect(validTransactionDataMock).toHaveBeenCalled();
      });
    });
  });
  describe('validTransactionData()', () => {
    let transaction, rewardTransaction, wallet;

    beforeEach(() => {
      wallet = new Wallet();
      transaction = wallet.createTransaction({
        recipient: 'foo-address',
        amount: 60,
      });
      rewardTransaction = Transaction.rewardTransaction({
        minerWallet: wallet,
      });
    });

    describe('and the transaction data is valid', () => {
      it('returns true', () => {
        newChain.addBlock({ data: [transaction, rewardTransaction] });

        expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(
          true
        );
        expect(errorMock).not.toHaveBeenCalled();
      });
    });

    describe('and the transaction data has multiple rewards', () => {
      it('return false and logs an error', () => {
        newChain.addBlock({
          data: [transaction, rewardTransaction, rewardTransaction],
        });

        expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(
          false
        );
        expect(errorMock).toHaveBeenCalled();
      });
    });

    describe('and the transaction data has at least one malformed outputMAp', () => {
      describe('and the transaction is not a reward transaction', () => {
        it('return false and logs an error', () => {
          transaction.outputMap[wallet.publicKey] = 999999;

          newChain.addBlock({ data: [transaction, rewardTransaction] });

          expect(
            blockchain.validTransactionData({ chain: newChain.chain })
          ).toBe(false);
          expect(errorMock).toHaveBeenCalled();
        });
      });

      describe('and the transaction is a reward transaction', () => {
        it('return false and logs an error', () => {
          rewardTransaction.outputMap[wallet.publicKey] = 999999;

          newChain.addBlock({ data: [transaction, rewardTransaction] });

          expect(
            blockchain.validTransactionData({ chain: newChain.chain })
          ).toBe(false);
          expect(errorMock).toHaveBeenCalled();
        });
      });
    });
    describe('and the transaction data has at least one malformed input', () => {
      it('return false and logs an error', () => {
        wallet.balance = 9000;

        const evilOutputMap = {
          [wallet.publicKey]: 8900,
          fooRecipient: 100,
        };

        const evilTransaction = {
          input: {
            timestamp: Date.now(),
            amount: wallet.balance,
            address: wallet.publicKey,
            signature: wallet.sign(evilOutputMap),
          },
          outputMap: evilOutputMap,
        };

        newChain.addBlock({ data: [evilTransaction, rewardTransaction] });

        expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(
          false
        );

        expect(errorMock).toHaveBeenCalled();
      });
    });

    describe('and a block contains multiple identical transaction', () => {
      it('return false and logs an error', () => {
        newChain.addBlock({ data: [transaction, transaction, transaction] });

        expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(
          false
        );
        expect(errorMock).toHaveBeenCalled();
      });
    });
  });
});
