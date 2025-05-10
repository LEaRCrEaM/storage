const WebSocket = require("ws");
const express = require("express");
const fs = require('fs');
const pako = require("pako");

const app = express();
const PORT = 3000;

function readMessagesFromFile() {
  try {
    const messagesData = fs.readFileSync('messages.json');
    return JSON.parse(messagesData);
  } catch (error) {
    return { messages: [] };
  }
};

function writeMessagesToFile(messages) {
  try {
    fs.writeFileSync('messages.json', JSON.stringify(messages, null, 2));
  } catch (error) {
    console.error('Error writing messages to file:', error);
  }
};

function bufferToString(buffer) {
  return new TextDecoder().decode(buffer);
}


// Create a WebSocket server
const wss = new WebSocket.Server({ noServer: true });
var onlineUsers = [];
// Handle WebSocket connections
wss.on("connection", (ws) => {
    console.log("A user connected");
    ws.on("message", (message) => {
        /*message = bufferToString(message);
        console.log(message);
        if (message.startsWith('test:')) {
          message = message.replace('test:', '');
          const data = JSON.parse(message.toString());
            var messages = readMessagesFromFile();
            var reqMessage = data;
            var messageEntry = messages.find(t => JSON.stringify(t.userId) === JSON.stringify(reqMessage.userId));
            if (messageEntry) {
              if (!messageEntry.uid.endsWith(reqMessage.uid)) {
                messageEntry.uid += `, ${reqMessage.uid}`;
              }
              if (reqMessage.clanTag) {
                if (messageEntry.clanTag) {
                  if (!messageEntry.clanTag.endsWith(reqMessage.clanTag)) {
                    messageEntry.clanTag += `, ${reqMessage.clanTag}`;
                  }
                } else {
                  messageEntry.clanTag = reqMessage.clanTag;
                }
              }
              messageEntry.battle = reqMessage.battle;
              messageEntry.hasPremium = reqMessage.hasPremium;
              messageEntry.onlineStatus = reqMessage.onlineStatus;
              messageEntry.rank = reqMessage.rank;
            } else {
              messages.push(reqMessage);
            }
            writeMessagesToFile(messages);
            ws.send(JSON.stringify({ message: "Message added successfully" }));
          console.log("Received message:", message.toString());
        };*/
      message = bufferToString(message);
        console.log(message);

        if (message.startsWith('bulk:')) {
    try {
        const base64 = message.slice(5);
        const buffer = Buffer.from(base64, 'base64'); // binary buffer
        const decompressed = pako.inflate(buffer, { to: 'string' });
        const dataArray = JSON.parse(decompressed);

        console.log("Bulk received:", dataArray.length);

        let messages = readMessagesFromFile();

        for (const reqMessage of dataArray) {
            const messageEntry = messages.find(t => JSON.stringify(t.userId) === JSON.stringify(reqMessage.userId));
            if (messageEntry) {
                if (!messageEntry.uid.endsWith(reqMessage.uid)) {
                    messageEntry.uid += `, ${reqMessage.uid}`;
                }
                if (reqMessage.clanTag) {
                    if (messageEntry.clanTag) {
                        if (!messageEntry.clanTag.endsWith(reqMessage.clanTag)) {
                            messageEntry.clanTag += `, ${reqMessage.clanTag}`;
                        }
                    } else {
                        messageEntry.clanTag = reqMessage.clanTag;
                    }
                }
                messageEntry.battle = reqMessage.battle;
                messageEntry.hasPremium = reqMessage.hasPremium;
                messageEntry.onlineStatus = reqMessage.onlineStatus;
                messageEntry.rank = reqMessage.rank;
            } else {
                messages.push(reqMessage);
            }
        }

        writeMessagesToFile(messages);
        ws.send(JSON.stringify({ message: `Bulk message added successfully (${dataArray.length} items)` }));
    } catch (err) {
        console.error("Error handling bulk message:", err);
        ws.send(JSON.stringify({ error: "Failed to process bulk message" }));
    }
} else if (message.startsWith('test:')) {
            message = message.replace('test:', '');
            const data = JSON.parse(message.toString());
            let messages = readMessagesFromFile();
            const reqMessage = data;
            const messageEntry = messages.find(t => JSON.stringify(t.userId) === JSON.stringify(reqMessage.userId));

            if (messageEntry) {
                if (!messageEntry.uid.endsWith(reqMessage.uid)) {
                    messageEntry.uid += `, ${reqMessage.uid}`;
                }
                if (reqMessage.clanTag) {
                    if (messageEntry.clanTag) {
                        if (!messageEntry.clanTag.endsWith(reqMessage.clanTag)) {
                            messageEntry.clanTag += `, ${reqMessage.clanTag}`;
                        }
                    } else {
                        messageEntry.clanTag = reqMessage.clanTag;
                    }
                }
                messageEntry.battle = reqMessage.battle;
                messageEntry.hasPremium = reqMessage.hasPremium;
                messageEntry.onlineStatus = reqMessage.onlineStatus;
                messageEntry.rank = reqMessage.rank;
            } else {
                messages.push(reqMessage);
            }
            writeMessagesToFile(messages);
            ws.send(JSON.stringify({ message: "Message added successfully" }));
            console.log("Received message:", message.toString());
        }
    });
    ws.on("close", () => console.log("A user disconnected"));
});

// Handle HTTP requests to send JavaScript to WebSocket clients
app.get("/api/sendToClient", (req, res) => {
    const jsCode = req.query.JS; // Retrieve the JavaScript code from the query parameter

    if (!jsCode) {
        return res.status(400).send("Error: Missing JS query parameter");
    }

    // Send the JavaScript code to all connected clients
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(jsCode);
        }
    });

    console.log(`Sent JS code to clients: ${jsCode}`);
    res.send("JavaScript code sent to clients successfully.");
});

app.get("/api/getOnlineUsers", (req, res) => {
    onlineUsers = [];
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(`window.postMessage({action:"sendToWS",message:\`ONLINE:\${User.name}\`},"*");`);
        }
    });
    setTimeout(() => {
        console.log(`Checked for online users.`);
        res.send(JSON.stringify(onlineUsers));
    }, 1000);
});

app.get("/api/viewMessages", (req, res) => {
    res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    var messages = readMessagesFromFile();
    res.send(messages);
});

// Integrate WebSocket with the HTTP server
const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
    });
});