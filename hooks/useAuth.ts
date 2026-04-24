import api from "@/services/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/stores/app-store";
import type { Agency, User } from "@/data/types";
import { useRouter } from "expo-router";
import { queryClient } from "@/lib/query-client";
import { userKeys, agencyKeys } from "@/lib/query-keys";
import { Alert } from "react-native";

export const useGetUsers = (page: number | 1, limit: number | 25) => {
   return useQuery({
      queryKey: userKeys.list(page, limit),
      queryFn: () => api.users.get(page, limit),
   });
};

export const useGetSession = () => {
   return useQuery({
      queryKey: userKeys.session(),
      queryFn: () => api.users.getSession(),
      staleTime: 0,
   });
};

export const useRegister = () => {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: (userData: User) => api.users.create(userData),
      onSuccess: (_, userData) => {
         queryClient.invalidateQueries({ queryKey: agencyKeys.users(userData.agency_id as number) });
         Alert.alert("Éxito", "Usuario registrado correctamente");
      },
      onError: () => {
         Alert.alert("Error", "El usuario no ha sido registrado correctamente");
      },
   });
};

export const useLoginMutation = () => {
   const router = useRouter();
   return useMutation({
      mutationFn: async ({ email, password }: { email: string; password: string }) => {
         const { session, user, agency } = await api.users.signIn(email, password);
         return { session, user, agency };
      },
      onSuccess: ({ session, user, agency }) => {
         const { setSession, setUser, setAgency } = useAppStore.getState();
         setSession(session);
         setUser(user);
         setAgency(agency as Agency);
         router.replace("/");
      },
      onError: () => {
         useAppStore.getState().clearAll();
         queryClient.clear();
         Alert.alert("Error de inicio de sesión", "Verifique sus credenciales e intente nuevamente.");
      },
   });
};

export const useLogOut = () => {
   const router = useRouter();
   return useMutation({
      mutationFn: () => api.users.signOut(),
      onSuccess: () => {
         useAppStore.getState().clearAll();
         queryClient.clear();
         router.replace("/login");
      },
      onError: () => {
         // Even if API call fails (e.g. bad token, wrong server), clear local state
         useAppStore.getState().clearAll();
         queryClient.clear();
         router.replace("/login");
      },
   });
};

export const useResetPassword = (options?: { onSuccess?: () => void; onError?: (error: any) => void }) => {
   return useMutation({
      mutationFn: async ({ token, newPassword }: { token: string; newPassword: string }) => {
         return api.users.resetPassword(token, newPassword);
      },
      onSuccess: () => {
         options?.onSuccess?.();
      },
      onError: (error) => {
         options?.onError?.(error);
      },
   });
};

export const useForgotPassword = (options?: { onSuccess?: () => void; onError?: (error: any) => void }) => {
   return useMutation({
      mutationFn: async (email: string) => {
         return api.users.forgotPassword(email);
      },
      onSuccess: () => {
         options?.onSuccess?.();
      },
      onError: (error) => {
         options?.onError?.(error);
      },
   });
};

export const useUpdateUser = (id: number) => {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: (user: User) => api.users.update(id, user),
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: userKeys.all });
         Alert.alert("Éxito", "Usuario actualizado correctamente");
         queryClient.invalidateQueries({ queryKey: agencyKeys.all });
      },
      onError: (error: any) => {
         Alert.alert("Error", error?.response?.data?.message || "Error al actualizar el usuario");
      },
   });
};

export const useDeleteAccount = () => {
   const router = useRouter();
   return useMutation({
      mutationFn: () => api.users.deleteSelf(),
      onSuccess: () => {
         useAppStore.getState().clearAll();
         queryClient.clear();
         Alert.alert("Account Deleted", "Your account has been successfully removed.");
         router.replace("/login");
      },
      onError: (error: any) => {
         Alert.alert("Error", error?.response?.data?.message || "Failed to delete account. Please contact support.");
      },
   });
};

