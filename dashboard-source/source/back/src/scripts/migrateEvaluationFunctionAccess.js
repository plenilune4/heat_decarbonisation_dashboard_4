// const mongoose = require('mongoose')
// const dotenv = require('dotenv')
//
// dotenv.config()
//
// // Define schemas
// const analysisSchema = new mongoose.Schema(
//     {
//         owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//         client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
//         evaluationFunction: { type: mongoose.Schema.Types.ObjectId, ref: 'EvaluationFunction' },
//         reference: { type: String, required: true },
//         label: { type: String },
//         samplingStrategy: { type: String },
//         scenarioInputs: [{ type: Object }],
//         scenarioOutputs: [{ type: Object }],
//         exogenousSamplingStrategy: { type: Object },
//         leverSamplingStrategy: { type: Object },
//         results: [{ type: Object }],
//         filters: [{ type: Object }],
//         charts: [{ type: Object }],
//         isReadOnly: { type: Boolean, default: false },
//     },
//     {
//         timestamps: true,
//         strict: false,
//     }
// )
//
// const clientEvaluationFunctionSchema = new mongoose.Schema(
//     {
//         client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
//         evaluationFunction: { type: mongoose.Schema.Types.ObjectId, ref: 'EvaluationFunction', required: true },
//         enabledAt: { type: Date, default: Date.now },
//     },
//     {
//         timestamps: true,
//         strict: false,
//     }
// )
//
// clientEvaluationFunctionSchema.index({ client: 1, evaluationFunction: 1 }, { unique: true })
//
// async function migrate(dryRun = true) {
//     try {
//         // Connect to MongoDB
//         const mongoURI = ''
//         await mongoose.connect(mongoURI)
//         console.log('Connected to MongoDB using Mongoose')
//
//         // Create models
//         const Analysis = mongoose.model('Analysis', analysisSchema)
//         const ClientEvaluationFunction = mongoose.model('ClientEvaluationFunction', clientEvaluationFunctionSchema)
//
//         // Find all analyses
//         const analyses = await Analysis.find({})
//         console.log(`Found ${analyses.length} analyses to process`)
//
//         if (analyses.length === 0) {
//             console.log('No analyses to process. Exiting...')
//             return
//         }
//
//         // Statistics tracking
//         const stats = {
//             total: analyses.length,
//             withEvaluationFunction: 0,
//             withoutEvaluationFunction: 0,
//             setToReadOnly: 0,
//             uniqueClientFunctionPairs: 0,
//             duplicatesSkipped: 0,
//             clientEvaluationFunctionsCreated: 0,
//             errors: 0,
//         }
//
//         // Track unique client-function pairs to avoid duplicates within this migration
//         const clientFunctionPairs = new Set()
//
//         // First pass: check existing ClientEvaluationFunction records to avoid duplicates
//         console.log('\nChecking for existing ClientEvaluationFunction records...')
//         const existingClientEvaluationFunctions = await ClientEvaluationFunction.find({})
//         existingClientEvaluationFunctions.forEach((cef) => {
//             const key = `${cef.client.toString()}-${cef.evaluationFunction.toString()}`
//             clientFunctionPairs.add(key)
//         })
//         console.log(`Found ${existingClientEvaluationFunctions.length} existing ClientEvaluationFunction records`)
//
//         // Process each analysis
//         console.log('\nProcessing analyses...\n')
//         for (const analysis of analyses) {
//             try {
//                 // Check if analysis has an evaluation function
//                 if (!analysis.evaluationFunction) {
//                     stats.withoutEvaluationFunction++
//
//                     // Set isReadOnly to true if not already
//                     if (!analysis.isReadOnly) {
//                         stats.setToReadOnly++
//
//                         if (dryRun) {
//                             console.log(
//                                 `[DRY RUN] Would set isReadOnly=true for analysis ${analysis._id} (no evaluationFunction)`
//                             )
//                         } else {
//                             await Analysis.updateOne({ _id: analysis._id }, { $set: { isReadOnly: true } })
//                             console.log(`Set isReadOnly=true for analysis ${analysis._id} (no evaluationFunction)`)
//                         }
//                     }
//                     continue
//                 }
//
//                 stats.withEvaluationFunction++
//
//                 // Create unique key for this client-function pair
//                 const pairKey = `${analysis.client.toString()}-${analysis.evaluationFunction.toString()}`
//
//                 // Check if this pair already exists (either in DB or in this migration run)
//                 if (clientFunctionPairs.has(pairKey)) {
//                     stats.duplicatesSkipped++
//                     continue
//                 }
//
//                 // Mark this pair as seen
//                 clientFunctionPairs.add(pairKey)
//                 stats.uniqueClientFunctionPairs++
//
//                 // Create ClientEvaluationFunction record
//                 const clientEvaluationFunctionData = {
//                     client: analysis.client,
//                     evaluationFunction: analysis.evaluationFunction,
//                     enabledAt: new Date(),
//                 }
//
//                 if (dryRun) {
//                     console.log(
//                         `[DRY RUN] Would create ClientEvaluationFunction:`,
//                         `Client: ${analysis.client}, EvaluationFunction: ${analysis.evaluationFunction}`
//                     )
//                     stats.clientEvaluationFunctionsCreated++
//                 } else {
//                     try {
//                         await ClientEvaluationFunction.create(clientEvaluationFunctionData)
//                         stats.clientEvaluationFunctionsCreated++
//                         console.log(
//                             `Created ClientEvaluationFunction: Client: ${analysis.client}, EvaluationFunction: ${analysis.evaluationFunction}`
//                         )
//                     } catch (error) {
//                         // Handle duplicate key error (E11000)
//                         if (error.code === 11000) {
//                             console.log(
//                                 `Duplicate detected (caught by DB): Client: ${analysis.client}, EvaluationFunction: ${analysis.evaluationFunction}`
//                             )
//                             stats.duplicatesSkipped++
//                         } else {
//                             throw error
//                         }
//                     }
//                 }
//             } catch (error) {
//                 console.error(`Error processing analysis ${analysis._id}:`, error.message)
//                 stats.errors++
//             }
//         }
//
//         // Print summary
//         console.log('\n' + '='.repeat(60))
//         console.log('Migration Summary:')
//         console.log('='.repeat(60))
//         console.log(`Total analyses processed: ${stats.total}`)
//         console.log(`Analyses with evaluationFunction: ${stats.withEvaluationFunction}`)
//         console.log(`Analyses without evaluationFunction: ${stats.withoutEvaluationFunction}`)
//         console.log(`Analyses set to isReadOnly=true: ${stats.setToReadOnly}`)
//         console.log(`Unique client-function pairs identified: ${stats.uniqueClientFunctionPairs}`)
//         console.log(`Duplicates skipped (already exist): ${stats.duplicatesSkipped}`)
//         console.log(`ClientEvaluationFunction records created: ${stats.clientEvaluationFunctionsCreated}`)
//
//         if (stats.errors > 0) {
//             console.log(`Errors encountered: ${stats.errors}`)
//         }
//
//         if (dryRun) {
//             console.log('\n' + '='.repeat(60))
//             console.log('This was a DRY RUN. No changes were made to the database.')
//             console.log('To perform the actual migration, run: node migrate.js apply')
//             console.log('='.repeat(60))
//         } else {
//             console.log('\n' + '='.repeat(60))
//             console.log('Migration completed successfully. All changes have been applied.')
//             console.log('='.repeat(60))
//         }
//     } catch (error) {
//         console.error('Migration failed:', error)
//         throw error
//     } finally {
//         await mongoose.connection.close()
//         console.log('\nDisconnected from MongoDB')
//     }
// }
//
// // Get command line arguments
// const args = process.argv.slice(2)
// const dryRun = args[0] !== 'apply'
//
// // Run the migration
// console.log('='.repeat(60))
// console.log(dryRun ? 'Starting DRY RUN migration...' : 'Starting ACTUAL migration...')
// console.log('='.repeat(60))
// migrate(dryRun)
//     .catch(console.error)
//     .finally(() => process.exit(0))
