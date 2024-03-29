/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-magic-numbers */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable toplevel/no-toplevel-side-effect */

import "dotenv/config";

import cors from "cors";
import express from "express";
import { expressSharp, FsAdapter, HttpAdapter } from "express-sharp";
import Keyv from "keyv";
import { AddressInfo } from "net";
import { join } from "path";
import apiRoutes from "./routes/api";

const fileUpload = require("express-fileupload");
// Cache in-memory
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = new Keyv("sqlite://./cache/img_cache.sqlite") as any;

// Cache using Redis
// const cache = new Keyv('redis://', { namespace: 'express-sharp' })
const DEFAULT_PORT = 3340;
const app = express();
const PORT = process.env.PORT || DEFAULT_PORT;

app.use(express.json());
app.use(express.urlencoded());
app.use(fileUpload());

app.use(
  cors({
    origin: [
      "http://localhost:3000", // @todo: remove after testing
      "https://app.tohju.com",
      process.env.NODE_ENV !== "production"
        ? "http://localhost:3000"
        : "https://app.easyvcam.online",
    ],
  })
);

// app.use(express.static(join(__dirname, 'public')))
app.use(express.static(join(__dirname, "media")));

app.use(
  "/local-media",
  expressSharp({
    cache,
    imageAdapter: new HttpAdapter({
      prefixUrl: `http://localhost:${DEFAULT_PORT}/get-media`,
    }),
  })
);

app.use(
  "/wp-media",
  expressSharp({
    cache,
    imageAdapter: new HttpAdapter({ prefixUrl: "https://easyvcam.online" }),
  })
);

app.use(
  "/get-media",
  expressSharp({
    cache,
    imageAdapter: new FsAdapter("./media"),
  })
);

apiRoutes(app, PORT);

const server = app.listen(PORT, function () {
  const { address, port } = server.address() as AddressInfo;
  // eslint-disable-next-line no-console
  console.log("✔ Example app listening at http://%s:%s", address, port);
});
