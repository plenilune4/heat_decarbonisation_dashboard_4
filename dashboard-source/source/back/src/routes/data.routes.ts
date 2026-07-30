import crypto from 'crypto'
import bcrypt from 'bcrypt'
import {Request, Response, Router} from 'express'
import {createUserContainer, DockerServiceImplementation} from '../services/docker.service'

import {ENDPOINTS} from './_endpoints'
import BaseRoutes from './helper'
import {buildingService}
    from "../services";
import path from "path";
import fs from "fs";
import RefreshToken from '../models/refreshToken.model'
import Token from '../models/token.model'
import User from '../models/user.model'
import BuildingSelection from "../models/buildingSelection.model";

const POPULATE_BUILDING_SELECTION = ['owner']


import {
    ACCESS_TOKEN_LIFETIME,
    createTokenForUser,
    encodeAccessToken,
    SALT_ROUNDS,
    verifyAccessTokenClaims,
} from '../services/authentication.service'

const router = Router()
const ROUTES = ENDPOINTS.data

router.get(ROUTES.getArchetypes, async (req: Request, res: Response) => {
    const filePath = path.join(__dirname, "..", "data", "archetypes","all_archetypes.csv");

    fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
            return res.status(500).json({error: "Failed to read file"});
        }
        res.json({content: data});
    });

    // to do: might want to process the csv in the backend.
})



export default router

