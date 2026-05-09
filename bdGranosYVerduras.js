const sqlite3 = require("sqlite3").verbose();

//Crea la base de datos Granos y Verduras 
const db = new sqlite3.Database("./jwtGranosYVerduras.db", (err) => {
    //Si hay error al conectar la base de datos muestreme error, si no muestreme un mensaje conctando a la bd 
    if (err) console.error(err.message)
        console.log("Conectando a la base de datos SQLite")
})

//Con el comando run 
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP      
        )`
    )
})


db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS producto (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombreProducto TEXT NOT NULL,
            cantidad INT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP      
        )`
    )
})

db.all("PRAGMA table_info(usuarios)", (err, columns) => {
    if (err) return console.error(err);

    // Revisamos si alguna columna se llama 'role'
    const existeRole = columns.some(col => col.name === 'role');

    if (!existeRole) {
        db.run("ALTER TABLE usuarios ADD COLUMN role TEXT", (err) => {
            if (err) console.error("Error al añadir columna:", err);
            else console.log("Columna 'role' añadida con éxito.");
        });
    } else {
        console.log("La columna 'role' ya existe, saltando paso.");
    }
});

module.exports = db