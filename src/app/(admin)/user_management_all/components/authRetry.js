// components/authRetry.js   (NEW)  -  ONE place for "the access token expired -> refresh it -> try again".
// The server (authMiddleware) answers an expired token with 401 { message: "Access token expired" }; an invalid token is 403.
// The old code looked for status 403, so the refresh never ran in AddRoleForm / RoleList / AddUserForm.
//   const { run, logout } = useAuthRetry();   const out = await run(() => addRole(data).unwrap());
import { useRefreshTokenMutation } from "@/store/features/apiSlice";

const isExpired = (err) => /access token expired/i.test(String(err?.data?.message || err?.message || ""));

export default function useAuthRetry() {
  const [refreshToken] = useRefreshTokenMutation();

  const logout = () => {
    sessionStorage.clear();
    localStorage.clear();
    window.location.href = "/auth/login";
  };

  // runs fn(); when the token has expired: refresh it once and run fn() again
  const run = async (fn) => {
    try {
      return await fn();
    } catch (err) {
      if (!isExpired(err)) throw err;
      const refresh_token = localStorage.getItem("refresh_token");
      if (!refresh_token) { logout(); throw err; }
      try {
        // the argument shape of this mutation: change it HERE if your refresh endpoint wants an object ({ refresh_token })
        const res = await refreshToken(refresh_token).unwrap();
        if (res?.access_token) sessionStorage.setItem("access_token", res.access_token);
      } catch (refreshError) {
        console.error("Error refreshing token:", refreshError);
        logout();
        throw refreshError;
      }
      return await fn();
    }
  };

  return { run, logout };
}
export { isExpired };