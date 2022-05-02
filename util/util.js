const EC = require('elliptic').ec;
const cryptoHash = require('./crypto-hash');

//Elliptic Cryptography instance
const ec = new EC('secp256k1');

const verifySignature = ({ publicKey, data, signature }) => {
  const keyFromPublic = ec.keyFromPublic(publicKey, 'hex'); //Recives the publick Key or Address in hexadecimal format

  return keyFromPublic.verify(cryptoHash(data), signature);
};

module.exports = { ec, verifySignature, cryptoHash };

/*
=========================== NOTES = ============================
  elliptic is an elliptic curve based cryptography package,
  it centers around the idea that it is computationally infeasible
  and impossibly expensive to guess the answer to a randomly
  generated illiptic curve.

  Bitcoin uses the "secp256k1" curve algorithm, 

  "sec" - Standart of Efficient Cryptography
  "p" - Prime, it is crutial to use prime numbers to generate the curve
  "256" - 256 bits
  "k" - Koblets, name of the Mathematician that helped create this algo
  "1" - First implementation

*/
