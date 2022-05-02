const redis = require('redis');

const CHANNELS = {
  TEST: 'TEST',
  BLOCKCHAIN: 'BLOCKCHAIN',
};

class PubSub {
  constructor({ blockchain }) {
    this.blockchain = blockchain;

    this.publisher = redis.createClient();
    this.subscriber = redis.createClient();

    this.subscribeToChannels();

    this.subscriber.on('message', (channel, message) =>
      this.handleMessage(channel, message)
    );
  }

  //---------------------------------------------------
  //------------- HANDLE MESSAGE ----------------------
  //---------------------------------------------------

  handleMessage(channel, message) {
    console.log(`Message recived. Channel ${channel}. Message: ${message}`);

    const parsedMessage = JSON.parse(message);

    if (channel === CHANNELS.BLOCKCHAIN) {
      this.blockchain.replaceChain(parsedMessage);
    }
  }
  //---------------------------------------------------

  //---------------------------------------------------
  //--------------- SUBSCRIBE TO CHANNELS -------------
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
  //
  //---------------------------------------------------

  broadcastChain() {
    this.publish({
      channel: CHANNELS.BLOCKCHAIN,
      message: JSON.stringify(this.blockchain.chain),
    });
  }
  //---------------------------------------------------
}

module.exports = PubSub;
