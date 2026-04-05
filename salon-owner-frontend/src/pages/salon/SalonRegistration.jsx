// This page is superseded by the new unified onboarding flow at /onboarding.
// Kept as a thin redirect for any bookmarked or deep-linked URLs.
import { Navigate } from 'react-router-dom';
import ROUTES from '../../routes';

export default function SalonRegistration() {
  return <Navigate to={ROUTES.ONBOARDING} replace />;
}
