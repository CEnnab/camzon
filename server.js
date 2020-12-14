let bodyParser = require("body-parser");
let express = require("express");
let cors = require("cors");
let morgan = require("morgan");

let app = express();

app.use(bodyParser.raw({ type: "*/*" }));
app.use(cors());
app.use(morgan("combined"));

let userLogin = new Map();
let loggedUsers = new Map();
let listing = new Map();
let cart = new Map();
let purchased = new Map();
let messages = new Map();
let shipped = new Map();

let userToken = 0;
let counter = 0;

let genSessionId = () => {
  counter++;
  return "token" + counter;
};

let getKey = userGiven => {
  let targetToken;
  for (let [key, value] of loggedUsers) {
    if (value === userGiven) targetToken = key;
  }

  return targetToken;
};

app.post("/signup", (req, res) => {
  let parsedBody = JSON.parse(req.body);
  let userGiven = parsedBody.username;
  let passwordGiven = parsedBody.password;
  if (userGiven === undefined) {
    res.send(
      JSON.stringify({ success: false, reason: "username field missing" })
    );
  } else if (passwordGiven === undefined) {
    res.send(
      JSON.stringify({ success: false, reason: "password field missing" })
    );
  } else if (userLogin.has(userGiven)) {
    res.send(JSON.stringify({ success: false, reason: "Username exists" }));
  } else {
    userLogin.set(userGiven, passwordGiven);
    res.send(JSON.stringify({ success: true }));
  }
});

app.post("/login", (req, res) => {
  let parsedBody = JSON.parse(req.body);
  let userGiven = parsedBody.username;
  let passwordGiven = parsedBody.password;
  let expectedPassword = userLogin.get(userGiven);

  if (userGiven === undefined)
    res.send(
      JSON.stringify({ success: false, reason: "username field missing" })
    );
  else if (passwordGiven === undefined)
    res.send(
      JSON.stringify({ success: false, reason: "password field missing" })
    );
  else if (!userLogin.has(userGiven))
    res.send(JSON.stringify({ success: false, reason: "User does not exist" }));
  else if (passwordGiven !== expectedPassword)
    res.send(JSON.stringify({ success: false, reason: "Invalid password" }));
  else {
    userToken = genSessionId();
    loggedUsers.set(userToken, userGiven);
    res.send(JSON.stringify({ success: true, token: userToken }));
  }
});

app.post("/change-password", (req, res) => {
  let userToken = req.headers["token"];
  let parsedBody = JSON.parse(req.body);
  let oldPassword = parsedBody.oldPassword;
  let newPassword = parsedBody.newPassword;
  let userGiven = loggedUsers.get(userToken);
  let currentPassword = userLogin.get(userGiven);

  console.log("current : " + currentPassword);
  console.log("logged : " + userGiven);
  console.log("userLogin : " + userLogin.get(loggedUsers.get(userToken)));

  if (userToken === undefined)
    res.send(JSON.stringify({ success: false, reason: "token field missing" }));
  else if (!loggedUsers.has(userToken))
    res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
  else if (oldPassword !== currentPassword) {
    res.send(
      JSON.stringify({ success: false, reason: "Unable to authenticate" })
    );
  } else {
    userLogin.set(userGiven, newPassword);
    res.send(JSON.stringify({ success: true }));
  }
});

app.post("/create-listing", (req, res) => {
  let userToken = req.headers["token"];
  let parsedBody = JSON.parse(req.body);
  let price = parsedBody.price;
  let description = parsedBody.description;
  let listingId = genSessionId();
  let seller = loggedUsers.get(userToken);

  if (userToken === undefined)
    res.send(JSON.stringify({ success: false, reason: "token field missing" }));
  else if (!loggedUsers.has(userToken))
    res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
  else if (price === undefined)
    res.send(JSON.stringify({ success: false, reason: "price field missing" }));
  else if (description === undefined)
    res.send(
      JSON.stringify({ success: false, reason: "description field missing" })
    );
  else {
    listing.set(listingId, {
      price: price,
      description: description,
      itemId: listingId,
      sellerUsername: seller,
      buyerUsername: undefined
    });
    res.send(JSON.stringify({ success: true, listingId: listingId }));
  }
});

app.get("/listing", (req, res) => {
  let listingId = req.query.listingId;

  if (!listing.has(listingId))
    res.send(JSON.stringify({ success: false, reason: "Invalid listing id" }));
  else {
    res.send(
      JSON.stringify({ success: true, listing: listing.get(listingId) })
    );
  }
});

app.post("/modify-listing", (req, res) => {
  let userToken = req.headers["token"];
  let parsedBody = JSON.parse(req.body);
  let listingId = parsedBody.itemid;
  let price = parsedBody.price;
  let description = parsedBody.description;
  let seller = loggedUsers.get(userToken);

  if (userToken === undefined)
    res.send(JSON.stringify({ success: false, reason: "token field missing" }));
  else if (!loggedUsers.has(userToken))
    res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
  else if (listingId === undefined)
    res.send(
      JSON.stringify({ success: false, reason: "itemid field missing" })
    );
  else {
    if (price === undefined) price = listing.get(listingId)["price"];
    if (description === undefined)
      description = listing.get(listingId)["description"];

    listing.set(listingId, {
      price: price,
      description: description,
      itemId: listingId,
      sellerUsername: seller
    });

    res.send(JSON.stringify({ success: true }));
  }
});

