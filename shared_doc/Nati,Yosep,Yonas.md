"Yonas 28/07/2018"

Here is how URL protection is set up in our current project:
1. Front-end Protection (React / React Router)
In React, we restrict URL access using a "Wrapper Component" that checks if a user is logged in before rendering the requested page.

If we look at our web_app/src/App.jsx file, we are already using a ProtectedRoute component to do this:
// App.jsx (Lines 29-39)
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth(); // Checks AuthContext

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  // 🛡️ If there is no user logged in, kick them out to the login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ✅ If logged in, allow them to view the component
  return children;
};


How to use it: we wrap any routes we want to protect inside this ProtectedRoute component. This prevents unauthenticated users from typing URLs like http://localhost:5173/dashboard and accessing them.


2. Back-end Protection 
"Nati"

3. front end protection(react native)
"Yosep"

