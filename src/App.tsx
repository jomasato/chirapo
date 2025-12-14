import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Home from './pages/Home';
import Upload from './pages/Upload';
import UploadSuccess from './pages/UploadSuccess';
import MyPage from './pages/MyPage';
import Exchange from './pages/Exchange';
import Ranking from './pages/Ranking';
import Layout from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Home />} />
            <Route path="upload" element={<Upload />} />
            <Route path="upload-success" element={<UploadSuccess />} />
            <Route path="mypage" element={<MyPage />} />
            <Route path="exchange" element={<Exchange />} />
            <Route path="ranking" element={<Ranking />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
