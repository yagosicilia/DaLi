import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

try {
    console.log("Valor de PRIVATE_KEY:", JSON.stringify(process.env.PRIVATE_KEY));
} catch (error) {
    console.error("Error al crear la wallet con la clave privada proporcionada:", error);
}
