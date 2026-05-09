const express = require("express");
const jwt = require("jsonwebtoken");

// Para hacer las encriptacion de la contraseña 
const bcrypt = require("bcrypt")

const db = require("./db")

//=============================== CONFIGURACION =============================== 
//Firma de Token
//La palabra clave va a simular la contraseña 
const secret = process.env.SECRET || "mi_secret_key_jwt"
const app = express();

//=============================== MIDDLEWARES ===============================
//Funcion que traduce el body html a JSON, Funcion que se ejecuta antes de las rutas

app.use(express.json()) // Parsea JSON del body
//La libreria urlencoded permite parsear del html al JSON
app.use(express.urlencoded({ extended: true }))

app.use((req, res, next) => {
    //Cuando se conecte al servidor va a recibir el body
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
            return res.status(401).send({error: "Faltan datos para ingreso: username, password, name", bodyRecibido: body});
        }
    
    // Encriptar contraseña
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) return res.status(500).send({error: err.message})
                const stmt = db.prepare(
                    "INSERT INTO users (username, password, name) VALUES (?, ?, ?)"    
                )
                //Esto es por si el usuario vuelve a crear el mismo usuario
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
    res.send(`Servidor de Administrador - Bienvenido ${req.user.name}`);
})

//=============================== REGISTRO DE PRODUCTOS ===============================

app.post("/private/products", (req, res) => {
    const body = req.body || {}
    const nombreProducto = body.nombreProducto
    const cantidad = body.cantidad

    // Validación
    
    if(!nombreProducto || !cantidad){
        return res.status(401).send({error: "Asegurate de haber registrado todos los datos del producto", bodyRecibido: body});
    }

    // 1. Preparar la sentencia
    const stmt = db.prepare(
        "INSERT INTO producto (nombreProducto, cantidad) VALUES (?, ?)"    
    )

    // 2. LA PARTE QUE FALTA: Ejecutarla con los datos reales
    stmt.run(nombreProducto, cantidad, function(err) {
        if (err) {
            return console.error("Error al insertar:", err.message);
        }
        console.log(`Producto registrado con el ID: ${this.lastID}`);
    });

    // 3. Opcional: Cerrar la sentencia preparada para liberar memoria
    stmt.finalize();
})

// VOY AQUI !!

// Ruta Pública: Cualquiera puede ver qué verduras y granos hay
app.get("/inventario/publico", (req, res) => {
    res.send({
        granos: ["Arroz", "Lenteja", "Frijol"],
        verduras: ["Zanahoria", "Cebolla", "Tomate"]
    });
});



// Ruta Privada: Solo personal autenticado puede registrar entrada/salida de granos
app.put("/private/products/update", (req, res) => {

    const body = req.body || {}
    const nombreProducto = body.nombreProducto
    const cantidad = body.cantidad
    
    if(!nombreProducto || !cantidad){
        return res.status(401).send({error: "Asegurate de haber registrado todos los datos del producto", bodyRecibido: body});
    }

    try {
        // Lógica de Inventario
        console.log(`Usuario ${users.name} actualizó ${producto} en el inventario.`);

        const stmt = db.prepare(
            "UPDATE producto SET nombreProducto = ?, cantidad = ? WHERE id = ?"
        );
    
        // Respuesta de éxito informando quién actualizó
        res.status(200).send({
            mensaje: `Inventario actualizado correctamente`,
            actualizadoPor: users.name,
            datosNuevos: {
                nombreProducto,
                cantidad
            }
        });
    } catch (error) {
        res.status(500).send({ error: "Error en la base de datos" });
    }

});

// Mensaje inicio servidor
app.listen(3000, () => {
    console.log("Servidor de Granos y Verduras corriendo en el puerto 3000");
});