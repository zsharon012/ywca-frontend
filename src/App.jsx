import { BrowserRouter, Route, Routes } from 'react-router-dom';

import {
  PrivateRoute,
  PublicOnlyRoute,
} from '@/common/components/routes/ProtectedRoutes';
import { UserProvider } from '@/common/contexts/UserContext';
import NavLayout from '@/common/layouts/NavLayout';
import AuthCallback from '@/pages/account/AuthCallback';
import Login from '@/pages/account/Login';
import SignUpLinks from '@/pages/account/SignUpLinks';
import RequestPasswordReset from '@/pages/account/RequestPasswordReset';
import ResetPassword from '@/pages/account/ResetPassword';
import SignUp from '@/pages/account/SignUp';
import Home from '@/pages/home/Home';
import Contacts from '@/pages/contacts/Contacts';
import NotFound from '@/pages/not-found/NotFound';
import Dashboard from './pages/dashboard/Dashboard';

import './App.css';

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<NavLayout />}>
            <Route element={<PrivateRoute />}>
              <Route index element={<Home />} />
              <Route path='signuplinks' element={<SignUpLinks/>} />
              <Route path='contacts' element={<Contacts />} />
              <Route path='dashboard' element={<Dashboard />} />
            </Route>
            <Route element={<PublicOnlyRoute />}>
              <Route path='login' element={<Login />} />
              <Route path='signup' element={<SignUp />} />
              <Route
                path='forgot-password'
                element={<RequestPasswordReset />}
              />
            </Route>
            <Route path='auth/callback' element={<AuthCallback />} />
            <Route path='auth/reset-password' element={<ResetPassword />} />
            <Route path='*' element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}
