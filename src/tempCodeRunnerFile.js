// Reemplaza require por import
import dotenv from 'dotenv';
dotenv.config();  // Importa dotenv para leer el archivo .env
import express from 'express';  
import { ethers } from 'ethers';
import cors from 'cors';
import contractABI from './ABI.js';  // Asegúrate de que ABI.js utilice export default o una exportación nombrada
import uploadRoute from './upload.js';  // Asegúrate de que upload.js utilice export default o una exportación nombrada

// El resto del código permanece igual
const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

console.log("Configurando el proveedor...");
const provider = new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`);
console.log("Proveedor configurado con éxito");

let wallet;
try {
  console.log("Intentando crear la billetera...");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
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
  console.error('Error al crear la billetera:', error);
}

console.log("Configurando el contrato...");
const contractAddress = "0xc4446571ad11804b84305e42d3a79098b1cf1f48";

let registroObrasContract;
try {
  console.log("Intentando conectar con el contrato...");
  registroObrasContract = new ethers.Contract(contractAddress, contractABI, wallet);
  console.log("Contrato conectado con éxito");
} catch (error) {
  console.error('Error al conectar con el contrato:', error);
}

app.post('/registrar-obra', async (req, res) => {
  const { tokenURI } = req.body;
  console.log("Datos recibidos en la solicitud POST:", tokenURI);

  try {
    console.log("Intentando registrar la obra en la blockchain...");
    const tx = await registroObrasContract.registrarObra(tokenURI);
    await tx.wait();
    console.log("Transacción confirmada");

    res.json({ mensaje: `Obra registrada como NFT con éxito`, linkEtherscan: `https://sepolia.etherscan.io/tx/${tx.hash}` });
  } catch (error) {
    console.error('Error al registrar la obra:', error);
    res.status(500).json({ error: 'Error al registrar la obra en la blockchain' });
  }
});

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

console.log("uploadRoute es:", uploadRoute);
app.use('/', uploadRoute);

console.log("Todo listo.");
