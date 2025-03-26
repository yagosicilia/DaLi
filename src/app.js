// app.js
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Crear app
const app = express();
app.use(cors());
app.use(express.json());

// Puerto
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Ruta de subida (subir-archivo)
import uploadRoute from './upload.js';
app.use('/', uploadRoute);

// Servir la carpeta public
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '../public')));

console.log("Backend listo (solo sube archivos a Pinata).");
