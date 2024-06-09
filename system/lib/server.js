// server.js
import express from "express";
import bodyParser from "body-parser";

const app = express();
const port = process.env.PORT || 1912;

app.use(bodyParser.json());

app.listen(port, () => {
  console.log(`Webhook server running on port ${port}`);
});

export default app;