app.post("/add-to-cart", (req, res) => {
  let userToken = req.headers["token"];
  let parsedBody = JSON.parse(req.body);
  let listingId = parsedBody.itemid;

  if (userToken === undefined)
    res.send(JSON.stringify({ success: false, reason: "token field missing" }));
  else if (!loggedUsers.has(userToken))
    res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
  else if (listingId === undefined)
    res.send(
      JSON.stringify({ success: false, reason: "itemid field missing" })
    );
  else if (!listing.has(listingId))
    res.send(JSON.stringify({ success: false, reason: "Item not found" }));
  else {
    let price = listing.get(listingId)["price"];
    let description = listing.get(listingId)["description"];
    let seller = listing.get(listingId)["sellerUsername"];

    if (!cart.has(userToken))
      cart.set(userToken, [
        {
          price: price,
          description: description,
          itemId: listingId,
          sellerUsername: seller
        }
      ]);
    else {
      cart.get(userToken).push({
        price: price,
        description: description,
        itemId: listingId,
        sellerUsername: seller
      });
    }

    res.send(JSON.stringify({ success: true }));
  }
});

app.get("/cart", (req, res) => {
  let userToken = req.headers["token"];

  if (!loggedUsers.has(userToken))
    res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
  else {
    res.send(JSON.stringify({ success: true, cart: cart.get(userToken) }));
  }
});

app.post("/checkout", (req, res) => {
  let userToken = req.headers["token"];

  if (!loggedUsers.has(userToken)) {
    res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
    return;
  }

  if (!cart.has(userToken)) {
    res.send(JSON.stringify({ success: false, reason: "Empty cart" }));
    return;
  }

  let buyer = loggedUsers.get(userToken);

  for (let i = 0; i < cart.get(userToken).length; i++) {
    let item = cart.get(userToken)[i];
    let listingId = item["itemId"];

    if (listing.get(listingId)["buyerUsername"] !== undefined) {
      res.send(
        JSON.stringify({
          success: false,
          reason: "Item in cart no longer available"
        })
      );
      break;
    }

    if (!purchased.has(userToken)) purchased.set(userToken, [item]);
    else purchased.get(userToken).push(item);
    listing.get(listingId)["buyerUsername"] = buyer;
  }
  res.send(JSON.stringify({ success: true }));
});

app.get("/purchase-history", (req, res) => {
  let userToken = req.headers["token"];

  if (!loggedUsers.has(userToken))
    res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
  else {
    res.send(
      JSON.stringify({ success: true, purchased: purchased.get(userToken) })
    );
  }
});

app.post("/chat", (req, res) => {
  let userToken = req.headers["token"];
  let parsedBody = undefined;
  try {
    parsedBody = JSON.parse(req.body);
  } catch {
    parsedBody = {};
  }

  let destination = parsedBody.destination;
  let contents = parsedBody.contents;

  if (!loggedUsers.has(userToken))
    res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
  else if (destination === undefined)
    res.send(
      JSON.stringify({ success: false, reason: "destination field missing" })
    );
  else if (contents === undefined)
    res.send(
      JSON.stringify({ success: false, reason: "contents field missing" })
    );
  else if (!userLogin.has(destination))
    res.send(
      JSON.stringify({
        success: false,
        reason: "Destination user does not exist"
      })
    );
  else {
    res.send(JSON.stringify({ success: true }));
    let userGiven = loggedUsers.get(userToken);
    let chatkey = JSON.stringify([userGiven, destination].sort());

    let message = {
      from: userGiven,
      contents: contents
    };

    if (!messages.has(chatkey)) messages.set(chatkey, [message]);
    else messages.get(chatkey).push(message);
  }
});

app.post("/chat-messages", (req, res) => {
  let userToken = req.headers["token"];

  let parsedBody = undefined;
  try {
    parsedBody = JSON.parse(req.body);
  } catch {
    parsedBody = {};
  }

  let destination = parsedBody.destination;

  if (!loggedUsers.has(userToken))
    res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
  else if (destination === undefined)
    JSON.stringify({ success: false, reason: "destination field missing" });
  else if (!userLogin.has(destination))
    res.send(
      JSON.stringify({
        success: false,
        reason: "Destination user not found"
      })
    );
  else {
    let userGiven = loggedUsers.get(userToken);
    let chatkey = JSON.stringify([userGiven, destination].sort());

    res.send(
      JSON.stringify({ success: true, messages: messages.get(chatkey) })
    );
  }
});

app.post("/ship", (req, res) => {
  let userToken = req.headers["token"];
  let parsedBody = undefined;
  try {
    parsedBody = JSON.parse(req.body);
  } catch {
    parsedBody = {};
  }

  let listingId = parsedBody.itemid;
  let userGiven = loggedUsers.get(userToken);

  if (listing.get(listingId)["buyerUsername"] === undefined)
    JSON.stringify({ success: false, reason: "Item was not sold" });
  else if (shipped.has(listingId))
    JSON.stringify({ success: false, reason: "Item has already shipped" });
  else if (listing.get(listingId)["sellerUsername"] !== userGiven)
    JSON.stringify({ success: false, reason: "User is not selling that item" });
  else {
    shipped.set(userGiven, listingId);
    res.send(JSON.stringify({ success: true }));
  }
});

app.get("/status", (req, res) => {
  let listingId = req.query.itemid;
  if (listing.get(listingId)["buyerUsername"] === undefined)
    JSON.stringify({ success: false, status: "Item not sold" });
  else if (!shipped.has(listingId))
    JSON.stringify({ success: false, status: "not-shipped" });
  else {
    res.send(JSON.stringify({ success: true, status: "shipped" }));
  }
});

app.get("/sourcecode", (req, res) => {
  res.send(
    require("fs")
      .readFileSync(__filename)
      .toString()
  );
});
app.listen(process.env.PORT || 3000);
