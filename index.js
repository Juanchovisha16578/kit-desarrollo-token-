const express = require("express")
//Indispensable para la generacion de tokens
const jwt = require("jsonwebtoken")

const bcrypt = require("bcrypt")

const db = require("./db")

console.log("El secreto cargado es:", process.env.SECRET);

//=============================== CONFIGURACION =============================== 
const secret = process.env.SECRET || "mi_secret_key_jwt"
const app = express()
 
//Endpoints

//=============================== MIDDLEWARES ===============================
//Funcion que traduce el body html a JSON, Funcion que se ejecuta antes de las rutas

app.use(express.json()) // Parsea JSON del body
app.use(express.urlencoded({ extended: true }))
 
app.use((req, res, next) => {
    console.log("Body recibido:", req.body)
    console.log("Headers:", req.headers["content-type"])
    next()
})

//=============================== REGISTRO DE USUARIOS ===============================

app.post("/register", (req, res) => {
    const body = req.body || {}
    const username = body.username
    const password = body.password
    const name = body.name
    
    // Validación
    
        if(!username || !password || !name){
            return removeEventListener.status(401).send({error: "Faltan datos para ingreso: username, password, name", bodyRecibido: body});
        }
    
    // Encriptar contraseña
    
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) return res.status(500).send({error: err.message})
                const stmt = db.prepare(
                    "INSERT INTO users (username, password, name) VALUES (?, ?, ?)"    
                )
                stmt.run(username, hashedPassword, name, function(err) {
                    if(err) {
                        if (err.message.includes("UNIQUE")) {
                            res.status(400).send({error: "El usuario ya existe"})
                        } else {
                            res.status(500).send({error: err.message})
                        }
                    } else {
                        res.status(201).send({message: "Usuario Creado", id:this.lastID})
                    }
                })
                stmt.finalize()
        })
})

//=============================== LOGIN ===============================
app.post("/login", (req, res) => {
    const { username, password } = req.body

    //1. Buscar usuario en la base de datos 

    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if(err) return res.status(500).send({ error: err.message})
        if(!user) return res.status(401).send({ error: "Credenciales Inválidas" })

            //2. Comparar contraseña ingresada con el hash guardado

        bcrypt.compare(password, user.password, (err, valid) => {
            if(err) return res.status(500).send({ error: err.message})
            if(!valid) return res.status(401).send({ error: "Credenciales Inválidas" })
            
            //3. Generar token JWT 

            const token = jwt.sign({
                sub: user.id,
                name: user.name, 
                username: user.username,
                exp: Math.floor(Date.now() / 1000) + (60 * 60) // Expira en 1 hora 
            }, secret)

            res.send({ token })
        })
    })
})

//=============================== MIDDLEWWARE DE AUTENTICACIÓN ===============================

// Verificación del token
const authenticateToken = (req, res, next) => {
    // 1. Obtener el header authorization
    const authHeader = req.headers["authorization"]
    const token = authHeader && authHeader.split(" ")[1]

    // 2. Verificar que existe el token
    if (!token) {
        return res.status(401).send({ error: "Token requerido" })
    }

    // 3. Verificar el token con la clave secreta
    jwt.verify(token, secret, (err, user) => {
        if(err) {
            return res.status(403).send({ error:"Token invalido o expirado" })
        }

        // 4. Si es valido, guardar datos y continuar 
        req.user = user
        next()
    })
}

//=============================== RUTAS ===============================

app.get("/private", authenticateToken, (req, res) => {
    res.send(`Servidor Privado - Bienvenido ${req.user.name}`);
})
 
//Mensaje inicio servidor
app.listen(3000, () => {
    console.log ("Servidor corriendo correctamente")
})