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
import CaseStudy, {ArchetypeSummary} from "../models/caseStudy.model"

const POPULATE_BUILDING_SELECTION = ['owner']
const POPULATE_CASE_STUDY = ['owner', 'buildingSelection']


import {
    ACCESS_TOKEN_LIFETIME,
    createTokenForUser,
    encodeAccessToken,
    SALT_ROUNDS,
    verifyAccessTokenClaims,
} from '../services/authentication.service'

const router = Router()
const ROUTES = ENDPOINTS.app


// Bits for the backend optimisations:
// const Job = require("../models/Job");
// const optimisationQueue =
//   require("../queues/optimisationQueue");

/**
 * Route for running a DHN optimisation in the backend.
 */
router.post(ROUTES.optimiseDHNlayout, async (req, res) => {
    try {

        const {param1, param2, param3, param4} = req.body;

        const job = await Job.create({

            status: "queued",

            params: {
                param1,
                param2,
                param3,
                param4
            },

            submittedAt: new Date()
        });

        await redis.rPush(
            "optimisation_queue",
            JSON.stringify({
                jobId: job._id.toString(),
                param1,
                param2,
                param3,
                param4
            })
        );

        res.json({
            jobId: job._id,
            status: "queued"
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            error: "Failed to create job"
        });

    }
});

/**
 * Route for checking current status of optimisation job.
 * Note that Job will need switching for DHNoptimisationJob.
 */
router.get(ROUTES.checkOptimisationStatus + "/:jobId", async (req, res) => {

    const job = await Job.findById(
        req.params.jobId
    );

    if (!job) {
        return res.status(404).json({
            error: "Job not found"
        });
    }

    res.json({
        status: job.status,
        results: job.results,
        error: job.error
    });

});

/**
 * Gets the buildings geojson for those which fall within a requested bounding box.
 */
// router.get(ROUTES.getVBuildingData1, (req, res) => {
//
//     const bboxString = req.query.bbox as string;
//
//     if (!bboxString) {
//         return res.status(400).json({
//             error: "bbox required"
//         });
//     }
//
//     const bbox =
//         bboxString.split(",").map(Number);
//
//     const features =
//         buildingService.getBuildingsInBBox(bbox);
//
//     res.json({
//         type: "FeatureCollection",
//         features
//     });
//
// });


/**
 * Gets the buildings geojson for those which fall within a requested bounding box.
 */
router.get(ROUTES.getVBuildingDataInBounds, (req, res) => {

    const bboxString = req.query.bbox as string;

    if (!bboxString) {
        return res.status(400).json({
            error: "bbox required"
        });
    }

    const bbox =
        bboxString.split(",").map(Number);

    const features =
        buildingService.findBuildingsInBounds(bbox);

    res.json({
        type: "FeatureCollection",
        features
    });
});

router.post(ROUTES.getVBuildingDataInPolygon,
    (req, res) => {

        const polygon = req.body;
        console.log("Supplied polygon")
        console.log(polygon)

        const buildings =
            buildingService
                .findBuildingsInPolygon(
                    polygon
                );

        res.json({
            count: buildings.length,
            features: buildings
        });
    }
);

/**
 * Similar to above but uses multiple polygons.
 */
router.post(ROUTES.getVBuildingDataInPolygons,
    (req, res) => {

        const polygons = req.body;
        console.log(`getVBuildingDataInPolygons received ${polygons.length} polygons:`)
        console.log(polygons)

        const buildingsFound = polygons.filter((p) => !!p).flatMap((polygon) =>
            buildingService
                .findBuildingsInPolygon(
                    polygon
                )
        )

        res.json({
            count: buildingsFound.length,
            features: buildingsFound
        });
    }
);

router.post(ROUTES.getAggregateDatainPolygons,
    (req, res) => {

        const polygons = req.body;
        console.log(`getAggregateDatainPolygons received ${polygons.length} polygons`)
        console.log(polygons)

        r:Response

        const summary = new Map<string, ArchetypeSummary>();

        if (!polygons) {
            res.json(new Map<string, ArchetypeSummary>());
            return;
        }

        polygons.forEach((polygon) => {
            const summaries = buildingService.summariseBuildingsInPolygon(polygon);
            summaries.forEach((s, atype) => {
                let record = summary.get(atype);
                if (!record) {
                    record = {
                        archetype: atype,
                        numBuildings: 0,
                        totalFloorArea: 0
                    };
                    summary.set(atype, record);
                }
                record.numBuildings += s.numBuildings;
                record.totalFloorArea += s.totalFloorArea;
            })
        })

        console.log("getAggregateDatainPolygons() generated this building stock summary:")
        console.log(summary)

        res.json(Object.fromEntries(summary)); // we can worry about any sorting that is needed in the frontend.
    }
);


/**
 * Route that gets building data for a specific tile, with zoom, x and y specified in the url params.
 * (Only use zoom 15.)
 */
