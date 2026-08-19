import { createContext, useContext, useState } from 'react'
import { api } from '@/lib/api/client'

const AuthContext = createContext(null)

// Access tokens expire after 15 minutes; the JWT layer signals this as 401 (expired/missing)
// or 422 (malformed) rather than raising a JS exception, so we retry once through the refresh
// token before giving up.
const AUTH_ERROR_STATUSES = [401, 422]

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    const stored = localStorage.getItem('makao_session')
    return stored ? JSON.parse(stored) : null
  })

  const persist = (next) => {
    setSession(next)
    if (next) {
      localStorage.setItem('makao_session', JSON.stringify(next))
    } else {
      localStorage.removeItem('makao_session')
    }
  }

  // Returns { otpRequired: true } when the account has an email on file (verify via
  // verifyLoginOtp to finish signing in), or persists the session directly otherwise.
  const login = async (identifier, password) => {
    const data = await api.post('/auth/login', { identifier, password })
    if (data.otp_required) return { otpRequired: true }
    persist({ token: data.access_token, refreshToken: data.refresh_token, user: data.user })
    return { otpRequired: false, user: data.user }
  }

  const verifyLoginOtp = async (identifier, code) => {
    const data = await api.post('/auth/verify-login-otp', { identifier, code })
    persist({ token: data.access_token, refreshToken: data.refresh_token, user: data.user })
    return data.user
  }

  const resendLoginOtp = (identifier) => api.post('/auth/resend-login-otp', { identifier })

  const register = async (payload) => {
    const data = await api.post('/auth/register', payload)
    persist({ token: data.access_token, refreshToken: data.refresh_token, user: data.user })
    return data
  }

  const logout = () => persist(null)

  // Wraps an authenticated call so an expired/invalid access token is refreshed and the
  // call retried once, rather than surfacing as a confusing error to the user.
  const callWithAuth = async (makeRequest) => {
    try {
      return await makeRequest(session?.token)
    } catch (err) {
      if (AUTH_ERROR_STATUSES.includes(err.status) && session?.refreshToken) {
        try {
          const refreshed = await api.post('/auth/refresh', null, session.refreshToken)
          persist({ ...session, token: refreshed.access_token })
          return await makeRequest(refreshed.access_token)
        } catch {
          persist(null)
        }
      }
      throw err
    }
  }

  const fetchBuildings = async () => {
    const data = await callWithAuth((token) => api.get('/buildings/', token))
    return data.buildings
  }

  const createBuilding = (payload) => callWithAuth((token) => api.post('/buildings/', payload, token))

  const updateBuilding = (buildingId, payload) =>
    callWithAuth((token) => api.patch(`/buildings/${buildingId}`, payload, token))

  const deleteBuilding = (buildingId) =>
    callWithAuth((token) => api.delete(`/buildings/${buildingId}`, token))

  const fetchBuildingDetail = (buildingId) => callWithAuth((token) => api.get(`/buildings/${buildingId}`, token))

  const fetchUnitsReportPdf = (buildingId, { occupancyStatus, rentStatus } = {}) => {
    const params = new URLSearchParams()
    if (occupancyStatus && occupancyStatus !== 'all') params.set('occupancy_status', occupancyStatus)
    if (rentStatus && rentStatus !== 'all') params.set('rent_status', rentStatus)
    const qs = params.toString()
    return callWithAuth((token) => api.getBlob(`/buildings/${buildingId}/units-report${qs ? `?${qs}` : ''}`, token))
  }

  const deleteUnit = (unitId) => callWithAuth((token) => api.delete(`/units/${unitId}`, token))

  const fetchOverviewStats = () => callWithAuth((token) => api.get('/buildings/stats', token))

  const fetchBuildingsDirectory = () => callWithAuth((token) => api.get('/buildings/directory', token))

  const fetchVacantUnits = (buildingId) =>
    callWithAuth((token) => api.get(`/buildings/${buildingId}/vacant-units`, token))

  const submitApplication = (payload) => callWithAuth((token) => api.post('/leasing/applications', payload, token))
  const fetchApplications = () => callWithAuth((token) => api.get('/leasing/applications', token))
  const approveApplication = (id, payload = {}) => callWithAuth((token) => api.post(`/leasing/applications/${id}/approve`, payload, token))
  const rejectApplication = (id) => callWithAuth((token) => api.post(`/leasing/applications/${id}/reject`, {}, token))
  const fetchExpenses = () => callWithAuth((token) => api.get('/expenses/', token))
  const fetchTickets = () => callWithAuth((token) => api.get('/tickets/', token))
  const createTicket = (payload) => callWithAuth((token) => api.post('/tickets/', payload, token))
  const fetchTicketComments = (ticketId) => callWithAuth((token) => api.get(`/tickets/${ticketId}/comments`, token))
  const addTicketComment = (ticketId, body) => callWithAuth((token) => api.post(`/tickets/${ticketId}/comments`, { body }, token))
  const updateTicket = (ticketId, payload) => callWithAuth((token) => api.patch(`/tickets/${ticketId}`, payload, token))
  const fetchComplaints = () => callWithAuth((token) => api.get('/complaints/', token))
  const createComplaint = (payload) => callWithAuth((token) => api.post('/complaints/', payload, token))
  const updateComplaint = (id, payload) => callWithAuth((token) => api.patch(`/complaints/${id}`, payload, token))
  const fetchInvoices = () => callWithAuth((token) => api.get('/invoices/', token))
  const recordInvoicePayment = (invoiceId, payload) =>
    callWithAuth((token) => api.post(`/invoices/${invoiceId}/payments`, payload, token))
  const sendInvoiceReminder = (invoiceId) =>
    callWithAuth((token) => api.post(`/invoices/${invoiceId}/send-reminder`, {}, token))
  const fetchPortfolioReport = () => callWithAuth((token) => api.get('/reports/portfolio', token))
  const fetchPendingCounts = () => callWithAuth((token) => api.get('/reports/pending-counts', token))

  const updateMoveInDate = (tenancyId, moveInDate) =>
    callWithAuth((token) => api.patch(`/tenants/tenancies/${tenancyId}/move-in-date`, { move_in_date: moveInDate }, token))

  const fetchMyTenancies = async () => {
    const data = await callWithAuth((token) => api.get('/tenants/me/tenancies', token))
    return data.tenancies
  }

  const fetchLandlordTenants = async () => {
    const data = await callWithAuth((token) => api.get('/buildings/tenants', token))
    return data.tenants
  }

  const fetchMyInvoices = async () => {
    const data = await callWithAuth((token) => api.get('/tenants/me/invoices', token))
    return data.invoices
  }

  const payInvoice = (invoiceId, payload) =>
    callWithAuth((token) => api.post(`/tenants/invoices/${invoiceId}/pay`, payload, token))

  const sendTenantNotice = (tenancyId, payload) =>
    callWithAuth((token) => api.post(`/buildings/tenants/${tenancyId}/notices`, payload, token))

  const fetchTenantRentHistory = (tenancyId) =>
    callWithAuth((token) => api.get(`/buildings/tenants/${tenancyId}/rent-history`, token))

  const recordDepositPayment = (tenancyId, payload) =>
    callWithAuth((token) => api.post(`/leasing/tenancies/${tenancyId}/deposit-payments`, payload, token))
  const fetchDepositPayments = (tenancyId) =>
    callWithAuth((token) => api.get(`/leasing/tenancies/${tenancyId}/deposit-payments`, token))

  return (
    <AuthContext.Provider
      value={{
        session,
        login,
        verifyLoginOtp,
        resendLoginOtp,
        register,
        logout,
        fetchBuildings,
        createBuilding,
        updateBuilding,
        deleteBuilding,
        fetchBuildingDetail,
        fetchUnitsReportPdf,
        deleteUnit,
        fetchOverviewStats,
        fetchBuildingsDirectory,
        fetchVacantUnits,
        submitApplication,
        fetchApplications,
        approveApplication,
        rejectApplication,
        fetchExpenses,
        fetchTickets,
        createTicket,
        fetchTicketComments,
        addTicketComment,
        updateTicket,
        fetchComplaints,
        createComplaint,
        updateComplaint,
        fetchInvoices,
        recordInvoicePayment,
        sendInvoiceReminder,
        fetchPortfolioReport,
        fetchPendingCounts,
        fetchMyTenancies,
        updateMoveInDate,
        fetchLandlordTenants,
        fetchMyInvoices,
        payInvoice,
        sendTenantNotice,
        fetchTenantRentHistory,
        recordDepositPayment,
        fetchDepositPayments,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
