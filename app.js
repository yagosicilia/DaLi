require('dotenv').config();  // Importa dotenv para leer el archivo .env
const express = require('express');  // Importa Express para gestionar el servidor
const { ethers } = require('ethers');  // Importa ethers.js para interactuar con la blockchain
const cors = require('cors');  // Importa CORS

// Crea una aplicación Express
const app = express();
app.use(cors());  // Habilita CORS
app.use(express.json());  // Middleware para procesar JSON

// Configura el servidor para escuchar en el puerto 3000
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Configuración del proveedor usando JsonRpcProvider para ethers 6.x
console.log("Configurando el proveedor...");
const provider = new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`);
console.log("Proveedor configurado con éxito");

// Crea un objeto wallet con la clave privada y el proveedor configurado
let wallet;
try {
  console.log("Intentando crear la billetera...");
  wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  console.log("Billetera creada con éxito");

  // Función para obtener el saldo de la billetera
  async function obtenerSaldo() {
    try {
      console.log("Consultando el saldo de la billetera...");
      const saldo = await provider.getBalance(wallet.address);  // Usamos el proveedor y la dirección del wallet
      console.log(`Saldo: ${ethers.formatEther(saldo)} ETH`);
    } catch (error) {
      console.error('Error al obtener el saldo:', error);
    }
  }
  obtenerSaldo();

} catch (error) {
  console.error('Error al crear la billetera:', error);
}

// ABI y Dirección del contrato inteligente desplegado
console.log("Configurando el contrato...");
const contractABI = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_autor",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_hashContenido",
        "type": "string"
      }
    ],
    "name": "registrarObra",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "contadorObras",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "obras",
    "outputs": [
      {
        "internalType": "string",
        "name": "autor",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "hashContenido",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "fechaRegistro",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const contractAddress = "0x93e6e4d7ac8d6c7b7c79c00e011ec14486c81502"; // Cambia por la dirección de tu contrato desplegado
console.log("Dirección del contrato:", contractAddress);

// Conecta con el contrato inteligente
let registroObrasContract;
try {
  console.log("Intentando conectar con el contrato...");
  registroObrasContract = new ethers.Contract(contractAddress, contractABI, wallet);
  console.log("Contrato conectado con éxito");
} catch (error) {
  console.error('Error al conectar con el contrato:', error);
}

// Define la ruta para registrar una obra en la blockchain
app.post('/registrar-obra', async (req, res) => {
  const { autor, hashContenido } = req.body;
  console.log("Datos recibidos en la solicitud POST:", autor, hashContenido);

  try {
    // Llama a la función registrarObra del contrato inteligente
    console.log("Intentando registrar la obra en la blockchain...");
    const tx = await registroObrasContract.registrarObra(autor, hashContenido);
    console.log("Transacción enviada, esperando confirmación...");
    await tx.wait();  // Espera a que la transacción se complete
    console.log("Transacción confirmada");

    res.json({ mensaje: `Obra registrada con éxito para el autor: ${autor}` });
  } catch (error) {
    console.error('Error al registrar la obra:', error);
    res.status(500).json({ error: 'Error al registrar la obra en la blockchain' });
  }
});

// Añadir más logs a la función pruebaContrato
async function pruebaContrato() {
  try {
    console.log("Consultando el número de obras registradas...");
    const contador = await registroObrasContract.contadorObras();
    console.log(`Número de obras registradas: ${contador}`);
  } catch (error) {
    console.error('Error al interactuar con el contrato:', error);
  }
}
pruebaContrato();

// Importar y usar la ruta de subida
const uploadRoute = require('./upload.js');
console.log("uploadRoute es:", uploadRoute);
app.use('/', uploadRoute);

// [RESTO DE ENDPOINTS, EJ. /registrar-obra SIN ARCHIVOS, ETC.]
console.log("Todo listo.");


