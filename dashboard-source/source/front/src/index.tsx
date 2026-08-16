import React from 'react'
import ReactDOM from 'react-dom/client'
import {BrowserRouter, Route, Routes} from 'react-router-dom'
import {ToastContainer} from 'react-toastify'

import 'regenerator-runtime'
import './index.css'

import ConfirmAccountPage from '@/auth/ConfirmAccount'
import LoginPage from '@/auth/LoginPage'
import LogoutPage from '@/auth/LogoutPage'
import RegisterPage from '@/auth/RegisterPage'
import RequestResetPage from '@/auth/RequestPasswordResetPage'
import ResetPasswordPage from '@/auth/ResetPasswordPage'
import ForbiddenPage from '@/error-pages/ForbiddenPage'
import NotFoundPage from '@/error-pages/NotFoundPage'

import {
    AuthenticatedWrapper,
    AuthProvider,
    OnboardingWrapper,
    PermissionsWrapper,
} from '@/services/authentication.service'
import {ResourceStatusProvider} from '@/services/resource.service'

import AppLayout from '@/app/_Layout'
import Onboarding from '@/app/Onboarding'
import Profile from '@/app/Profile'

import AccessExpiredPage from './app/AccessExpiredPage'
import App from '@/app/App' // I don't think this is needed as an intermediate component.
import MapDashboard from '@/map/MapDashboard2'
import DashboardPage from "@/app/Dashboard";
import LoadCaseStudy from "@/app/LoadCaseStudy";

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)

root.render(
    <BrowserRouter>
        <ResourceStatusProvider>
            <AuthProvider>
                <Routes>
                    {/* Authentication Pages */}
                    <Route path='/register' element={<RegisterPage/>}/>
                    <Route path='/login' element={<LoginPage/>}/>
                    <Route path='/logout' element={<LogoutPage/>}/>
                    <Route path='/request-reset' element={<RequestResetPage/>}/>
                    <Route path='/reset-password' element={<ResetPasswordPage/>}/>
                    <Route path='/confirm-account' element={<ConfirmAccountPage/>}/>

                    {/* Public Routes */}
                    <Route path='/onboarding' element={<Onboarding/>}/>
                    <Route path='/access-expired' element={<AccessExpiredPage/>}/>

                    <Route element={<AuthenticatedWrapper/>}>
                        <Route element={<OnboardingWrapper/>}>
                            <Route path='/' element={<AppLayout/>}>


                                {/*<Route index element={<App/>}/>                                */}
                                <Route index element={<DashboardPage/>}/>
                                {/*<Route index element={<MapDashboard/>}/>*/}

                                {/*<Route path='buildingstock'>*/}
                                {/*    <Route index element={<AssignBuildingStock/>}/>*/}
                                {/*</Route>*/}

                                <Route path='casestudies'>
                                    <Route index element={<LoadCaseStudy/>}/>
                                    <Route path='run/:id' element={<MapDashboard/>}/>
                                    {/*<Route path='run/:id' element={<CaseStudyDashboard/>}/>*/}
                                </Route>

                                {/*<Route path = 'mapdashboard' element={<MapDashboard/>}/>*/}

                                {/*<Route index element={<MapDashboard />} />*/}
                                {/*  */}
                                <Route path='profile' element={<Profile/>}/>
                            </Route>
                        </Route>
                        <Route element={<PermissionsWrapper required={{isAdmin: true}}/>}>
                        </Route>
                    </Route>
                    {/* Error */}
                    <Route path='/forbidden' element={<ForbiddenPage/>}/>
                    <Route path='/*' element={<NotFoundPage redirectTo='/'/>}/>
                </Routes>
                <ToastContainer position='top-right' autoClose={5000} theme='dark'/>
            </AuthProvider>
        </ResourceStatusProvider>
    </BrowserRouter>
)
