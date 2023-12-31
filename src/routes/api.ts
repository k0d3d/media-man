import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import Jimp from "jimp";
import path from "path";

export default function apiRoutes(app, PORT) {
  const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

  app.get("/share-image", async (req, res) => {
    try {
      const imageUrl = req.query.url;

      // Fetch the image using axios
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });
      const imageBuffer = Buffer.from(response.data, "binary");

      // Load the image with Jimp
      const image = await Jimp.read(imageBuffer);

      // Watermarking logic - you can customize the watermark as needed
      const watermark = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
      image.print(watermark, 10, 10, `${PUBLIC_URL}`);

      // Convert the watermarked image to a buffer
      const watermarkedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

      // Send the watermarked image as a response
      res.set("Content-Type", Jimp.MIME_PNG);
      res.send(watermarkedBuffer);
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  });

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
}
