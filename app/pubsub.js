const redis = require('redis');

const CHANNELS = {
  TEST: 'TEST',
  BLOCKCHAIN: 'BLOCKCHAIN',
  TRANSACTION: 'TRANSACTION',
};

class PubSub {
  constructor({ blockchain, transactionPool, redisUrl }) {
    this.blockchain = blockchain;
    this.transactionPool = transactionPool;

    this.publisher = redis.createClient(redisUrl);
    this.subscriber = redis.createClient(redisUrl);

    this.subscribeToChannels();

    this.subscriber.on('message', (channel, message) =>
      this.handleMessage(channel, message)
    );
  }

  //---------------------------------------------------
  //------------- HANDLE MESSAGE ----------------------
  //---------------------------------------------------

  handleMessage(channel, message) {
    console.log(`Message received. Channel: ${channel}. Message: ${message}.`);

    const parsedMessage = JSON.parse(message);

    switch (channel) {
      case CHANNELS.BLOCKCHAIN:
        this.blockchain.replaceChain(parsedMessage, true, () => {
          this.transactionPool.clearBlockchainTransactions({
            chain: parsedMessage,
          });
        });
        break;
      case CHANNELS.TRANSACTION:
        this.transactionPool.setTransaction(parsedMessage);
        break;
      default:
        return;
    }
  }
  //---------------------------------------------------

  //---------------------------------------------------
  //----------- SUBSCRIBE TO CHANNELS ----------------
  // This functions loops through the CHANNELS object
  //and subscribes to all the avaialble channels
  //---------------------------------------------------

  subscribeToChannels() {
    Object.values(CHANNELS).forEach((channel) => {
      this.subscriber.subscribe(channel);
    });
  }
  //---------------------------------------------------

  //---------------------------------------------------
  //---------------- PUBLISH TO CHANNEL ---------------
  // Send message to the designated channel
  //---------------------------------------------------

  publish({ channel, message }) {
    //First unsuscribe to the channel, we then publish the message to the channel
    //and then we re subscrbe to the channel
    //To avoid sending the meesage to our selfes
    this.subscriber.unsubscribe(channel, () => {
      this.publisher.publish(channel, message, () => {
        this.subscriber.subscribe(channel);
      });
    });
  }
  //---------------------------------------------------

  //---------------------------------------------------
  //---------------- BROADCAST CHAIN ------------------
  //---------------------------------------------------

  broadcastChain() {
    this.publish({
      channel: CHANNELS.BLOCKCHAIN,
      message: JSON.stringify(this.blockchain.chain),
    });
  }
  //---------------------------------------------------

  //---------------------------------------------------
  //------------ BROADCAST TRANSACTION ----------------
  //---------------------------------------------------

  broadcastTransaction(transaction) {
    this.publish({
      channel: CHANNELS.TRANSACTION,
      message: JSON.stringify(transaction),
    });
  }
}

module.exports = PubSub;
