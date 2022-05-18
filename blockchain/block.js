const hexToBinary = require('hex-to-binary');
const { GENESIS_DATA, MINE_RATE } = require('../config');
const { cryptoHash } = require('../util/util');

class Block {
  constructor({ timestamp, lastHash, hash, data, nonce, difficulty }) {
    this.timestamp = timestamp;
    this.lastHash = lastHash;
    this.hash = hash;
    this.data = data;
    this.nonce = nonce;
    this.difficulty = difficulty;
  }
  //===============================================================
  //==================== GENESIS BLOCK ============================
  //===============================================================
  //Create the First Block on the chain, with the default data
  //provided on the config.js
  //===============================================================

  static genesis() {
    //Creates an instance of this class
    return new this(GENESIS_DATA);
  }
  //===============================================================

  //===============================================================
  //===================== MINE A NEW BLOCK ========================
  //===============================================================
  // Function to create a new block with: New Hash, last hash,
  //timestamp, new data, timestamp, NONCE, difficulty
  //===============================================================

  static mineBlock({ lastBlock, data }) {
    let hash, timestamp;

    //Grab last hash from last block from the lastBlock Object
    const lastHash = lastBlock.hash;

    //Grab difficulty from last block from the lastBlock Object
    let { difficulty } = lastBlock;

    //Initialize NONCE - Number only used once
    let nonce = 0;

    //Find the right HASH based on the difficulty
    //
    do {
      nonce++;
      timestamp = Date.now();
      difficulty = Block.adjustDifficulty({
        originalBlock: lastBlock, //Pass the last block data to have access to last dificulty and last timestamp
        timestamp, //Pass current timestamp to compare with last timestamp
      });
      hash = cryptoHash(timestamp, lastHash, data, nonce, difficulty);
    } while (
      hexToBinary(hash).substring(0, difficulty) !== '0'.repeat(difficulty)
    );
    /*To get the right hash we check the leading 0's of the hash, 
    the difficulty sets how many leading 0's the hash should have,
    We use the Hex-to-binary package to temporarely convert the hexadecimal hash into binary
    so it has a higher difficulty and a more accurate average */

    //Create and return a new block
    return new Block({ timestamp, lastHash, data, difficulty, nonce, hash });
  }

  //===============================================================

  //===============================================================
  //=================== ADJUST DIFICULTY ==========================
  //===============================================================
  //Function to automaticly adjust the mining difficulty
  //===============================================================

  static adjustDifficulty({ originalBlock, timestamp }) {
    //Grab the difficulty from the last block
    const { difficulty } = originalBlock;

    //Insure that the difficulty is never lower then 1
    if (difficulty < 1) return 1;

    /* Check if the difference is bigger, if it is then reduce the difficulty.
    If the current time - the time stamp from the last block is bigger then the Minning rate,
    it means that it took longer then the set averarge to mine the last block
    therefore we want to reduce the dificulty */
    if (timestamp - originalBlock.timestamp > MINE_RATE) return difficulty - 1;

    /*If it did NOT take longer then the Mining rate average to min then we want/
    to increse the difficulty */
    return difficulty + 1;
  }
  //===============================================================
}

module.exports = Block;
