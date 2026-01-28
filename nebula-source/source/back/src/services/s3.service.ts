import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { NextFunction, Request, Response, Router } from 'express'
import { model, Schema } from 'mongoose'

import { userMw } from '../middleware'
import { IUser } from '../models/user.model'

/***
 * S3 Object Schema
 *
 * This is the schema for the S3 object.
 * It is used to create the S3 object in the database.
 * It is also used to generate the signed url for the S3 object.
 */

export interface IS3Object {
    _id: string
    key: string
    owner: IUser
    permissions: {
        isPublic: boolean
        isViewableByAnyUser: boolean
    }
}

const S3ObjectSchema = new Schema<IS3Object>({
    key: String,
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
    permissions: {
        isPublic: { type: Boolean, default: false },
        isViewableByAnyUser: { type: Boolean, default: false },
    },
})

const S3Object = model<IS3Object>('S3Object', S3ObjectSchema)

/*** * S3 Service
 *
 * This is the service for the S3 object.
 * It is used to generate the signed url for the S3 object.
 * It is also used to create the S3 object in the database.
 */

export class S3Service {
    private s3Client: S3Client
    private bucket: string

    constructor() {
        if (
            !process.env.S3_REGION ||
            !process.env.AWS_ACCESS_KEY_ID ||
            !process.env.AWS_SECRET_ACCESS_KEY ||
            !process.env.S3_BUCKET
        ) {
            throw new Error('S3 environment variables are not set')
        }

        this.s3Client = new S3Client({
            region: process.env.S3_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        })
        this.bucket = process.env.S3_BUCKET
    }

    async findObjectById(objectId: string): Promise<IS3Object | null> {
        return S3Object.findById(objectId).exec()
    }

    async generateGetSignedUrl(object: IS3Object): Promise<{ url: string; contentType: string | undefined }> {
        const metadata = await this.s3Client.send(
            new HeadObjectCommand({
                Bucket: this.bucket,
                Key: object.key,
            })
        )

        const contentType = metadata.ContentType

        const url = await getSignedUrl(
            this.s3Client,
            new GetObjectCommand({
                Bucket: this.bucket,
                Key: object.key,
            }),
            { expiresIn: 60 * 60 * 14 }
        )

        return { url, contentType }
    }

    async generatePutSignedUrl(fileName: string, fileType: string): Promise<string> {
        return getSignedUrl(
            this.s3Client,
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: fileName,
                ContentType: fileType,
            }),
            { expiresIn: 60 * 60 * 10 }
        )
    }

    async createS3Object(fileName: string, owner: string, permissions: any): Promise<IS3Object> {
        return S3Object.create({
            key: fileName,
            owner,
            permissions,
        })
    }
}

/*** * S3 Router
 *
 * This is the router for the S3 object.
 * It is used to generate the signed url for the S3 object.
 * It is also used to create the S3 object in the database.
 */

const s3Router = Router()

interface CustomRequest extends Request {
    object?: IS3Object
    s3Service?: S3Service
}

// Middleware
async function checkS3Service(req: CustomRequest, res: Response, next: NextFunction) {
    try {
        const s3Service = new S3Service()
        req.s3Service = s3Service
        next()
    } catch (error) {
        console.error('Error initializing S3 service:', error)
        return res.status(404).json({ message: 'S3 service not found' })
    }
}

async function checkPublicAccess(req: CustomRequest, res: Response, next: NextFunction) {
    const objectId = req.params.objectId
    try {
        const object = await req.s3Service?.findObjectById(objectId)
        if (!object) return res.status(400).json({ message: 'Object not found' })

        if (object.permissions.isPublic) {
            req.object = object
            return next()
        }
        return userMw(req, res, next)
    } catch (error) {
        console.error(`Error checking public access:`, error)
        return res.status(500).json({ message: 'Server error' })
    }
}

// ROUTES
s3Router.get(
    '/get-signed-url/:objectId',
    checkS3Service,
    checkPublicAccess,
    async (req: CustomRequest, res: Response) => {
        res.shouldKeepAlive = true
        const objectId = req.params.objectId

        try {
            const object = req.object || (await req.s3Service?.findObjectById(objectId))
            if (!object) return res.status(404).json({ message: 'Object not found' })

            if (!object.permissions.isPublic) {
                const { id } = res.locals.sessionUser
                const isOwner = object.owner.toString() === id
                if (!isOwner && !object.permissions.isViewableByAnyUser) {
                    return res.status(401).json({ message: 'Access denied' })
                }
            }

            try {
                const { url, contentType } = await req.s3Service?.generateGetSignedUrl(object)
                res.json({ signedUrl: url, contentType })
            } catch (err) {
                console.error('Error fetching metadata or generating signed URL:', err)
                return res.status(418).json({ error: 'Error fetching metadata or generating signed URL' })
            }
        } catch (error) {
            console.error(`Error generating signed url:`, error)
            return res.status(500).json({ message: 'Server error' })
        }
    }
)

s3Router.post(
    '/get-signed-post-url/:fileName/:fileType',
    userMw,
    checkS3Service,
    async (req: CustomRequest, res: Response) => {
        const { fileName, fileType } = req.params
        const permissions = req.body

        try {
            const url = await req.s3Service?.generatePutSignedUrl(fileName, fileType)
            const s3Object = await req.s3Service?.createS3Object(fileName, res.locals.sessionUser.id, permissions)

            return res.status(200).json({ signedPostUrl: url, objectId: s3Object._id })
        } catch (error) {
            console.error('Error generating signed post URL:', error)
            return res.status(418).json({ error: 'Error generating signed post URL' })
        }
    }
)

export { s3Router }
