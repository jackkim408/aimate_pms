import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import Login from '../pages/Login';
import ProjectList from '../pages/ProjectList';
import WBSEditor from '../pages/WBSEditor';
import MyPage from '../pages/MyPage';
import KeywordsPage from '../pages/KeywordsPage';
import UsersPage from '../pages/UsersPage';
import Layout from '../components/Layout';

function ProtectedRoute() {
  const token = useAuthStore((s) => s.accessToken);
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/',         element: <Navigate to="/projects" replace /> },
          { path: '/projects', element: <ProjectList /> },
          { path: '/projects/:projectId/wbs', element: <WBSEditor /> },
          { path: '/mypage',   element: <MyPage /> },
          { path: '/keywords', element: <KeywordsPage /> },
          { path: '/users',    element: <UsersPage /> },
        ],
      },
    ],
  },
]);
