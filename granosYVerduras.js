const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cors = require("cors");
const db = require("./db");

//=============================== CONFIGURACION =============================== 
const secret = process.env.SECRET || "mi_secret_key_jwt"
const app = express();

//=============================== MIDDLEWARES ===============================
app.use(cors())
app.use(express.json())
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

    if (!username || !password || !name) {
        return res.status(401).send({ error: "Faltan datos: username, password, name", bodyRecibido: body });
    }

    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) return res.status(500).send({ error: err.message })
        const stmt = db.prepare("INSERT INTO users (username, password, name) VALUES (?, ?, ?)")
        stmt.run(username, hashedPassword, name, function(err) {
            if (err) {
                if (err.message.includes("UNIQUE")) {
                    res.status(400).send({ error: "El usuario ya existe" })
                } else {
                    res.status(500).send({ error: err.message })
                }
            } else {
                res.status(201).send({ message: "Usuario Creado", id: this.lastID })
            }
        })
        stmt.finalize()
    })
})

//=============================== LOGIN ===============================
app.post("/login", (req, res) => {
    const { username, password } = req.body

    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) return res.status(500).send({ error: err.message })
        if (!user) return res.status(400).send({ error: "Credenciales Inválidas" })

        bcrypt.compare(password, user.password, (err, valid) => {
            if (err) return res.status(500).send({ error: err.message })
            if (!valid) return res.status(400).send({ error: "Credenciales Inválidas" })

            const token = jwt.sign({
                sub: user.id,
                name: user.name,
                username: user.username,
                exp: Math.floor(Date.now() / 1000) + (60 * 60)
            }, secret)

            res.send({ token })
        })
    })
})

//=============================== MIDDLEWARE DE AUTENTICACIÓN ===============================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"]
    const token = authHeader && authHeader.split(" ")[1]

    if (!token) {
        return res.status(400).send({ error: "Token requerido" })
    }

    jwt.verify(token, secret, (err, user) => {
        if (err) {
            return res.status(403).send({ error: "Token invalido o expirado" })
        }
        req.user = user
        next()
    })
}

//=============================== RUTAS PÚBLICAS ===============================
app.get("/private", authenticateToken, (req, res) => {
    res.send(`Servidor de Administrador - Bienvenido ${req.user.name}`);
})

// ✅ Ahora lee de la base de datos en lugar de datos hardcodeados
app.get("/inventario/publico", (req, res) => {
    db.all("SELECT * FROM producto ORDER BY nombreProducto ASC", [], (err, rows) => {
        if (err) return res.status(500).send({ error: err.message })
        res.send(rows)
    })
})

//=============================== PRODUCTOS ===============================
app.get("/private/products", authenticateToken, (req, res) => {
    db.all("SELECT * FROM producto ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).send({ error: err.message })
        res.send(rows)
    })
})

app.post("/private/products/insert", authenticateToken, (req, res) => {
    try {
        const { nombreProducto, cantidad } = req.body;
        const idUsuario = req.user.sub;

        if (!nombreProducto || !cantidad == null) {
            return res.status(400).send({ error: "Asegurate de enviar nombre, cantidad e idUsuario" });
        }

        db.get("SELECT username FROM users WHERE id = ?", [idUsuario], (err, row) => {
            if (err || !row) {
                return res.status(404).send({ error: "Usuario no encontrado" });
            }

            const nombreAdmin = row.username;
            const stmt = db.prepare("INSERT INTO producto (nombreProducto, cantidad) VALUES (?, ?)")

            stmt.run(nombreProducto, cantidad, function(err) {
                if (err) return res.status(500).send({ error: err.message });

                res.status(201).send({
                    mensaje: "Producto registrado exitosamente",
                    idGenerado: this.lastID,
                    registradoPor: nombreAdmin,
                    datos: { nombreProducto, cantidad }
                });
            });
            stmt.finalize();
        });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
})

app.put("/private/products/update/:id", authenticateToken, (req, res) => {
    try {
        const idProducto = req.params.id;
        const { nombreProducto, cantidad} = req.body;
        const idUsuario = req.user.sub;

        if (!nombreProducto || !cantidad == null) {
            return res.status(400).send({ error: "Asegurate de enviar nombre y cantidad" });
        }

        db.get("SELECT username FROM users WHERE id = ?", [idUsuario], (err, row) => {
            if (err || !row) {
                return res.status(404).send({ error: "Usuario no encontrado" });
            }

            const nombreAdmin = row.username;
            const stmt = db.prepare("UPDATE producto SET nombreProducto = ?, cantidad = ? WHERE id = ?");

            stmt.run(nombreProducto, cantidad, idProducto, function(updateErr) {
                if (updateErr) return res.status(500).send({ error: updateErr.message });
                if (this.changes === 0) return res.status(404).send({ error: "Producto no encontrado" });

                res.send({
                    mensaje: "Inventario actualizado",
                    actualizadoPor: nombreAdmin,
                    datos: { nombreProducto, cantidad }
                });
            });
            stmt.finalize();
        });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
})

app.delete("/private/products/delete/:id", authenticateToken, (req, res) => {
    const id = req.params.id
    db.run("DELETE FROM producto WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).send({ error: err.message })
        if (this.changes === 0) return res.status(404).send({ error: "Producto no encontrado" })
        res.send({ mensaje: "Producto eliminado", id })
    })
})

//=============================== INICIO SERVIDOR ===============================
app.listen(3000, () => {
    console.log("Servidor de Granos y Verduras corriendo en el puerto 3000");
});
 