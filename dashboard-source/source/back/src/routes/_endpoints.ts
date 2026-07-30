const endpoints = {
    app: {
        user: '/user',
        dockerStatus: '/docker/status',
        dockerStart: '/docker/start',
        getVBuildingData1: '/getVBuildingData1',
        getVBuildingData2: '/getVBuildingData2',
        optimiseDHNlayout: '/optimiseDHNlayout',
        checkOptimisationStatus: '/checkOptimisationStatus',
        getVBuildingDataInBounds: '/getVBuildingDataInBounds',
        getVBuildingDataInPolygon: '/getVBuildingDataInPolygon',
        getVBuildingDataInPolygons: '/getVBuildingDataInPolygons',
        getAggregateDatainPolygons: '/getAggregateDataInPolygons',
        buildingSelections: '/buildingSelections',
        caseStudies: '/caseStudies',
    },
    admin: {
        user: '/user',
    },
    data: {
        getArchetypes: '/getArchetypes',
    },
    public: {},
    auth: {
        register: '/register',
        login: '/login',
        logout: '/logout',
        whoami: '/whoami',
        refresh: '/refresh',
        forgotPassword: '/request-token',
        resetPassword: '/reset-password',
    },
}

export const ENDPOINTS = JSON.parse(JSON.stringify(endpoints)) as typeof endpoints

for (const [router, routes] of Object.entries(endpoints)) {
    for (const [name, endpoint] of Object.entries(routes)) {
        //@ts-ignore - router is definitely a key of endpoints
        endpoints[router][name] = `${router}${endpoint}`
    }
}

const ROUTES = Object.assign({}, endpoints) as typeof endpoints
export default ROUTES
