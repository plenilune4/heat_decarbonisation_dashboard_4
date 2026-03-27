const endpoints = {
    app: {
        user: '/user',
        client: '/client',
        clientUser: '/client-user',
        evaluationFunction: '/evaluation-function',
        analysis: '/analysis',
        externalAnalysis: '/external-analysis',
        runAnalysis: '/run',
        dockerStatus: '/docker/status',
        dockerStart: '/docker/start',
    },
    admin: {
        client: '/client',
        evaluationFunction: '/evaluation-function',
        analysis: '/analysis',
        user: '/user',
    },
    public: {},
    auth: {
        // register: '/register',
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
