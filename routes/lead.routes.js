import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createLead, getLeads, getLeadById, updateLead, deleteLead } from "../controllers/lead.controllers.js";


const router = Router()

router.route("/create").post(verifyJWT, createLead)
router.route("/").get(verifyJWT, getLeads)
router.route("/:id").get(verifyJWT, getLeadById)
router.route("/:id").patch(verifyJWT, updateLead)
router.route("/:id").delete(verifyJWT, deleteLead)

export default router