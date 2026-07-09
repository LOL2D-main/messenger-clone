import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './lib/firebase';
import Login from './components/Login';
import MessengerLayout from './components/MessengerLayout';

export default function App() {
  const [user, loading, error] = useAuthState(auth);

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500">Loading Messenger...</div>;
  }

  if (error) {
    return <div className="flex h-screen items-center justify-center bg-gray-50 text-red-500">Error: {error.message}</div>;
  }

  return user ? <MessengerLayout user={user} /> : <Login />;
}
