// app.js
import dotenv from 'dotenv';
dotenv.config();


import express from 'express';
import { PORT, SECRET_JWT_KEY } from './config.js';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { UserRepository } from './user-repository.js';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';


// Crear app
const app = express();
app.set('view engine', 'ejs');
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Puerto
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

app.use ((req,res,next) => {
  const token = req.cookies.access_token;
  req.session = {user:null}

  try{
    const data = jwt.verify(token, SECRET_JWT_KEY);
    req.session.user = data;
  }catch {}
  next();
})

app.get ('/', (req, res) => {
  const {user} = req.session;
  res.render('index', user);
})

app.post('/login', async (req,res)=>{
  const {username,password} = req.body;
  try{
    const user = await UserRepository.login(username,password);
    const token = jwt.sign({id: user._id, username: user.username},
      SECRET_JWT_KEY,
      {expiresIn: '1h'
      }); 
    res
      .cookie('access_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 1000 * 60 * 60})
      .send({user,token});
  }catch(error){
    res.status(401).send({error: error.message});
  }
})

app.post('/register', async (req,res)=>{
  const {username,password} =req.body;
  console.log(req.body);

  try{
    const id = await UserRepository.create({username,password});
    res.send({id});
  }catch(error){
    res.status(400).send({error: error.message});
  }
})


app.post('/logout',(req,res)=>{
  res
    .clearCookie('access_token')
    .json({message: 'Sesión cerrada'});
})


app.get('/protected',(req,res)=>{
  const {user} = req.session;
  if(!user) return res.status(403).send({error: 'No autorizado'});
  res.render('protected', user);
})


// Ruta de subida (subir-archivo)
import uploadRoute from './upload.js';
app.use('/', uploadRoute);

// Servir la carpeta public
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '../public')));

console.log("Backend listo (solo sube archivos a Pinata).");
