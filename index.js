require('dotenv').config();
const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();

// ✅ Configuración de CORS (ajusta tu dominio final aquí)
app.use(cors({
  origin: ['http://localhost:3000', 'https://tu-frontend-produccion.com'],
  methods: ['GET', 'POST'],
}));

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.AWS_SECRET,
  region: 'us-east-2',
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// SUBIDA DE ARCHIVOS Y DATOS CON IDENTIFICADOR
app.post('/upload', upload.fields([
  { name: 'ine' },
  { name: 'comprobanteDomicilio' },
  { name: 'constanciaRFC' },
  { name: 'actaConstitutiva' },
  { name: 'poderNotariado' }
]), async (req, res) => {
  try {
    const formData = req.body;
    const id = uuidv4();

    const jsonBuffer = Buffer.from(JSON.stringify({ id, ...formData }, null, 2));
    const jsonParams = {
      Bucket: 'registro-clientes-docs',
      Key: `${id}.json`,
      Body: jsonBuffer,
      ContentType: 'application/json',
    };
    await s3.upload(jsonParams).promise();

    const fileFields = req.files;
    for (const [fieldName, files] of Object.entries(fileFields)) {
      for (const file of files) {
        const fileParams = {
          Bucket: 'registro-clientes-docs',
          Key: `${id}_${fieldName}_${file.originalname}`,
          Body: file.buffer,
        };
        await s3.upload(fileParams).promise();
      }
    }

    res.json({ message: '✅ Datos y archivos subidos correctamente a S3', id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '❌ Error al subir datos/archivos', details: err });
  }
});

// OBTENER CONTENIDO DE UN REGISTRO
app.get('/registro/:key', async (req, res) => {
  const { key } = req.params;

  try {
    const data = await s3.getObject({
      Bucket: 'registro-clientes-docs',
      Key: key,
    }).promise();

    const jsonContent = JSON.parse(data.Body.toString('utf-8'));
    res.json(jsonContent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '❌ Error al leer el archivo', details: err });
  }
});

// LISTAR REGISTROS AGRUPADOS POR ID
app.get('/registros', async (req, res) => {
  try {
    const data = await s3.listObjectsV2({
      Bucket: 'registro-clientes-docs',
    }).promise();

    const registrosMap = {};

    data.Contents.forEach(item => {
      const key = item.Key;
      const parts = key.split('_');
      const idPart = parts[0].split('.')[0]; // captura el ID (antes del primer _ o .)

      if (key.endsWith('.json')) {
        registrosMap[idPart] = {
          id: idPart,
          registro: key,
          archivos: [],
        };
      } else {
        if (!registrosMap[idPart]) {
          registrosMap[idPart] = {
            id: idPart,
            registro: null,
            archivos: [],
          };
        }
        registrosMap[idPart].archivos.push(key);
      }
    });

    const result = Object.values(registrosMap);
    res.json({ registros: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '❌ Error al listar registros', details: err });
  }
});

// GENERAR SIGNED URL PARA DESCARGA
app.get('/archivo/:key', async (req, res) => {
  const { key } = req.params;

  const params = {
    Bucket: 'registro-clientes-docs',
    Key: key,
    Expires: 900, // 15 minutos
  };

  try {
    const url = s3.getSignedUrl('getObject', params);
    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '❌ Error al generar link firmado', details: err });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`🚀 Backend escuchando en port ${port}`));