router.get(`${ROUTES.getVBuildingData1}/:z/:x/:y`,
    (req, res) => {
        const {z, x, y} = req.params;

        const filePath = path.join(
            __dirname,
            "..",
            "data",
            "verisk_sy_buildings",
            z,
            x,
            `${y}.geojson`
        );

        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                return res.json({
                    type: "FeatureCollection",
                    crs: {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
                    features: []
                });
            }
            res.sendFile(filePath);
        });
    }
);


// User routes with access control
BaseRoutes(router, {
    model: User,
    route: ROUTES.user,
    excludedRoutes: ['delete'],
    userSpecific: true,
    ownerField: '_id',
    populate: ['client'],
    excludedUpdateProperties: ['client', 'permissions', 'passwordHash', 'isClientAdmin'],
})


/**
 * Retrieve all the building selections for the logged-in user.
 */
router.get(ROUTES.buildingSelections, async (req: Request, res: Response) => {
    const {sessionUser} = res.locals
    console.log(`Finding all saved case study buildings for user ${sessionUser}.`)

    const selections = await BuildingSelection.find({owner: sessionUser._id})
        .sort({createdAt: -1})
        .select('-results')
        .populate(POPULATE_BUILDING_SELECTION)

    return res.status(200).json(selections)
})


/**
 * Retrieve all the building selections for a specified user.
 */
router.get(ROUTES.user + '/:user_id/buildingSelections', async (req: Request, res: Response) => {
    const {sessionUser} = res.locals

    if (!req.params.user_id || req.params.user_id === 'undefined') {
        return res.status(400).json({message: 'User ID is required'})
    }

    const targetUser = await User.findById(req.params.user_id)
    if (!targetUser) {
        return res.status(404).json({message: 'User not found'})
    }

    if (sessionUser._id.toString() !== targetUser._id.toString()) {
        return res.status(403).json({message: 'You are not authorised to access data for this user.'})
    }

    const buildingSelections = await BuildingSelection.find({user: targetUser._id})
        .sort({createdAt: -1})
        .populate(POPULATE_BUILDING_SELECTION)

    return res.status(200).json(buildingSelections)
})

/**
 * Save a new building selection, or update one.
 * We may need some additional backend to untangle the buildings that have been manually added or subtracted???
 */
router.post(ROUTES.user + '/:user_id/buildingSelections', async (req: Request, res: Response) => {
    const {sessionUser} = res.locals
    const targetUser = await User.findById(req.params.user_id)
    if (!targetUser) {
        return res.status(404).json({message: 'User not found.'})
    }
    if (sessionUser._id.toString() !== targetUser._id.toString()) {
        return res.status(403).json({message: 'You are not authorised to save data for this user.'})
    }

    const {_id, ...body} = req.body

    if (!_id || _id === 'new') {
        const newBuildingSelection = new BuildingSelection({
            ...body,
            owner: res.locals.sessionUser._id,
        })
        await newBuildingSelection.save()

        return res.status(201).json({created: await BuildingSelection.findById(newBuildingSelection._id).populate(POPULATE_BUILDING_SELECTION)})
    } else {
        const existingBuildingSelection = await BuildingSelection.findOne({_id, user: targetUser._id})
        if (!existingBuildingSelection) {
            return res.status(404).json({message: 'Building selection not found'})
        }
        const update = {
            ...body,
            owner: res.locals.sessionUser._id,
        }
        await BuildingSelection.findByIdAndUpdate(_id, update)

        return res
            .status(200)
            .json({updated: await BuildingSelection.findById(existingBuildingSelection._id).populate(POPULATE_BUILDING_SELECTION)})
    }
})

/**
 * Route to get a specific building selection by its ID.
 */
router.get(ROUTES.user + '/:user_id/buildingSelections/:selection_id', async (req: Request, res: Response) => {
    const {sessionUser} = res.locals

    if (!req.params.user_id || req.params.user_id === 'undefined') {
        return res.status(400).json({message: 'User ID is required'})
    }

    const targetUser = await User.findById(req.params.user_id)
    if (!targetUser) {
        return res.status(404).json({message: 'User not found'})
    }

    if (sessionUser._id.toString() !== targetUser._id.toString()) {
        return res.status(403).json({message: 'You are not authorised to access data for this user'})
    }

    const bs = await BuildingSelection.findOne({
        _id: req.params.selection_id,
        user: targetUser._id,
    }).populate(POPULATE_BUILDING_SELECTION)

    if (!bs) {
        return res.status(404).json({message: 'Building selection not found'})
    }

    return res.status(200).json(bs)
})

/**
 * Route to get a specific building selection by its ID.
 */
router.get(ROUTES.user + '/:user_id/buildingSelections/:selection_id', async (req: Request, res: Response) => {
    const {sessionUser} = res.locals

    if (!req.params.user_id || req.params.user_id === 'undefined') {
        return res.status(400).json({message: 'User ID is required'})
    }

    const targetUser = await User.findById(req.params.user_id)
    if (!targetUser) {
        return res.status(404).json({message: 'User not found'})
    }

    if (sessionUser._id.toString() !== targetUser._id.toString()) {
        return res.status(403).json({message: 'You are not authorised to access data for this user'})
    }

    const bs = await BuildingSelection.findOne({
        _id: req.params.selection_id,
        user: targetUser._id,
    }).populate(POPULATE_BUILDING_SELECTION)

    if (!bs) {
        return res.status(404).json({message: 'Building selection not found'})
    }

    return res.status(200).json(bs)
})

