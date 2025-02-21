// upload.js

const fs = require('fs');
const path = require('path');
const os = require('os');
const express = require('express');
const multer = require('multer');
const { ethers } = require('ethers');
const pinataSDK = require('@pinata/sdk');

const router = express.Router();
const upload = multer();

const pinata = pinataSDK(
  process.env.PINATA_API_KEY,
  process.env.PINATA_API_SECRET
);

// Configuras el provider y la wallet
const provider = new ethers.JsonRpcProvider(
  `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// ABI y dirección del contrato
const contractABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "_autor", "type": "string" },
      { "internalType": "string", "name": "_hashContenido", "type": "string" }
    ],
    "name": "registrarObra",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "contadorObras",
    "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
    "name": "obras",
    "outputs": [
      { "internalType": "string", "name": "autor", "type": "string" },
      { "internalType": "string", "name": "hashContenido", "type": "string" },
      { "internalType": "uint256", "name": "fechaRegistro", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];
const contractAddress = "0x93e6e4d7ac8d6c7b7c79c00e011ec14486c81502";
const registroObrasContract = new ethers.Contract(contractAddress, contractABI, wallet);

// Endpoint para subir un archivo y registrarlo
router.post('/subir-archivo', upload.single('miArchivo'), async (req, res) => {
  console.log("============================");
  console.log("[LOG] Iniciando '/subir-archivo' endpoint...");

  let tempFilePath = null;  // Definimos fuera del try-catch para poder borrarlo si hay error
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

    // 3. Subir a Pinata
    console.log("[LOG] Subiendo archivo a Pinata con pinFileToIPFS...");
    const result = await pinata.pinFileToIPFS(fileStream, {
      pinataMetadata: { name: fileName }
    });
    console.log("[LOG] Resultado de Pinata:", result);

    const cid = result.IpfsHash;
    console.log("[LOG] CID obtenido de Pinata:", cid);

    // 4. Llamar al contrato
    const { autor } = req.body;
    console.log("[LOG] Registrando en la blockchain -> Autor:", autor, "| CID:", cid);

    // Enviamos la transacción
    const tx = await registroObrasContract.registrarObra(autor, cid);
    console.log("[LOG] Transacción enviada, esperando confirmación...");

    // Esperamos la confirmación (1 bloque)
    const receipt = await tx.wait();
    console.log("[LOG] Transacción confirmada!");

    // De la transacción, guardamos el 'transactionHash' para el link
    const txHash = receipt.hash;

    // 5. Borramos archivo temporal
    console.log("[LOG] Borrando archivo temporal...");
    fs.unlinkSync(tempFilePath);

    // 6. Respuesta final
    // Devolvemos mensaje + link IPFS + link Etherscan
    res.json({
      mensaje: `Obra registrada con éxito para el autor: ${autor}`,
      linkIpfs: `https://ipfs.io/ipfs/${cid}`,
      linkEtherscan: `https://sepolia.etherscan.io/tx/${txHash}`
    });

    console.log("[LOG] Respuesta enviada. Proceso completado.");
    console.log("============================");

  } catch (error) {
    console.error('[ERROR] Error al subir archivo y/o registrar en la blockchain:', error);

    // Si se creó el archivo temporal, lo borramos en caso de error
    if (tempFilePath) {
      try { fs.unlinkSync(tempFilePath); } catch {}
    }

    res.status(500).json({ error: 'Error al subir archivo y registrar la obra' });
  }
});

module.exports = router;
