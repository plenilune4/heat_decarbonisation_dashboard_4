/*
    !! Source of truth for API endpoints !!

    add new endpoints in this object

    - top-level keys are router names
    - second-level keys are friendly names for an endpoint
    - values are the endpoints used in the request handler
        - endpoints can still be suffixed with '/:id' in the request handler

    FOR SUB-ROUTES such as '/content/:id/like' then specify that whole endpoint
    OR use '/content/:id/action' and apply query strings ('?action=like' ~~ const { action } = req.query) in the request handler if there will be multiple similar actions
*/
const endpoints = {
    app: {
        user: '/user',
        client: '/client',
        clientUser: '/client-user',
        evaluationFunction: '/evaluation-function',
        analysis: '/analysis',
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
        register: '/register',
        login: '/login',
        logout: '/logout',
        whoami: '/whoami',
        refresh: '/refresh',
        forgotPassword: '/request-token',
        resetPassword: '/reset-password',
    },
}

/*
    !! DO NOT EDIT !!

    ENDPOINTS is identical to above, but is a separate copy so as to not be changed by the following process
        its used only on the backend in the request handlers

    ROUTES is for the frontend, the router prefixes are joined to the final endpoints
        so { router: { name: '/endpoint' }} becomes { router: { name: 'router/endpoint' }}
*/

export const ENDPOINTS = JSON.parse(JSON.stringify(endpoints)) as typeof endpoints

for (const [router, routes] of Object.entries(endpoints)) {
    for (const [name, endpoint] of Object.entries(routes)) {
        //@ts-ignore - router is definitely a key of endpoints
        endpoints[router][name] = `${router}${endpoint}`
    }
}

const ROUTES = Object.assign({}, endpoints) as typeof endpoints
export default ROUTES
