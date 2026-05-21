import { Request, Response, Router } from 'express'
import { FilterQuery, Model, PopulateOptions, Query } from 'mongoose'

interface RouteConfig {
    model: Model<any>
    route: string
    excludedRoutes?: ('get-one' | 'get' | 'post' | 'delete')[]
    excludedUpdateProperties?: string[]
    excludedGetProperties?: string[]
    populate?: (string | PopulateOptions)[]
    userSpecific?: boolean
    ownerField?: string
    ownerComparisonFunction?: (res: Response) => any
    filter?: FilterQuery<any>
}

const BaseRoutes = (router: Router, config: RouteConfig) => {
    const {
        model,
        route,
        excludedRoutes,
        excludedUpdateProperties,
        excludedGetProperties,
        populate,
        userSpecific,
        ownerField = 'owner',
        ownerComparisonFunction,
        filter,
    } = config

    // Helper function to exclude properties from an object
    const excludeProperties = (obj: any, properties: string[] = []) => {
        const result = { ...obj }
        properties.forEach((prop) => {
            const keys = prop.split('.')
            let current = result
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) break
                current = current[keys[i]]
            }
            delete current[keys[keys.length - 1]]
        })
        return result
    }

    // GET all items
    if (!excludedRoutes?.includes('get')) {
        router.get(route, async (req: Request, res: Response) => {
            try {
                let query = model.find()
                if (populate) {
                    query = query.populate(
                        populate.map((field) => {
                            if (typeof field === 'string') {
                                const parts = field.split('.')
                                if (parts.length > 1) {
                                    let currentPopulate: PopulateOptions = { path: parts.pop() as string }
                                    while (parts.length > 0) {
                                        currentPopulate = { path: parts.pop() as string, populate: currentPopulate }
                                    }
                                    return currentPopulate
                                } else {
                                    return { path: field }
                                }
                            } else {
                                return field
                            }
                        })
                    )
                }
                if (userSpecific) {
                    query = query
                        .where(ownerField)
                        .equals(ownerComparisonFunction ? ownerComparisonFunction(res) : res.locals.sessionUser._id)
                }
                if (filter) {
                    query = query.find(filter)
                }
                const data = await query.exec()
                const filteredData = data.map((item) => excludeProperties(item.toObject(), excludedGetProperties))
                return res.status(200).json(filteredData)
            } catch (error) {
                console.log({ error })
                return res.status(500).json({ error })
            }
        })
    }

    // GET item by ID
    if (!excludedRoutes?.includes('get-one')) {
        router.get(`${route}/:id`, async (req: Request, res: Response) => {
            if (!req.params.id) {
                return res.status(400).json({ error: 'Missing ID' })
            }
            try {
                let query = model.findById(req.params.id)
                if (populate) {
                    query = query.populate(
                        populate.map((field) => {
                            if (typeof field === 'string') {
                                const parts = field.split('.')
                                if (parts.length > 1) {
                                    let currentPopulate: PopulateOptions = { path: parts.pop() }
                                    while (parts.length > 0) {
                                        currentPopulate = { path: parts.pop(), populate: currentPopulate }
                                    }

                                    return currentPopulate
                                } else {
                                    return { path: field }
                                }
                            } else {
                                return field
                            }
                        })
                    )
                }
                if (userSpecific) {
                    query = query
                        .where(ownerField)
                        .equals(ownerComparisonFunction ? ownerComparisonFunction(res) : res.locals.sessionUser._id)
                }
                const data = await query.exec()
                if (!data) {
                    return res.status(404).json({ error: 'Not found' })
                }
                const filteredData = excludeProperties(data.toObject(), excludedGetProperties)
                return res.status(200).json(filteredData)
            } catch (error) {
                return res.status(500).json({ error })
            }
        })
    }

    // POST create or update item
    if (!excludedRoutes?.includes('post')) {
        router.post(route, async (req: Request, res: Response) => {
            try {
                if (!req.body._id || req.body._id === 'new') {
                    if (userSpecific) {
                        req.body[ownerField] = ownerComparisonFunction
                            ? ownerComparisonFunction(res)
                            : res.locals.sessionUser._id
                    }
                    const created = await new model({ ...req.body, _id: undefined }).save()
                    return res.status(201).json({ created })
                } else {
                    const updatableProperties = excludeProperties(req.body, excludedUpdateProperties)
                    if (userSpecific) {
                        const item = await model.findById(req.body._id)
                        if (
                            !item ||
                            String(item[ownerField]) !==
                                (ownerComparisonFunction
                                    ? ownerComparisonFunction(res)
                                    : String(res.locals.sessionUser._id))
                        ) {
                            return res.status(403).json({ error: 'Forbidden' })
                        }
                    }
                    await model.findByIdAndUpdate(req.body._id, updatableProperties)
                    return res.status(200).json({ message: 'successfully updated' })
                }
            } catch (error) {
                console.log(error)
                return res.status(500).json({ error })
            }
        })
    }

    // DELETE item by ID
    if (!excludedRoutes?.includes('delete')) {
        router.delete(`${route}/:id`, async (req: Request, res: Response) => {
            try {
                const item = await model.findById(req.params.id)
                if (!item) {
                    return res.status(404).json({ error: 'Not found' })
                }
                if (userSpecific) {
                    if (
                        !item ||
                        String(item[ownerField]) !==
                            (ownerComparisonFunction
                                ? ownerComparisonFunction(res)
                                : String(res.locals.sessionUser._id))
                    ) {
                        return res.status(403).json({ error: 'Forbidden' })
                    }
                }
                await model.findByIdAndDelete(req.params.id)
                return res.status(204).json({ message: 'successfully deleted' })
            } catch (error) {
                return res.status(500).json({ error })
            }
        })
    }
}

export default BaseRoutes
