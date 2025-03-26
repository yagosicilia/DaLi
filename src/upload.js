// upload.js
import fs from 'fs';
import path from 'path';
import os from 'os';
import express from 'express';
import multer from 'multer';
import pinataSDK from '@pinata/sdk';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const upload = multer();

// Inicializar Pinata
const pinata = pinataSDK(
  process.env.PINATA_API_KEY,
  process.env.PINATA_API_SECRET
);

// POST /subir-archivo
router.post('/subir-archivo', upload.single('miArchivo'), async (req, res) => {
  console.log("[LOG] Iniciando '/subir-archivo' (solo IPFS, sin private key)");

  let tempFilePath = null;
  let tempMetadataPath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se recibió archivo" });
    }

    // 1) Guardar archivo en temporal
    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname || 'archivo.bin';
    tempFilePath = path.join(os.tmpdir(), fileName);
    fs.writeFileSync(tempFilePath, fileBuffer);

    // 2) Subir archivo a Pinata
    const fileStream = fs.createReadStream(tempFilePath);
    const resultFile = await pinata.pinFileToIPFS(fileStream, {
      pinataMetadata: { name: fileName }
    });
    const fileCID = resultFile.IpfsHash;
    console.log("[LOG] CID del archivo:", fileCID);

    // 3) Crear metadatos JSON
    const { autor } = req.body;
    const metadata = {
      name: `Obra de ${autor}`,
      description: `Obra registrada por ${autor}`,
      image: `https://ipfs.io/ipfs/${fileCID}`
    };

    const metadataJSON = JSON.stringify(metadata);
    const metadataFileName = fileName + ".json";
    tempMetadataPath = path.join(os.tmpdir(), metadataFileName);
    fs.writeFileSync(tempMetadataPath, metadataJSON);

    // 4) Subir metadatos a Pinata
    const metadataStream = fs.createReadStream(tempMetadataPath);
    const resultMetadata = await pinata.pinFileToIPFS(metadataStream, {
      pinataMetadata: { name: metadataFileName }
    });
    const metadataCID = resultMetadata.IpfsHash;
    const tokenURI = `https://ipfs.io/ipfs/${metadataCID}`;
    console.log("[LOG] tokenURI:", tokenURI);

    // 5) Limpieza
    fs.unlinkSync(tempFilePath);
    fs.unlinkSync(tempMetadataPath);

    // 6) Responder con tokenURI
    return res.json({
      mensaje: "Archivo subido a IPFS con éxito",
      tokenURI
    });
  } catch (err) {
    console.error("[ERROR]", err);

    if (tempFilePath) {
      try { fs.unlinkSync(tempFilePath); } catch {}
    }
    if (tempMetadataPath) {
      try { fs.unlinkSync(tempMetadataPath); } catch {}
    }

    return res.status(500).json({
      error: "Error al subir archivo y generar metadatos en IPFS"
    });
  }
});

export default router;
