// This page is superseded by the new unified onboarding flow at /onboarding.
import { Navigate } from 'react-router-dom';
import ROUTES from '../../routes';

export default function Register() {
  return <Navigate to={ROUTES.ONBOARDING} replace />;
}
