// upload.js
// ----------
import fs from 'fs';
import path from 'path';
import os from 'os';
import express from 'express';
import multer from 'multer';
import { ethers } from 'ethers';
import pinataSDK from '@pinata/sdk';
import dotenv from 'dotenv';
dotenv.config();


// Router de Express en ESM
const router = express.Router();
const upload = multer();

// 1) Configuras el provider y la wallet (lee variables de entorno)
const provider = new ethers.JsonRpcProvider(
  `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
);



const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// 2) ABI y dirección del contrato
import contractABI from './ABI.js';
const contractAddress = "0xc4446571ad11804b84305e42d3a79098b1cf1f48";
const registroObrasContract = new ethers.Contract(contractAddress, contractABI, wallet);

// 3) Inicializas Pinata
const pinata = pinataSDK(
  process.env.PINATA_API_KEY,
  process.env.PINATA_API_SECRET
);

// 4) Endpoint para subir un archivo y registrarlo
router.post('/subir-archivo', upload.single('miArchivo'), async (req, res) => {
  console.log("============================");
  console.log("[LOG] Iniciando '/subir-archivo' endpoint...");

  let tempFilePath = null;
  let tempMetadataPath = null;
  try {
    if (!req.file) {
      console.log("[ERROR] No se recibió archivo");
      return res.status(400).json({ error: "No se recibió archivo" });
    }

    console.log("[LOG] req.file:", req.file);

    // 1. Guardar el buffer en un archivo temporal
    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname || 'archivo.bin';
    tempFilePath = path.join(os.tmpdir(), fileName);

    console.log("[LOG] Guardando archivo temporal en:", tempFilePath);
    fs.writeFileSync(tempFilePath, fileBuffer);

    // 2. Crear un ReadStream desde el archivo temporal
    const fileStream = fs.createReadStream(tempFilePath);

    // 3. Subir a Pinata y obtener el CID de la imagen
    console.log("[LOG] Subiendo archivo a Pinata con pinFileToIPFS...");
    const resultFile = await pinata.pinFileToIPFS(fileStream, {
      pinataMetadata: { name: fileName }
    });
    console.log("[LOG] Resultado de Pinata:", resultFile);

    const fileCID = resultFile.IpfsHash;
    console.log("[LOG] CID obtenido de Pinata:", fileCID);

    // 4. Crear JSON de metadatos (incluye el enlace a la imagen)
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

    // 5. Subir los metadatos a Pinata
    const metadataStream = fs.createReadStream(tempMetadataPath);
    const resultMetadata = await pinata.pinFileToIPFS(metadataStream, {
      pinataMetadata: { name: metadataFileName }
    });
    const metadataCID = resultMetadata.IpfsHash;
    const tokenURI = `https://ipfs.io/ipfs/${metadataCID}`;
    console.log("[LOG] Token URI generado:", tokenURI);

    // 6. Registrar el NFT en la blockchain
    console.log("[LOG] Registrando NFT en la blockchain...");
    const tx = await registroObrasContract.registrarObra(tokenURI);
    console.log("[LOG] Transacción enviada, esperando confirmación...");

    // Esperamos la confirmación
    const receipt = await tx.wait();
    console.log("[LOG] Transacción confirmada!");

    // Token ID del evento
    const tokenId = receipt.logs[0].topics[3];
    console.log("[LOG] Token ID generado:", tokenId);

    // Link de Etherscan
    const txHash = tx.hash;

    // 7. Borramos archivos temporales
    console.log("[LOG] Borrando archivos temporales...");
    fs.unlinkSync(tempFilePath);
    fs.unlinkSync(tempMetadataPath);

    // 8. Respuesta final
    res.json({
      mensaje: `Obra registrada como NFT con éxito para el autor: ${autor}`,
      tokenId: parseInt(tokenId, 16),
      linkIpfs: tokenURI,
      linkEtherscan: `https://sepolia.etherscan.io/tx/${txHash}`
    });

    console.log("[LOG] Respuesta enviada. Proceso completado.");
    console.log("============================");
  } catch (error) {
    console.error('[ERROR] Error al subir archivo y/o registrar en la blockchain:', error);

    if (tempFilePath) {
      try { fs.unlinkSync(tempFilePath); } catch {}
    }
    if (tempMetadataPath) {
      try { fs.unlinkSync(tempMetadataPath); } catch {}
    }

    res.status(500).json({ error: 'Error al subir archivo y registrar la obra como NFT' });
  }
});

// Exportar por default el router
export default router;
