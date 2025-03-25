// app.js
// -------------------
import dotenv from 'dotenv';
dotenv.config(); // Lee variables desde .env

import express from 'express';
import { ethers } from 'ethers';
import cors from 'cors';

// 1) Crear y configurar la app
const app = express();
app.use(cors());
app.use(express.json());

// 2) Iniciar el servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// 3) Configurar provider y wallet (ethers 6.x)
console.log("Configurando el proveedor...");
const provider = new ethers.JsonRpcProvider(
  `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
);
console.log("Proveedor configurado con éxito");


let wallet;
try {
  console.log("Intentando crear la billetera en app.js...");
  wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  console.log("Billetera creada con éxito");

  async function obtenerSaldo() {
    try {
      console.log("Consultando el saldo de la billetera...");
      const saldo = await provider.getBalance(wallet.address);
      console.log(`Saldo: ${ethers.formatEther(saldo)} ETH`);
    } catch (error) {
      console.error('Error al obtener el saldo:', error);
    }
  }
  obtenerSaldo();

} catch (error) {
  console.error('Error al crear la billetera en app.js:', error);
}

// 4) Importar contrato y conectarlo
import contractABI from './ABI.js';
const contractAddress = "0xc4446571ad11804b84305e42d3a79098b1cf1f48";

let registroObrasContract;
try {
  console.log("Intentando conectar con el contrato...");
  registroObrasContract = new ethers.Contract(contractAddress, contractABI, wallet);
  console.log("Contrato conectado con éxito");
} catch (error) {
  console.error('Error al conectar con el contrato:', error);
}

// 5) Endpoint de ejemplo para registrar
app.post('/registrar-obra', async (req, res) => {
  const { tokenURI } = req.body;
  console.log("Datos recibidos en la solicitud POST /registrar-obra:", tokenURI);

  try {
    console.log("Intentando registrar la obra en la blockchain...");
    const tx = await registroObrasContract.registrarObra(tokenURI);
    console.log("Transacción enviada, esperando confirmación...");
    await tx.wait();
    console.log("Transacción confirmada");

    res.json({
      mensaje: `Obra registrada como NFT con éxito`,
      linkEtherscan: `https://sepolia.etherscan.io/tx/${tx.hash}`
    });
  } catch (error) {
    console.error('Error al registrar la obra:', error);
    res.status(500).json({
      error: 'Error al registrar la obra en la blockchain'
    });
  }
});

// 6) Función de prueba del contrato
async function pruebaContrato() {
  try {
    console.log("Consultando el número de NFTs del propietario...");
    const ownerAddress = wallet.address;
    const balance = await registroObrasContract.balanceOf(ownerAddress);
    console.log(`Número de NFTs del propietario: ${balance}`);
  } catch (error) {
    console.error('Error al interactuar con el contrato:', error);
  }
}
pruebaContrato();

// 7) Importar y usar la ruta de subida
import uploadRoute from './upload.js';
app.use('/', uploadRoute);

console.log("Todo listo.");