////////// Case studies //////////

/**
 * Retrieve all the case studies for the logged-in user.
 */
router.get(ROUTES.caseStudies, async (req: Request, res: Response) => {
    const {sessionUser} = res.locals
    console.log(`Finding all saved case studies for user ${sessionUser}.`)

    const selections = await CaseStudy.find({owner: sessionUser._id})
        .sort({createdAt: -1})
        .select('-results')
        .populate(POPULATE_CASE_STUDY)

    return res.status(200).json(selections)
})


/**
 * Retrieve all the case studies for a specified user.
 */
router.get(ROUTES.user + '/:user_id/caseStudies', async (req: Request, res: Response) => {
    const {sessionUser} = res.locals

    if (!req.params.user_id || req.params.user_id === 'undefined') {
        return res.status(400).json({message: 'User ID is required'})
    }

    const targetUser = await User.findById(req.params.user_id)
    if (!targetUser) {
        return res.status(404).json({message: 'User not found'})
    }

    if (sessionUser._id.toString() !== targetUser._id.toString()) {
        return res.status(403).json({message: 'You are not authorised to access data for this user.'})
    }

    const caseStudies = await CaseStudy.find({user: targetUser._id})
        .sort({createdAt: -1})
        .populate(POPULATE_CASE_STUDY)

    return res.status(200).json(caseStudies)
})

/**
 * Save a new case study, or update one.
 */
router.post(ROUTES.user + '/:user_id/caseStudies', async (req: Request, res: Response) => {
    const {sessionUser} = res.locals
    const targetUser = await User.findById(req.params.user_id)
    if (!targetUser) {
        return res.status(404).json({message: 'User not found.'})
    }
    if (sessionUser._id.toString() !== targetUser._id.toString()) {
        return res.status(403).json({message: 'You are not authorised to save data for this user.'})
    }

    const {_id, ...body} = req.body

    if (!_id || _id === 'new') {
        const newCaseStudy = new CaseStudy({
            ...body,
            owner: res.locals.sessionUser._id,
        })
        await newCaseStudy.save()

        return res.status(201).json({created: await CaseStudy.findById(newCaseStudy._id).populate(POPULATE_CASE_STUDY)})
    } else {
        const existingCaseStudy = await CaseStudy.findOne({_id, user: targetUser._id})
        if (!existingCaseStudy) {
            return res.status(404).json({message: 'Case study not found'})
        }
        const update = {
            ...body,
            owner: res.locals.sessionUser._id,
        }
        await CaseStudy.findByIdAndUpdate(_id, update)

        return res
            .status(200)
            .json({updated: await CaseStudy.findById(existingCaseStudy._id).populate(POPULATE_CASE_STUDY)})
    }
})

/**
 * Route to get a specific case study by its ID.
 */
router.get(ROUTES.user + '/:user_id/caseStudies/:id', async (req: Request, res: Response) => {
    const {sessionUser} = res.locals

    if (!req.params.user_id || req.params.user_id === 'undefined') {
        return res.status(400).json({message: 'User ID is required'})
    }

    const targetUser = await User.findById(req.params.user_id)
    if (!targetUser) {
        return res.status(404).json({message: 'User not found'})
    }

    if (sessionUser._id.toString() !== targetUser._id.toString()) {
        return res.status(403).json({message: 'You are not authorised to access data for this user'})
    }

    const cs = await CaseStudy.findOne({
        _id: req.params.id,
        user: targetUser._id,
    }).populate(POPULATE_CASE_STUDY)

    if (!cs) {
        return res.status(404).json({message: 'Case study not found'})
    }

    return res.status(200).json(cs)
})

/**
 * Route to get a specific case study by its ID.
 */
router.get(ROUTES.user + '/:user_id/caseStudies/:selection_id', async (req: Request, res: Response) => {
    const {sessionUser} = res.locals

    if (!req.params.user_id || req.params.user_id === 'undefined') {
        return res.status(400).json({message: 'User ID is required'})
    }

    const targetUser = await User.findById(req.params.user_id)
    if (!targetUser) {
        return res.status(404).json({message: 'User not found'})
    }

    if (sessionUser._id.toString() !== targetUser._id.toString()) {
        return res.status(403).json({message: 'You are not authorised to access data for this user'})
    }

    const bs = await CaseStudy.findOne({
        _id: req.params.selection_id,
        user: targetUser._id,
    }).populate(POPULATE_CASE_STUDY)

    if (!bs) {
        return res.status(404).json({message: 'Case study not found'})
    }

    return res.status(200).json(bs)
})




export default router
