import api from './api';

const getSubscriptionStatus = () => api.get('/owner/subscription/status').then(r => r.data);

const selectPlan = (planType) =>
  api.post('/owner/subscription/select-plan', { planType }).then(r => r.data);

const createPaymentOrder = (planType) =>
  api.post('/owner/subscription/create-order', { planType }).then(r => r.data);

const verifyPayment = (data) =>
  api.post('/owner/subscription/verify-payment', data).then(r => r.data);

const getBillingHistory = () =>
  api.get('/owner/subscription/billing-history').then(r => r.data);

export default { getSubscriptionStatus, selectPlan, createPaymentOrder, verifyPayment, getBillingHistory };
