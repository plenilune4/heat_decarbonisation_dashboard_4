import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import AdminAnalysisRunsTable from '@/admin/AdminAnalysesTable'
import AdminClientsTable from '@/admin/AdminClientsTable'
import AdminFunctionsTable from '@/admin/AdminFunctionsTable'
import AdminUsersTable from '@/admin/AdminUsersTable'

import AdminClientForm from '@/forms/admin/AdminClientForm'
import AdminFunctionForm from '@/forms/admin/AdminFunctionForm'
import AdminUserForm from '@/forms/admin/AdminUserForm'

import Dashboard from '@/app/Dashboard'

import 'regenerator-runtime'
import './index.css'

import AdminLayout from '@/admin/_Layout'
import ConfirmAccountPage from '@/auth/ConfirmAccount'
import LoginPage from '@/auth/LoginPage'
import LogoutPage from '@/auth/LogoutPage'
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
import { ResourceStatusProvider } from '@/services/resource.service'

import CreateAnalysisForm from '@/forms/CreateAnalysisForm'
import CreateExternalAnalysisForm from '@/forms/CreateExternalAnalysisForm'

import AppLayout from '@/app/_Layout'
import ClientManagement from '@/app/ClientManagement'
import ClientUserManagement from '@/app/ClientUserManagement'
import CreateAnalysis from '@/app/CreateAnalysis'
import Evaluations from '@/app/Evaluations'
import LoadPreviousAnalysis from '@/app/LoadPreviousAnalysis'
import ManageExternalAnalysis from '@/app/ManageExternalAnalysis'
import Onboarding from '@/app/Onboarding'
import Profile from '@/app/Profile'
import RunAnalysis from '@/app/RunAnalysis'
import SingleFunctionView from '@/app/SingleFunctionView'

import AccessExpiredPage from './app/AccessExpiredPage'

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)

root.render(
    <BrowserRouter>
        <ResourceStatusProvider>
            <AuthProvider>
                <Routes>
                    {/* Authentication Pages */}
                    {/* <Route path='/register' element={<RegisterPage />} /> */}
                    <Route path='/login' element={<LoginPage />} />
                    <Route path='/logout' element={<LogoutPage />} />
                    <Route path='/request-reset' element={<RequestResetPage />} />
                    <Route path='/reset-password' element={<ResetPasswordPage />} />
                    <Route path='/confirm-account' element={<ConfirmAccountPage />} />

                    {/* Public Routes */}
                    <Route path='/onboarding' element={<Onboarding />} />
                    <Route path='/access-expired' element={<AccessExpiredPage />} />

                    <Route element={<AuthenticatedWrapper />}>
                        <Route element={<OnboardingWrapper />}>
                            <Route path='/' element={<AppLayout />}>
                                <Route index element={<Dashboard />} />
                                <Route path='evaluations' element={<Evaluations />} />
                                <Route path='evaluations/:id' element={<SingleFunctionView />} />
                                {/*  */}
                                <Route path='analyses'>
                                    <Route index element={<LoadPreviousAnalysis />} />
                                    <Route path='create' element={<CreateAnalysis />} />
                                    <Route path='create-from-external' element={<CreateExternalAnalysisForm />} />
                                    <Route path='create-from-external/:id' element={<CreateExternalAnalysisForm />} />
                                    <Route path='create-from-function' element={<CreateAnalysisForm />} />
                                    <Route path='run/:id' element={<RunAnalysis />} />
                                    <Route path='external/:id' element={<ManageExternalAnalysis />} />
                                </Route>
                                {/*  */}
                                <Route path='client-management' element={<ClientManagement />} />
                                <Route path='client-management/user/:id' element={<ClientUserManagement />} />
                                {/*  */}
                                <Route path='profile' element={<Profile />} />
                            </Route>
                        </Route>
                        <Route element={<PermissionsWrapper required={{ isAdmin: true }} />}>
                            <Route path='/admin' element={<AdminLayout />}>
                                <Route index element={<AdminUsersTable />} />
                                <Route path='users/:id' element={<AdminUserForm />} />
                                <Route path='clients' element={<AdminClientsTable />} />
                                <Route path='clients/:id' element={<AdminClientForm />} />
                                <Route path='analyses' element={<AdminAnalysisRunsTable />} />
                                {/*  */}
                                <Route path='functions' element={<AdminFunctionsTable />} />
                                <Route path='functions/:id' element={<AdminFunctionForm />} />
                                {/*  */}
                                <Route path='analyses'>
                                    <Route index element={<LoadPreviousAnalysis />} />
                                    <Route path='create' element={<CreateAnalysis />} />
                                    <Route path='create-from-external' element={<CreateExternalAnalysisForm />} />
                                    <Route path='create-from-external/:id' element={<CreateExternalAnalysisForm />} />
                                    <Route path='create-from-function' element={<CreateAnalysisForm />} />
                                    <Route path='run/:id' element={<RunAnalysis />} />
                                    <Route path='external/:id' element={<ManageExternalAnalysis />} />
                                </Route>
                                {/*  */}
                                <Route path='*' element={<NotFoundPage redirectTo='/admin' />} />
                            </Route>
                        </Route>
                    </Route>
                    {/* Error */}
                    <Route path='/forbidden' element={<ForbiddenPage />} />
                    <Route path='/*' element={<NotFoundPage redirectTo='/' />} />
                </Routes>
                <ToastContainer position='top-right' autoClose={5000} theme='dark' />
            </AuthProvider>
        </ResourceStatusProvider>
    </BrowserRouter>
)
