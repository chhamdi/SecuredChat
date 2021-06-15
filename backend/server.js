const express = require("express");
const app = express();
const port = 8002;
var server = require("http").Server(app);
const io = require("socket.io")(server)
const users = require("./configs/users");
const cors = require("cors");
app.use(cors())

const amqp = require('amqplib');
const EventEmitter = require('events');
const uuid = require('uuid');

const RABBITMQ = 'amqp://localhost';

// pseudo-queue for direct reply-to
const REPLY_QUEUE = 'amq.rabbitmq.reply-to';
const q = 'example';

// Credits for Event Emitter goes to https://github.com/squaremo/amqp.node/issues/259

const createClient = rabbitmqconn =>
  amqp
    .connect(rabbitmqconn)
    .then(conn => conn.createChannel())
    .then(channel => {
      channel.responseEmitter = new EventEmitter();
      channel.responseEmitter.setMaxListeners(0);
      channel.consume(
        'example',
        msg => {
          channel.responseEmitter.emit(
            msg.properties.correlationId,
            msg.content.toString('utf8'),
          );
        },
        { noAck: true },
      );
      return channel;
    });

const sendRPCMessage = (channel, message, rpcQueue) =>
  new Promise(resolve => {
    const correlationId = uuid.v4();
    channel.responseEmitter.once(correlationId, resolve);
    channel.sendToQueue(rpcQueue, Buffer.from(message), {
      correlationId,
      replyTo: 'example',
    });
  });

  const init = async () => {
    const channel = await createClient(RABBITMQ);
    return channel;
    //const message = { uuid: uuid.v4() };
  //
    //console.log(`[ ${new Date()} ] Message sent: ${JSON.stringify(message)}`);
  
    //const respone = await sendRPCMessage(channel, "hello", q);
  //
    //console.log(`[ ${new Date()} ] Message received: ${respone}`);
  //
    //process.exit();
  };
const a = init();
console.log(a)
var clients = {};

io.on("connection", function(client) {
  client.on("sign-in", e => {
    let user_id = e.id;
    if (!user_id) return;
    client.user_id = user_id;
    if (clients[user_id]) {
      clients[user_id].push(client);
    } else {
      clients[user_id] = [client];
    }
  });

  client.on("message", e => {
    let targetId = e.to;
    let sourceId = client.user_id;
    if(targetId && clients[targetId]) {
      clients[targetId].forEach(cli => {
        cli.emit("message", e);
      });
    }

    if(sourceId && clients[sourceId]) {
      clients[sourceId].forEach(cli => {
        cli.emit("message", e);
      });
    }
  });

  client.on("disconnect", function() {
    if (!client.user_id || !clients[client.user_id]) {
      return;
    }
    let targetClients = clients[client.user_id];
    for (let i = 0; i < targetClients.length; ++i) {
      if (targetClients[i] == client) {
        targetClients.splice(i, 1);
      }
    }
  });
});

app.get("/users", async (req, res) => {
  // publishing messages to the ldap should be here: inside each request 

  //const channel = await a;
  //const respone = await sendRPCMessage(channel, "hello", q);
  //console.log(`[ ${new Date()} ] Message received: ${respone}`);
  res.send({ data: users });
});

server.listen(port, () =>
  console.log(`Example app listening on port ${port}!`)
);
