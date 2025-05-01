require('dotenv').config();
const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const fs = require('fs');
const cors = require('cors');
const app = express();

app.use(cors());

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.AWS_SECRET,
  region: 'us-east-2',
});

const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('file'), (req, res) => {
  const fileContent = fs.readFileSync(req.file.path);
  const params = {
    Bucket: 'registro-clientes-docs',
    Key: req.file.originalname,
    Body: fileContent,
    
  };

  s3.upload(params, (err, data) => {
    fs.unlinkSync(req.file.path); // borra el archivo temporal
    if (err) return res.status(500).json({ error: err });
    res.json({ url: data.Location });
  });
});

app.listen(4000, () => console.log('🚀 Backend escuchando en http://localhost:4000'));
