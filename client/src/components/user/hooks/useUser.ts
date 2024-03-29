// last update problem with optemistic update
import axios, { AxiosResponse } from "axios";
import { useState } from "react";
import { useQuery, useQueryClient } from "react-query";

import type { User } from "../../../../../shared/types";
import { axiosInstance, getJWTHeader } from "../../../axiosInstance";
import { queryKeys } from "../../../react-query/constants";
import {
  clearStoredUser,
  getStoredUser,
  setStoredUser,
} from "../../../user-storage";

// getUser is query function
// we need to make this query or this request cancelable to make sure we can cancel it from react query
async function getUser(
  user: User | null,
  // @ts-ignore
  signal
): Promise<User | null> {
  // create cancel token source
  // const source = axios.CancelToken.source();

  // @ts-ignore
  if (!user) return null;
  const { data }: AxiosResponse<{ user: User }> = await axiosInstance.get(
    `/user/${user.id}`,
    {
      headers: getJWTHeader(user),
      // link this query request to abort it and cancel it from react query using [queryClient.cancelQueries(queryKeys.user)]
      signal,
    }
  );

  return data.user;
}

interface UseUser {
  user: User | null;
  updateUser: (user: User) => void;
  clearUser: () => void;
}

export function useUser(): UseUser {
  // call useQuery to update user data from server
  // each component user this hook will make own user state and if 1 state changed in any component other components will not rerender
  // we need to use state here because we can't get user info from server without user id.
  const [user, setUser] = useState(getStoredUser());
  const queryClient = useQueryClient();

  // this query or this request want to cancel when update user info because if we update info and this request was in progress it will get back with old data and overwrite user info cache
  useQuery(
    queryKeys.user,
    // this query fun and take signal as an argument by default and this signal used to make query request cancelable. to make us abort and cancel the query request using [queryClient.cancelQueries(queryKeys.user)]
    // and we should link this signal with request we want to make it cancelable
    ({ signal }) => {
      // @ts-ignore
      return getUser(user, signal);
    },
    {
      enabled: !!user,
      // @ts-ignore
      onSuccess: (data) => {
        // second change user after query run successfully or if setQueryData run. | updateUser (updateUser function) will change user state to run this query and after fetch data onSuccess run).
        // this setUser in onSuccess will change state of all component. Unlike setUser in userUpdate
        // @ts-ignore
        return setUser(data);
      },
    }
  );

  // meant to be called from useAuth
  function updateUser(newUser: User): void {
    // first change user after that !!user will be true so useQuery with queryKeys.user key will be enable and will run
    // in this case we can remove setUser there because after setQueryData run it will run or trigger onSuccess and onSuccess will setUser. | we can't remove this line if queryClient.setQueryData line not exist | but i will not remove useUSer here to be more clear
    // this setUser in this line not make all components rerender. when change user with true it will make query enable and after fetch data it will call onSuccess and onSuccess will change user (setUser) so all component will rerender because onSuccess will change state (user) in all of them
    setUser(newUser);
    setStoredUser(newUser);
    // update the user in the query cache. setQueryData will change user in cache with newUser
    // all subscriber now will now that user in cache is newUser because they -(all components that use this kook)- have only one shared query
    // set query stop query.
    // after setQueryData onSuccess will run if enable option is (true or false). but the enable option of the query not change if we don't change user state (setQueryData triggers or run onSuccess after it)
    queryClient.setQueryData(queryKeys.user, newUser);

    // we should to make query enable and when success it will setState (user) and this will make other component rerender and keep them up to date
  }

  // meant to be called from useAuth
  function clearUser() {
    // here also we don't need this setUser state because after setQueryData run it will run or trigger onSuccess and onSuccess will setUser
    // this will change state of 1 component not all component. but setUser in onSuccess will change state of all component.
    // when set user null (false) it will make query not enable so it not fetch data and onSuccess not run so all component not know that user became null until now. | follow queryClient.setQueryData it will fix problem in line 73
    setUser(null);
    clearStoredUser();
    // we don't use remove query because query will run again when use useUser hook in another component or any where -(we use useUser hook in many components)- and reset user state and make query enable again. (we can't stop query using remove query because it will run when call useUser hook) | but setQueryData cant stop query until user is truthy again
    // and when any component call useUser hook query lunch osmotically -without specific function to fire it- that use query to get data from server. if we try to remove query here -(when call clearUser)- is it to late because remove query don't stop the query in progress already to the server and after query come back onSuccess will run and set user state and this will make query exist and enable. so query will not remove. remove query can't stop query in progress
    // but set query can stop query in progress. react query x that setQueryData is latest information we have on the data for this query so it cancel that query out the server.
    // setQueryData will change user in cache with null. we know that after setQueryData the onSuccess function will run and change user state so all component that use useUser hook will run onSuccess of the query and onSuccess will change userState of their -(all)- components
    queryClient.setQueryData(queryKeys.user, null);

    // we can remove query use-appointments from cache without need to setQueryData because when (user-appointments query) don't have onSuccess function that set user change user state
    // and query (user-appointments) run only when user in profile and call (useUserAppointments -(specific function)-). but above query (user) run every time call useUser hook and no specific function so if we remove it -(user)query- it will run agin
    // when remove query user-appointments from cache it will still disable until user is truthy.
    // other queryCLient methods also take prefix like queryClient.invalidateQueries([queryKey]) and queryClient.removeQueries([queryKey])
    // this line mean remove any query that starts with key (this two items) [queryKeys.appointments, queryKeys.user]. this mean will remove [queryKeys.appointments, queryKeys.user, user?.id] also. but we can't write user?.id here because it will be null because we write setUser(null) when clearUser so we don't have access to that user id
    queryClient.removeQueries([queryKeys.appointments, queryKeys.user]);
  }

  return { user, updateUser, clearUser };
}

