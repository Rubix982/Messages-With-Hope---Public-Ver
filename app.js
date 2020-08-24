/**
 * Copyright 2019-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Messenger For Original Coast Clothing
 * https://developers.facebook.com/docs/messenger-platform/getting-started/sample-apps/original-coast-clothing
 */

"use strict";

// Imports dependencies and set up http server
const express = require("express"),
  { urlencoded, json } = require("body-parser"),
  crypto = require("crypto"),
  path = require("path"),
  Receive = require("./services/receive"),
  GraphAPi = require("./services/graph-api"),
  User = require("./services/user"),
  config = require("./services/config"),
  i18n = require("./i18n.config"),
  fetch = require("node-fetch"),
  XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest,
  { Wit, log } = require("node-wit"),
  sendAPI = require("./services-new/send"),
  app = express();

//  HACKISH WAY
// CREATING A NEW CLASS TO KEEP ALL THE DATA IN ONE PLACE

// class User {
//   constructor() {
//     this.psid = "";
//     this.disease = "";
//     this.patientName = "";
//     this.patientAge = "";
//     this.phoneNumber = "";
//     this.address = "";
//     this.location = "";
//   }
// }

// let user = new User();

let diseaseName = "",
  name = "",
  age = "",
  phoneNumber = "",
  address = "",
  location = "",
  location_point = null,
  locationReceived = false;

const WitAiClient = new Wit({
  accessToken: process.env.WIT_TOKEN,
  logger: new log.Logger(log.DEBUG), // optional
});

const { Client, Status } = require("@googlemaps/google-maps-services-js");
const { response } = require("express");
const { SSL_OP_EPHEMERAL_RSA } = require("constants");
const { time } = require("console");
const client = new Client({});
require("dotenv").config();

// Webserver parameter
const PORT = process.env.PORT || 8445;

// Wit.ai parameters
// NEED TO CHANGE THIS BASED ON YOUR SERVER
const WIT_TOKEN = process.env.WIT_TOKEN;

// Messenger API parameters
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
if (!PAGE_ACCESS_TOKEN) {
  throw new Error("missing PAGE_ACCESS_TOKEN");
}
const APP_SECRET = process.env.APP_SECRET;
if (!APP_SECRET) {
  throw new Error("missing APP_SECRET");
}

var users = {};

// Parse application/x-www-form-urlencoded
app.use(
  urlencoded({
    extended: true,
  })
);

const sendMessageToMessenger = (PSID, textUser) => {
  const body = JSON.stringify({
    message: {
      text: textUser,
    },
    recipient: {
      id: PSID,
    },
  });
  const accessToken = "access_token=" + encodeURIComponent(PAGE_ACCESS_TOKEN);
  return fetch("https://graph.facebook.com/v7.0/me/messages?" + accessToken, {
    message_type: "RESPONSE",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  })
    .then((response) => response.json())
    .catch((json) => {
      if (json.error && json.error.message) {
        throw new Error(json.erorr.message);
      }
    })
    .finally((json) => {
      return json;
    });
};

app.use(express.static(__dirname + "/views/assets"));

// Parse application/json. Verify that callback came from Facebook
app.use(json({ verify: verifyRequestSignature }));

// Serving static files in Express
app.use(express.static(path.join(path.resolve(), "public")));

// Set template engine in Express
app.set("view engine", "ejs");

// Respond with index file when a GET request is made to the homepage
app.get("/", function(_req, res) {
  res.render("index");
});

app.get("/hospital", function(_req, res) {
  let places;
  let origin_str;
  console.log(_req.query.location);
  if (_req.query.location) {
    console.log(_req.query.location);
    origin_str = String(_req.query.location);
  }

  client
    .placesNearby({
      params: {
        location: origin_str,
        //radius:1500
        type: "hospital",
        //keyword:healthcare
        key: process.env.MAPS_KEY,
        rankby: "distance",
      },
      timeout: 1000, // milliseconds)
    })
    .then((r) => {
      // Currently disabling the information being logged by the google map apis
      // console.log(r.data);
      console.log(origin_str.split(",")[0]);
      places = r.data.results;
      res.render("hospital", {
        places: places,
        places_json: JSON.stringify(places),
        origin_str: origin_str,
        lat: _req.query.location.split(",")[0],
        lng: _req.query.location.split(",")[1],
      });
    })
    .catch((error) => {
      console.log("Error Retriving Healthcare Centres", e);
    });
});

