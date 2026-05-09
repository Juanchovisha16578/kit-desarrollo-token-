const sqlite3 = require("sqlite3").verbose();

//Crea una base de datos nueva 
const db = new sqlite3.Database("./jwt.db", (err) => {
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

module.exports = db