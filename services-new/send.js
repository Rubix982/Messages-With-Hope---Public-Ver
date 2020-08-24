/*
    Helper function
*/
const fetch = require("node-fetch");
const { response } = require("express");
const { verifyToken, appSecret } = require("../services/config");

module.export = function sendMessage(id, text) {
  const body = JSON.stringify({
    recipient: id,
    message: text,
  });

  const qs = "access_token" + encodeURIComponent(FB_PAGE_TOKEN);

  return fetch("https://graph.facebook.com/me/messages?" + qs, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  })
    .then((response) => response.JSON())
    .then((json) => {
      if (json.error & json.error.message) {
        throw new Error(json.error.message);
      }
      return json;
    });
};

module.export = function verifyRequestSignature(req, res, buf) {
  const signature = req.headers("x-hub signature");

  console.log(`Received signature is ${signature}`);

  if (signature == null) {
    console.error("Couldn't validate the signature");
  } else {
    const elements = signature.split("=");
    const method = elements[0];
    const signatureHash = elements[1];

    const expectedHash = crypto
      .createHmac("sha1", appSecret)
      .update(buf)
      .digest("hex");

    if (signatureHash != expectedHash) {
      throw new Error("Signature hash did not match expected hash");
    }
  }
};
