import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import path from "path";

import GmModule from "gm";

import nanoid from "nanoid";

const gm = GmModule.subClass({ imageMagick: true });

export default function apiRoutes(app, PORT) {
  const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

  app.get("/share-image", async (req, res) => {
    try {
      const imageUrl = req.query.url;

      // Fetch the main image using axios
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });
      const imageBuffer = Buffer.from(response.data, "binary");

      // Create a GraphicsMagick object from the main image buffer
      const image = gm(imageBuffer);

      // Customize watermark position (assuming x and y are properties in the request)
      const xPosition = req.query.x || 10;
      const yPosition = req.query.y || 10;

      // Set the Content-Type header to specify the response is an image in PNG format
      res.set("Content-Type", "image/png");

      // Compose the main image with the watermark
      image
        .composite(path.join("src", "images", "watermark.png"))
        .stream("png")
        .pipe(res);
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  });

  // Endpoint for file upload
  app.post("/upload", async (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send("No files were uploaded.");
    }
    // @ts-ignore
    const file = req.files.file;

    const fileId = nanoid.nanoid(4);
    const fileName = `${fileId}-${file.name}`;
    const uploadPath = path.join("media", fileName); // __dirname + "/media/" + file.name;

    // Use the mv() method to place the file somewhere on your server
    file.mv(uploadPath, function (err) {
      if (err) return res.status(500).send(err);

      // res.send('File uploaded!');
      // @ts-ignore
      res.json({
        url: `${PUBLIC_URL}/get-media/${fileName}`,
      });
    });
  });

  // Endpoint for file upload
  app.post("/save-image", async (req, res) => {
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

        // Write the image data to the specified file path
        fs.writeFileSync(
          `./media/${fileNameWithExtension}`,
          Buffer.from(response.data, "binary")
        );
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
}
