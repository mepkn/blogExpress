import "dotenv/config";
import express, { json, urlencoded } from "express";

const port = process.env.PORT || 3000;
const app = express();

app.use(json());
app.use(urlencoded({ extended: true }));

app.listen(port, () => {
  console.log(`Server started on port http://localhost:${port}`);
});