// -------------------------------------
// -------------------------------------
// -------------------------------------

// import { AxiosResponse } from "axios";
// import { useQuery, useQueryClient } from "react-query";

// import type { User } from "../../../../../shared/types";
// import { axiosInstance, getJWTHeader } from "../../../axiosInstance";
// import { queryKeys } from "../../../react-query/constants";
// import {
//   clearStoredUser,
//   getStoredUser,
//   setStoredUser,
// } from "../../../user-storage";

// // query function
// async function getUser(
//   user: User | null,
//   signal: AbortSignal
// ): Promise<User | null> {
//   if (!user) return null;
//   const { data }: AxiosResponse<{ user: User }> = await axiosInstance.get(
//     `/user/${user.id}`,
//     {
//       signal, // abortSignal from React Query
//       headers: getJWTHeader(user),
//     }
//   );

//   return data.user;
// }

// interface UseUser {
//   user: User | null;
//   updateUser: (user: User) => void;
//   clearUser: () => void;
// }

// export function useUser(): UseUser {
//   const queryClient = useQueryClient();

//   // call useQuery to update user data from server
//   const { data: user } = useQuery<User>(
//     queryKeys.user,
//     // @ts-ignore
//     ({ signal }) => getUser(user, signal),
//     // ALTERNATE query function to maintain user after mutation
//     // (see https://www.udemy.com/course/learn-react-query/learn/#questions/17098438/
//     // for discussion)
//     // ({ signal }) => {
//     //   const storedUser = getStoredUser();
//     //   const currentUser = user ?? storedUser;
//     //   return getUser(currentUser, signal);
//     // },
//     {
//       // populate initially with user in localStorage
//       initialData: getStoredUser,

//       // note: onSuccess is called on both successful query function completion
//       //     *and* on queryClient.setQueryData
//       // the `received` argument to onSuccess will be:
//       //    - null, if this is called on queryClient.setQueryData in clearUser()
//       //    - User, if this is called from queryClient.setQueryData in updateUser()
//       //         *or* from the getUser query function call
//       onSuccess: (received: null | User) => {
//         if (!received) {
//           clearStoredUser();
//         } else {
//           setStoredUser(received);
//         }
//       },
//     }
//   );

//   // meant to be called from useAuth
//   function updateUser(newUser: User): void {
//     // update the user
//     queryClient.setQueryData(queryKeys.user, newUser);
//   }

//   // meant to be called from useAuth
//   function clearUser() {
//     // reset user to null
//     queryClient.setQueryData(queryKeys.user, null);

//     // remove user appointments query
//     queryClient.removeQueries([queryKeys.appointments, queryKeys.user]);
//   }

//   // @ts-ignore
//   return { user, updateUser, clearUser };
// }
