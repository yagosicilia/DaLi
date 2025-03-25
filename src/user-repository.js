const DBLocal = require('./db-local');
const crypto = require('crypto');
const{Schema} = new DBLocal({path: './db'})
const User = Schema('User',{
    _id: {type: String, required: true},
    username: {type: String, required: true},
    password: {type: String, required: true}
})

class UserRepository{
    static create({username,password}){
        //1. Validaciones de username (opcional: usar zod
        if(typeof username !== 'string') throw new Error('username debe ser un string');
        if(username.length < 4) throw new Error('username debe tener al menos 4 caracteres');

        if(typeof password !== 'string') throw new Error('password debe ser un string');
        if(password.length < 6) throw new Error('password debe tener al menos 4 caracteres');

        //2. Asegurarse de que el username noo existe 
        const user = user.findOne({username});
        if(user) throw new Error('El username ya existe');
        
        const 
        id = crypto.randomUUID();

        //3. Crear el usuario
        User.create({
            _id : id,
            username,
            password
        }).save();

        return id;
    }
    static login(username, password) {
        const user = User.findOne({ username, password });
        if (!user) throw new Error('Usuario o contraseña incorrectos');
        return user;
    }
}

module.exports = {UserRepository};
