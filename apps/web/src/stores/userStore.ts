import { getSession } from "@avenire/auth/client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  imageUrl: string;
}

interface Error {
  code?: string;
  message?: string;
  status: number;
  statusText: string;
}

interface UserStore {
  user: User | null;
  error: Error | null;
  isPending: boolean;
  setUser: (user: User | null) => void;
  fetchUser: () => Promise<void>;
}

export const useUserStore = create<UserStore>()((set) => ({
  user: null,
  error: null,
  isPending: true,
  setUser: (user) => set({ user }),
  fetchUser: async () => {
    set({
      isPending: true,
    });
    const { data, error } = await getSession();
    if (data?.user && !error) {
      set({
        user: {
          id: data.user.id,
          name: data.user.name,
          username: data.user.username!,
          email: data.user.email,
          imageUrl: data.user.image!,
        },
        isPending: false,
      });
    } else {
      set({
        error,
        isPending: false,
      });
    }
  },
}));