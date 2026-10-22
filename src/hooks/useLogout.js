const UseLogout = () => {
 
    const Logout = () => {
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = "/auth/login"; // Redirect to login page
    };
  
    return { Logout };
};

export default UseLogout;