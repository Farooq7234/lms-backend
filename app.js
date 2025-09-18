import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"



const app = express()

app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

import userRouter from "./routes/user.routes.js"
import leadRouter from "./routes/lead.routes.js"

app.use("/api/v1/users", userRouter)
app.use("/api/v1/leads", leadRouter)

// http://localhost:8000/api/v1/users/register

export { app }