async function getLocationNearAddress(streetAddress) {
  let params = {
    address: streetAddress,
    components: "country:PK",
    key: process.env.MAPS_KEY,
  };

  console.log("retrieving lat, lng for " + streetAddress);
  client
    .geocode({
      params: params,
    })
    .then((response) => {
      console.log("status: " + response.data.status);
      console.log(response.data.results[0].geometry.location.lat);
      console.log(response.data.results[0].geometry.location.lng);
      return response;
    })
    .catch((error) => {
      console.log("error retrieving geocoded results", error);
    });
}

// Adds support for GET requests to our webhook
app.get("/webhook", (req, res) => {
  // Parse the query params
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
    // Checks the mode and token sent is correct
    if (mode === "subscribe" && token === config.verifyToken) {
      // Responds with the challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

// FOR DEPLOYING TO THE FB PAGE
// Creates the endpoint for your webhook
app.post("/webhook", (req, res) => {
  let body = req.body;

  // console.log(req);

  // Checks if this is an event from a page subscription
  if (body.object === "page") {
    // Returns a '200 OK' response to all requests
    res.status(200).send("EVENT_RECEIVED");

    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {
      // Checking for each new message
      entry.messaging.forEach((event) => {
        // Checking if new message
        if (event.message && !event.message.is_echo) {
          console.log(event);

          // New message received
          const sender = event.sender.id;
          // const sender = 1;

          /*
            checking if the user is a past user or already has
            their PSID stores in the users variable. This operation
            is done on the line
            let senderPsid = webhookEvent.sender.id;
            if (!(senderPsid in users)) {
              let user = new User(senderPsid);
              ...
          */

          const { text, attachments } = event.message;

          // Checking if attachments are properly received
          if (attachments) {
            //  Currently no handling for attachments made
            // igoring this result and throwing and error
            console.log(attachments[0].payload.url);
            var uri_dec = decodeURIComponent(attachments[0].payload.url);
            console.log(uri_dec);
            location_point = uri_dec.split("where1=")[1];
            location_point = location_point.split("&FORM")[0];
            location_point = location_point.replace("%2C", "");
            location_point = location_point.split("+");
            console.log(`Attachment handled above ${location_point}`);

            // sendAPI
            // .sendMessage(sender, "Attachments are currently not handled")
            // console.log(attachments);
          }

          // for the location via the map
          if (location_point != null || !locationReceived) {
            locationReceived = true;
            // For the geolocation http://messages-with-hope.herokuapp.com/hospital?location=lat,lng

            // Assuming only 1 object exists in the
            // entitiy array object
            console.log("here in location - geolocation");
            console.log(`Location received from user ${location_point}`);
            console.log(
              `Location received after parsing it through the google map API ${location_point}`
            );

            let timeOutLocation = 0;
            location = location_point;

            // location_point = location_point.split(",");

            setTimeout(() => {
              sendMessageToMessenger(
                sender,
                "Locations can be viewed at " +
                  "http://messages-with-hope.herokuapp.com/hospital?location=" +
                  location_point
              ).catch((err) => {
                console.log("Message not sent");
              });
            }, timeOutLocation);

            location_point = null;

            return;
          }

          if (text) {
            // else if I received text

            WitAiClient.message(text)
              .then(
                ({ entities, intents, traits }) => {
                  // IMPORTANT!!!!!!!!!!!!!!!!!!!!!
                  // Flow of dialog starts from here

                  let checkEntrance = false;

                  if (intents) {
                    console.log("here in intents");
                    console.log(intents[0]);
                    if (intents[0].name == "greeting") {
                      console.log("here in greetings");
                      checkEntrance = true;
                      let timeOut = 0;

                      setTimeout(() => {
                        sendMessageToMessenger(
                          sender,
                          'Welcome to "Messages With Hope".'
                        ).catch((err) => {
                          console.log("Message not sent");
                        });
                      }, timeOut);

                      timeOut += 1000;

                      setTimeout(() => {
                        sendMessageToMessenger(
                          sender,
                          "If you are in an emergency, reply with proceed. If you want to learn more about it, reply back with about"
                        ).catch((err) => {
                          console.log("Message not sent");
                        });
                      }, timeOut);

                      return;
                    }

                    if (intents[0]["name"] == "proceed") {
                      console.log("here in proceed");
                      checkEntrance = true;

                      let timeOut = 0;

                      setTimeout(() => {
                        sendMessageToMessenger(
                          sender,
                          "Please enter the symptom of the patient, patient's age, patient's name, the address, and your phone number"
                        ).catch((err) => {
                          console.log("Message not sent");
                        });
                      }, timeOut);

                      timeOut += 2000;

                      setTimeout(() => {
                        sendMessageToMessenger(
                          sender,
                          "Please give the information in seperate messages"
                        ).catch((err) => {
                          console.log("Message not sent");
                        });
                      }, timeOut);

                      timeOut += 2000;

                      setTimeout(() => {
                        sendMessageToMessenger(
                          sender,
                          "For the location, you can either share it via the location option if you are on mobile"
                        ).catch((err) => {
                          console.log("Message not sent");
                        });
                      }, timeOut);

                      timeOut += 2000;

                      setTimeout(() => {
                        sendMessageToMessenger(
                          sender,
                          "Or you can either write out the message"
                        ).catch((err) => {
                          console.log("Message not sent");
                        });
                      }, timeOut);

                      timeOut += 2000;

                      setTimeout(() => {
                        sendMessageToMessenger(
                          sender,
                          "You will see a confirmation once all the data has been given"
                        ).catch((err) => {
                          console.log("Message not sent");
                        });
                      }, timeOut);

                      return;
                    }
                  } else {
                    console.log("Intent not found");
                  }

                  if (entities && !checkEntrance) {
                    console.log("In entities");

                    // for Disease
                    if (intents[0]["name"] == "disease") {
                      diseaseName = entities["disease:disease"][0]["body"];
                      console.log("here in disease");
                      console.log(diseaseName);

                      setTimeout(() => {
                        sendMessageToMessenger(
                          sender,
                          `Disease name received as ${diseaseName}`
                        ).catch((err) => {
                          console.log("Message not sent");
                        });
                      }, 0);

                      return;
                    }

                    // for the age
                    if (intents[0]["name"] == "giveAge") {
                      console.log("hello from age");

                      age =
                        entities["wit$age_of_person:age_of_person"][0]["body"];
                      console.log("here in age");
                      console.log(age);

                      setTimeout(() => {
                        sendMessageToMessenger(
                          sender,
                          `Age received as ${age}`
                        ).catch((err) => {
                          console.log("Message not sent  ");
                        });
                      }, 0);

                      return;
                    }

                    // For the name
                    if (intents[0]["name"] == "getName") {
                      console.log("here in name");

                      if (
                        entities["name:name"][1]["body"] &&
                        entities["name:name"][1]["body"] != "name"
                      ) {
                        name = entities["name:name"][1]["body"];
                      } else if (
                        entities["name:name"][0]["body"] &&
                        entities["name:name"][0]["body"] != "name"
                      ) {
                        name = entities["name:name"][0]["body"];
                      }

                      console.log(name);

                      setTimeout(() => {
                        sendMessageToMessenger(
                          sender,
                          `Name received as ${name}`
                        ).catch((err) => {
                          console.log("Message not sent");
                        });
                      }, 0);

                      return;
                    }

                    // for the location via text
                    if (
                      (intents[0]["name"] == "giveLocation" &&
                        entities["wit$location:location"]) ||
                      !locationReceived
                    ) {
                      locationReceived = true;
                      // For the geolocation http://messages-with-hope.herokuapp.com/hospital?location=lat,lng
                      // Assuming only 1 object exists in the
                      // entitiy array object

                      // For the street address http://messages-with-hope.herokuapp.com/hospital?address=address
                      console.log("here in location - street location");
                      location = entities["wit$location:location"][0]["body"];
                      console.log(`Location received from user ${location}`);
                      const locationStreet = getLocationNearAddress(location);

                      console.log(
                        `Location received after parsing it through the google map API ${locationStreet.data.results[0].geometry.lat},${locationStreet.data.results[0].geometry.location.lng}`
                      );

                      let timeOutLocation = 0;

                      setTimeout(() => {
                        sendMessageToMessenger(
                          sender,
                          `Location received for street is ${location}, at coordinates ${locationStreet.data.results[0].geometry.lng},${locationStreet.data.results[0].geometry.location.lat}`
                        ).catch((err) => {
                          console.log("Message not sent");
                        });
                      }, timeOutLocation);

                      timeOutLocation += 1000;

                      location = location.split(" ").join("%20");

                      setTimeout(() => {
                        sendMessageToMessenger(
                          sender,
                          "Locations can be viewed at" +
                            "http://messages-with-hope.herokuapp.com/hospital?address=" +
                            location
                        ).catch((err) => {
                          console.log("Message not sent");
                        });
                      }, timeOutLocation);

                      return;
                    }

                    // for the phone number
                    if (intents[0]["name"] == "givePhoneNumber") {
                      console.log("here in phone number");
                      phoneNumber =
                        entities["wit$phone_number:phone_number"][0]["body"];

                      if (phoneNumber.startsWith("92"))
                        phoneNumber = "+" + phoneNumber;

                      console.log(phoneNumber);

                      setTimeout(() => {
                        sendMessageToMessenger(
                          sender,
                          `Phone number received as ${phoneNumber}`
                        ).catch((err) => {
                          console.log("Message not sent");
                        });
                      }, 0);

                      return;
                    }
                  }
                },
                (err) => {
                  console.log("Fetch error: ", err);
                }
              )
              .catch((err) => {
                console.log(
                  "Some error ocurred. Developers have been notified with " +
                    err
                );
              });
          }

          if (
            diseaseName != "" &&
            age != "" &&
            name != "" &&
            phoneNumber != ""
            // && location != "" complete this part in the last
          ) {
            console.log("All info received");

            let timeOutLocation = 1000;

            setTimeout(() => {
              sendMessageToMessenger(
                sender,
                `All information received!\n` +
                  `Name is \"${name}\"\n` +
                  `Age is \"${age}\"\n` +
                  `Disease is \"${diseaseName}\"\n` +
                  `Phone Number is \"${phoneNumber}\"\n`
                // + `Location is \"${Location}\"`
              ).catch((err) => {
                console.log("Message not sent");
              });
            }, timeOutLocation);

            return;
          }
        }
      });

      if ("changes" in entry) {
        // Handle Page Changes event
        let receiveMessage = new Receive();
        if (entry.changes[0].field === "feed") {
          let change = entry.changes[0].value;
          switch (change.item) {
            case "post":
              return receiveMessage.handlePrivateReply(
                "post_id",
                change.post_id
              );
              break;
            case "comment":
              return receiveMessage.handlePrivateReply(
                "commentgity _id",
                change.comment_id
              );
              break;
            default:
              console.log("Unsupported feed change type.");
              return;
          }
        }
      }

      // Gets the body of the webhook event
      let webhookEvent = entry.messaging[0];
      // console.log(webhookEvent);

      // Discard uninteresting events
      if ("read" in webhookEvent) {
        console.log("Got a read event");
        return;
      }

      if ("delivery" in webhookEvent) {
        console.log("Got a delivery event");
        return;
      }

      // Get the sender PSID
      let senderPsid = webhookEvent.sender.id;

      if (!(senderPsid in users)) {
        let user = new User(senderPsid);

        GraphAPi.getUserProfile(senderPsid)
          .then((userProfile) => {
            user.setProfile(userProfile);
          })
          .catch((error) => {
            // The profile is unavailable
            console.log("Profile is unavailable:", error);
          })
          .finally(() => {
            users[senderPsid] = user;
            i18n.setLocale(user.locale);
            console.log(
              "New Profile PSID:",
              senderPsid,
              "with locale:",
              i18n.getLocale()
            );
          });
      } else {
        i18n.setLocale(users[senderPsid].locale);
        console.log(
          "Profile already exists PSID:",
          senderPsid,
          "with locale:",
          i18n.getLocale()
        );
      }
    });
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
});

// Set up your App's Messenger Profile
app.get("/profile", (req, res) => {
  let token = req.query["verify_token"];
  let mode = req.query["mode"];

  if (!config.webhookUrl.startsWith("https://")) {
    res.status(200).send("ERROR - Need a proper API_URL in the .env file");
  }
  var Profile = require("./services/profile.js");
  Profile = new Profile();

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
    if (token === config.verifyToken) {
      if (mode == "webhook" || mode == "all") {
        Profile.setWebhook();
        res.write(
          `<p>Set app ${config.appId} call to ${config.webhookUrl}</p>`
        );
      }
      if (mode == "profile" || mode == "all") {
        Profile.setThread();
        res.write(`<p>Set Messenger Profile of Page ${config.pageId}</p>`);
      }
      if (mode == "personas" || mode == "all") {
        Profile.setPersonas();
        res.write(`<p>Set Personas for ${config.appId}</p>`);
        res.write(
          "<p>To persist the personas, add the following variables \
          to your environment variables:</p>"
        );
        res.write("<ul>");
        res.write(`<li>PERSONA_BILLING = ${config.personaBilling.id}</li>`);
        res.write(`<li>PERSONA_CARE = ${config.personaCare.id}</li>`);
        res.write(`<li>PERSONA_ORDER = ${config.personaOrder.id}</li>`);
        res.write(`<li>PERSONA_SALES = ${config.personaSales.id}</li>`);
        res.write("</ul>");
      }
      if (mode == "nlp" || mode == "all") {
        GraphAPi.callNLPConfigsAPI();
        res.write(`<p>Enable Built-in NLP for Page ${config.pageId}</p>`);
      }
      if (mode == "domains" || mode == "all") {
        Profile.setWhitelistedDomains();
        res.write(`<p>Whitelisting domains: ${config.whitelistedDomains}</p>`);
      }
      if (mode == "private-reply") {
        Profile.setPageFeedWebhook();
        res.write(`<p>Set Page Feed Webhook for Private Replies.</p>`);
      }
      res.status(200).end();
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  } else {
    // Returns a '404 Not Found' if mode or token are missing
    res.sendStatus(404);
  }
});

// Verify that the callback came from Facebook.
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    console.log("Couldn't validate the signature.");
  } else {
    var elements = signature.split("=");
    var signatureHash = elements[1];
    var expectedHash = crypto
      .createHmac("sha1", config.appSecret)
      .update(buf)
      .digest("hex");
    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

// Check if all environment variables are set
config.checkEnvVariables();

// listen for requests :)
var listener = app.listen(config.port, function() {
  console.log("Your app is listening on port " + listener.address().port);

  if (
    Object.keys(config.personas).length == 0 &&
    config.appUrl &&
    config.verifyToken
  ) {
    console.log(
      "Is this the first time running?\n" +
        "Make sure to set the both the Messenger profile, persona " +
        "and webhook by visiting:\n" +
        config.appUrl +
        "/profile?mode=all&verify_token=" +
        config.verifyToken
    );
  }

  if (config.pageId) {
    console.log("Test your app by messaging:");
    console.log("https://m.me/" + config.pageId);
    getLocationNearAddress("Nooree,Karachi");
  }
});
