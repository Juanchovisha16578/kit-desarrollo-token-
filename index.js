const express = require("express")
const jwt = require("jsonwebtoken")

console.log("El secreto cargado es:", process.env.SECRET);

// Firma Token
const secret = process.env.SECRET
const app = express()
 
//Endpoints
 
app.post("/token", (req, res) =>{
    //Obtener usuario de la base de datos
    const { id: sub, name } = { id: "johncesbel", name: "John" }
 
    const token = jwt.sign({
        sub,
        name,
        exp: Date.now() + 60 * 1000
 
    },secret)
    res.send({token})
})
 
app.get("/public", (req, res) =>{
    res.send("Servidor publico")
})
 
app.get("/private", (req, res) =>{
    try {
 
        const token = req.headers.authorization.split(" ")[1]
        const payload = jwt.verify(token, secret)
 
        if(Date.now() > payload.exp){
            return res.status(401).send({ error: "token expirado" })
        }
 
        res.send("Servidor privado")
       
    } catch (error) {
        res.status(401).send({error: error.message})
       
    }
})
 
 
//Mensaje inicio servidor
app.listen(3000, () => {
    console.log ("Servidor corriendo correctamente")
})