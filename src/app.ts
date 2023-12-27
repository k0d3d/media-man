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

import axios from "axios";
import cors from "cors";
import crypto from "crypto";
import express from "express";
import { expressSharp, FsAdapter, HttpAdapter } from "express-sharp";
import fs from "fs";
import Keyv from "keyv";
import { AddressInfo } from "net";
import path, { join } from "path";

const fileUpload = require("express-fileupload");
// Cache in-memory
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = new Keyv("sqlite://./cache/img_cache.sqlite") as any;

// Cache using Redis
// const cache = new Keyv('redis://', { namespace: 'express-sharp' })
const DEFAULT_PORT = 3340;
const app = express();
const PORT = process.env.PORT || DEFAULT_PORT;
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

app.use(fileUpload());

app.use(
  cors({
    origin: [
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
  "/share-media",
  expressSharp({
    cache,
    imageAdapter: new HttpAdapter({
      prefixUrl:
        "https://easyvcam.online/wp-json/pxl-v-cam-app/v1/fetch-img?image_url=https://sharp.easyvcam.online/wp-media",
    }),
    // imageAdapter: new FsAdapter(join(__dirname, 'media')),
  })
);

app.use(
  "/get-media",
  expressSharp({
    cache,
    imageAdapter: new FsAdapter(join(__dirname, "media")),
  })
);

// Endpoint for file upload
app.post("/upload", (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send("No files were uploaded.");
  }
  // @ts-ignore
  const file = req.files.file;
  const uploadPath = __dirname + "/media/" + file.name;

  // Use the mv() method to place the file somewhere on your server
  file.mv(uploadPath, function (err) {
    if (err) return res.status(500).send(err);

    // res.send('File uploaded!');
    // @ts-ignore
    res.json({
      url: `${PUBLIC_URL}/get-media/${file.name}`,
    });
  });
});

// Endpoint for file upload
app.post("/save-image", async (req, res) => {
  const uploadPath = __dirname + "/media/";

  if (!req.body || !req.body.media_url) {
    return res.status(400).send("No files were uploaded.");
  }

  try {
    // Make a GET request to the image URL
    const url = req.body.media_url;
    const response = await axios.get(url, {
      responseType: "arraybuffer",
    });

    // Check if the request was successful
    if (response.status === 200) {
      const fileExtension = path.extname(url).toLowerCase(); // Get the original file extension
      const randomFileName = crypto.randomBytes(20).toString("hex"); // Generate a random string

      // Combine the random filename and the original extension
      const fileNameWithExtension = `${randomFileName}${fileExtension}`;
      const filePath = path.join(uploadPath, fileNameWithExtension);

      // Write the image data to the specified file path
      fs.writeFileSync(filePath, Buffer.from(response.data, "binary"));
      console.log("Image downloaded successfully!");
      res.json({
        url: `${PUBLIC_URL}/get-media/${fileNameWithExtension}`,
      });
    } else {
      console.error(
        `Failed to download image. Status code: ${response.status}`
      );
    }
  } catch (error: any) {
    console.error("Error downloading image:", error.message);
  }
});

const server = app.listen(PORT, function () {
  const { address, port } = server.address() as AddressInfo;
  // eslint-disable-next-line no-console
  console.log("✔ Example app listening at http://%s:%s", address, port);
});
