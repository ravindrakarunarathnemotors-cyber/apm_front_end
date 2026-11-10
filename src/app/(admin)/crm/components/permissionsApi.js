import { apiSlice } from "@/store/features/apiSlice";

// GET /api/my-permissions -> { admin: boolean, keys: string[] }
const permissionsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMyPermissions: builder.query({
      query: () => `/permissions/my-permissions`,
    }),
  }),
});

export const { useGetMyPermissionsQuery } = permissionsApi;

// const { can, ready } = usePermissions();
// {can("team.manage") && <Button>Add team</Button>}      <- no permission = the button is not rendered at all
export function usePermissions() {
  const { data, isLoading, isFetching } = useGetMyPermissionsQuery(undefined, { refetchOnMountOrArgChange: true });
  const admin = !!data?.admin;
  const keys = data?.keys || [];
  const can = (key) => admin || keys.includes(key);
  return { can, admin, keys, ready: !isLoading && !isFetching };
}