const crypto = require('crypto'); //Provided by NODE

const cryptoHash = (...inputs) => {
  //Initialize and generates a random Hash
  const hash = crypto.createHash('sha256');

  //update the hash based on the inputes provided
  //We stringfy the inputs to deal with the problem that JavaScript has in terms of
  //Object comparising. with objects even if one property changes in the object
  //It will still be equal to the previews
  //!Very important - We sort the inputs to garantee that no matter the order of the inputs the Hash will be the exact same
  hash.update(
    inputs
      .map((input) => JSON.stringify(input))
      .sort()
      .join(' ')
  );

  //We return and digest the Hash
  return hash.digest('hex');
};

module.exports = cryptoHash;
