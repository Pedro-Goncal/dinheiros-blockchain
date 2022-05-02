const crypto = require('crypto'); //Provided by NODE

const cryptoHash = (...inputs) => {
  //Initialize and generates a random Hash
  const hash = crypto.createHash('sha256');

  //update the hash based on the inputes provided
  //!Very important - We sort the inputs to garantee that no matter the order of the inputs the Hash will be the exact same
  hash.update(inputs.sort().join(' '));

  //We return and digest the Hash
  return hash.digest('hex');
};

module.exports = cryptoHash;
