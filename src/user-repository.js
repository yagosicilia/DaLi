import DBLocal from 'db-local';
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { SALT_ROUNDS } from './config.js'; 

const{Schema} = new DBLocal({path: './db'})
const User = Schema('User',{
    _id: {type: String, required: true},
    username: {type: String, required: true},
    walletAddress: {type: String, required: false},
    password: {type: String, required: true},
})

export class UserRepository{
    static async create({username,walletAddress,password}){
        Validation.username(username);
        Validation.walletAddress(walletAddress);
        Validation.password(password);
        

    
        //2. Asegurarse de que el username noo existe 
        const user = User.findOne({username});
        if(user) throw new Error('El username ya existe');

        const wallet = User.findOne({walletAddress});
        if(wallet) throw new Error('La wallet ya existe');
        
        const id = crypto.randomUUID();
        const hashedPassword = await bcrypt.hashSync(password, SALT_ROUNDS); //hashsync -> bloquea el theard principal

        //3. Crear el usuario
        User.create({
            _id : id,
            username,
            walletAddress,
            password: hashedPassword,
        }).save();

        return id;
    }
    static async login (username, password) {
        Validation.username(username);
        Validation.password(password);

        const user = User.findOne({ username });
        if (!user) throw new Error('Usuario no encontrado');
        const isValid = await bcrypt.compareSync(password, user.password);
        if (!isValid) throw new Error('Contraseña incorrecta');

        const { password: _, ...publicUser } = user;
        return publicUser;
    }

}

class Validation{
    static username(username){
        //1. Validaciones de username (opcional: usar zod
        if(typeof username !== 'string') throw new Error('username debe ser un string');
        if(username.length < 4) throw new Error('username debe tener al menos 4 caracteres');
    }
    static password(password){
        //1. Validaciones de password (opcional: usar zod
        if(typeof password !== 'string') throw new Error('password debe ser un string');
        if(password.length < 6) throw new Error('password debe tener al menos 6 caracteres');
    }
    static walletAddress(walletAddress) {
        if (typeof walletAddress !== 'string') throw new Error('wallet debe ser un string');
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) throw new Error('wallet inválida');
      }
}

export { User };   //  ←  ahora puede importarse en app.js


