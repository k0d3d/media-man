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

import 'dotenv/config'

import cors from 'cors'
import express from 'express'
import { expressSharp, FsAdapter, HttpAdapter } from 'express-sharp'
import Keyv from 'keyv'
import { AddressInfo } from 'net'
import { join } from 'path'

const fileUpload = require('express-fileupload')
// Cache in-memory
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = new Keyv({ namespace: 'v-cam-sharp' }) as any

// Cache using Redis
// const cache = new Keyv('redis://', { namespace: 'express-sharp' })
const DEFAULT_PORT = 3340
const app = express()
const PORT = process.env.PORT || DEFAULT_PORT
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`

app.use(fileUpload())

app.use(cors({
  origin: [
    process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : 'https://app.easyvcam.online'
  ]
}))

// app.use(express.static(join(__dirname, 'public')))
app.use(express.static(join(__dirname, 'media')))

app.use(
  '/local-media',
  expressSharp({
    cache,
    imageAdapter: new HttpAdapter({
      prefixUrl: `http://localhost:${DEFAULT_PORT}/get-media`, 
    }),
  }),
)

app.use(
  '/wp-media',
  expressSharp({
    cache,
    imageAdapter: new HttpAdapter({ prefixUrl: 'https://easyvcam.online' }),
  }),
)

app.use(
  '/get-media',
  expressSharp({
    cache,
    imageAdapter: new FsAdapter(join(__dirname, 'media')),
  }),
)

// Endpoint for file upload
app.post('/upload', (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.')
  }
  // @ts-ignore
  const file = req.files.file
  const uploadPath = __dirname + '/media/' + file.name;

  // Use the mv() method to place the file somewhere on your server
  file.mv(uploadPath, function(err) {
    if (err)
      return res.status(500).send(err);

    // res.send('File uploaded!');
    // @ts-ignore
    res.json({
      url: `${PUBLIC_URL}/get-media/${file.name}`
    })
  });
})

const server = app.listen(PORT, function () {
  const { address, port } = server.address() as AddressInfo
  // eslint-disable-next-line no-console
  console.log('✔ Example app listening at http://%s:%s', address, port)
})
