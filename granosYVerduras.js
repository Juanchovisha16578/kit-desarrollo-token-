const express = require("express");
const jwt = require("jsonwebtoken");

// Firma Token - Cargamos el secreto desde el .env
const secret = process.env.SECRET || "clave_por_defecto_si_fallas_env";
const app = express();
console.log("Configurando middleware JSON...");
app.use(express.json()); // Necesario para recibir datos de inventario
console.log("Middleware configurado.");     

// --- Endpoints de Autenticación ---

app.post("/login", (req, res) => {
    // Aquí simularíamos la búsqueda en BD de un bodeguero o admin
    // Por ahora usamos datos estáticos como en tu ejemplo
    const { id: sub, name, role } = { id: "user_bodega_01", name: "Carlos", role: "admin" };

    const token = jwt.sign({
        sub,
        name,
        role, // Añadimos el rol para saber si puede editar verduras o solo ver
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // Expira en 1 hora
    }, secret);

    res.send({ token });
});

// --- Endpoints de Inventario ---

// Ruta Pública: Cualquiera puede ver qué verduras y granos hay
app.get("/inventario/publico", (req, res) => {
    res.send({
        granos: ["Arroz", "Lenteja", "Frijol"],
        verduras: ["Zanahoria", "Cebolla", "Tomate"]
    });
});

// Ruta Privada: Solo personal autenticado puede registrar entrada/salida de granos
app.post("/inventario/actualizar", (req, res) => {
    // 1. Log para ver qué llegó
    console.log("Headers:", req.headers['content-type']);
    console.log("Body:", req.body);

    // 2. Validación manual para atrapar el error
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).send({ 
            error: "Bad Request: El cuerpo está vacío. Revisa el Content-Type o el formato JSON." 
        });
    }
    try {
        // Validación del Token 
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).send({ error: "Falta cabecera de autorización" });

        const token = authHeader.split(" ")[1];
        const payload = jwt.verify(token, secret);

        // Validación de seguridad para el body
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).send({ error: "El cuerpo de la petición está vacío" });
        }

        // Verificamos expiración (JWT maneja exp en segundos, no milisegundos)
        if (Math.floor(Date.now() / 1000) > payload.exp) {
            return res.status(401).send({ error: "Token expirado" });
        }

        // Lógica de Inventario
        const { producto, cantidad, tipo } = req.body; 
        console.log(`Usuario ${payload.name} actualizó ${producto} en el inventario.`);

        res.send({ 
            mensaje: "Inventario actualizado correctamente",
            usuario: payload.name,
            detalle: `Se registraron ${cantidad}kg de ${producto}`
        });

    } catch (error) {
        res.status(401).send({ error: "Acceso denegado: " + error.message });
    }
});

// Mensaje inicio servidor
app.listen(3000, () => {
    console.log("Servidor de Granos y Verduras corriendo en el puerto 3000");
});